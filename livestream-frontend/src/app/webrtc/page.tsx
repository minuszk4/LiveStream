'use client';

import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

interface PeerConnectionMap {
  [socketId: string]: RTCPeerConnection;
}

export default function WebRtcMultiPeer() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [remotePeers, setRemotePeers] = useState<string[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const peersRef = useRef<PeerConnectionMap>({});
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Có thể thêm TURN server nếu cần
      // { urls: 'turn:your-turn-server', username: 'user', credential: 'pass' },
    ],
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('joined-room', (data: { roomId: string; socketId: string }) => {
      console.log('Joined room:', data);
      setJoined(true);
    });

    socketRef.current.on('new-peer', async ({ socketId }: { socketId: string }) => {
      console.log('New peer joined:', socketId);
      if (!peersRef.current[socketId]) {
        setRemotePeers((prev) => [...prev.filter((id) => id !== socketId), socketId]);
        await createPeerConnection(socketId);
        await createOffer(socketId);
      }
    });

    socketRef.current.on('signal', async (data: { from: string; signal: any }) => {
      const { from, signal } = data;
      let pc = peersRef.current[from];

      if (!pc && signal.type === 'offer') {
        await createAnswer(from, signal);
        return;
      }

      if (!pc) {
        console.error('Peer connection not found for:', from);
        return;
      }

      try {
        if (signal.type === 'offer') {
          if (pc.signalingState !== 'stable') {
            console.log('Rolling back local offer for:', from);
            await pc.setLocalDescription({ type: 'rollback' });
          }
          console.log('Setting remote offer from:', from);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('signal', { to: from, from: socketRef.current.id, signal: answer });
        } else if (signal.type === 'answer') {
          if (pc.signalingState === 'have-local-offer') {
            console.log('Setting remote answer from:', from);
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          } else {
            console.warn(`Skip setting remote answer: signalingState=${pc.signalingState}`);
          }
        } else if (signal.candidate) {
          console.log('Adding ICE candidate from:', from);
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((e) =>
            console.error('Error adding ICE candidate:', e)
          );
        }
      } catch (err) {
        console.error('Error handling signal from:', from, err);
      }
    });

    socketRef.current.on('peer-left', ({ socketId }: { socketId: string }) => {
      console.log('Peer left:', socketId);
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
        delete remoteVideosRef.current[socketId];
        setRemotePeers((prev) => prev.filter((id) => id !== socketId));
      }
    });

    return () => {
      socketRef.current.disconnect();
      for (const pc of Object.values(peersRef.current)) {
        pc.close();
      }
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  async function createPeerConnection(socketId: string): Promise<RTCPeerConnection> {
    console.log('Creating peer connection for:', socketId);
    const pc = new RTCPeerConnection(iceServers);

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        console.log('Adding track to peer:', track.kind, track.id);
        pc.addTrack(track, localStreamRef.current);
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', socketId, event.candidate);
        socketRef.current.emit('signal', {
          to: socketId,
          from: socketRef.current.id,
          signal: { candidate: event.candidate },
        });
      }
    };

  pc.ontrack = (event) => {
    console.log('Received remote stream for:', socketId, event.streams[0]);
    const remoteVideo = remoteVideosRef.current[socketId];
    if (remoteVideo) {
      if (remoteVideo.srcObject !== event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.muted = true;
        remoteVideo.play().catch((err) => {
          console.error('Lỗi phát video từ xa:', socketId, err);
          if (err.name === 'AbortError') {
    setTimeout(() => {
      remoteVideo.play().catch((e) => console.error('Thử phát lại thất bại:', socketId, e));
    }, 100);
    }
        });
      }
      event.streams[0].getTracks().forEach((track) => {
        track.onended = () => {
          console.log('Track ended for:', socketId, track.kind);
          if (remoteVideo && event.streams[0].getTracks().length === 0) {
            remoteVideo.srcObject = null;
            remoteVideo.pause();
            setRemotePeers((prev) => prev.filter((id) => id !== socketId));
          }
        };
      });
    } else {
      console.error('Remote video element not found for:', socketId);
    }
  };
  
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${socketId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.error('ICE connection failed for:', socketId);
        pc.restartIce();
      }
    };

    peersRef.current[socketId] = pc;
    return pc;
  }

  async function createOffer(socketId: string) {
    const pc = peersRef.current[socketId] || (await createPeerConnection(socketId));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('Sending offer to:', socketId);
    socketRef.current.emit('signal', { to: socketId, from: socketRef.current.id, signal: offer });
  }

  async function createAnswer(socketId: string, offerSignal: RTCSessionDescriptionInit) {
    const pc = peersRef.current[socketId] || (await createPeerConnection(socketId));
    await pc.setRemoteDescription(new RTCSessionDescription(offerSignal));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('Sending answer to:', socketId);
    socketRef.current.emit('signal', { to: socketId, from: socketRef.current.id, signal: answer });
  }

async function toggleCamera() {
  if (isCamOn) {
    // Tắt camera
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.pause();
    }
    Object.entries(peersRef.current).forEach(async ([socketId, pc]) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track) {
          console.log('Removing track from peer:', sender.track.kind, sender.track.id);
          pc.removeTrack(sender);
        }
      });
      await createOffer(socketId);
    });
    setIsCamOn(false);
  } else {
    if (!joined) {
      console.error('Chưa tham gia phòng, không thể bật camera');
      alert('Vui lòng tham gia phòng trước khi bật camera');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Got media stream:', stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch((err) => console.error('Lỗi phát video cục bộ:', err));
      }
      Object.entries(peersRef.current).forEach(async ([socketId, pc]) => {
        stream.getTracks().forEach(async (track) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
          if (!sender) {
            console.log('Adding track to peer:', track.kind, track.id);
            pc.addTrack(track, stream);
          } else {
            console.log('Replacing track for peer:', track.kind, track.id);
            await sender.replaceTrack(track).catch((err) => console.error('Lỗi thay thế track:', err));
          }
        });
        await createOffer(socketId);
      });
      setIsCamOn(true);
    } catch (err) {
      console.error('Lỗi truy cập camera:', err);
      alert('Không thể truy cập camera/microphone');
    }
  }
}

  async function handleJoinRoom() {
    if (!roomId.trim()) {
      alert('Vui lòng nhập ID phòng');
      return;
    }
    console.log('Joining room:', roomId);
    socketRef.current.emit('join-room', { roomId });
  }

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h1>WebRTC Multi Peer Chat</h1>

      {!joined && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Nhập ID phòng"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ padding: 8, width: '60%', marginRight: 8 }}
          />
          <button onClick={handleJoinRoom} style={{ padding: '8px 16px' }}>
            Tham gia phòng
          </button>
        </div>
      )}

      {joined && (
        <>
          <button
            onClick={toggleCamera}
            style={{
              padding: '10px 20px',
              backgroundColor: isCamOn ? '#e74c3c' : '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            {isCamOn ? 'Tắt Camera' : 'Bật Camera'}
          </button>

          <div>
            <h3>Camera của bạn</h3>
            <video
              ref={(el) => {
                localVideoRef.current = el;
                console.log('Local video ref assigned:', el);
              }}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', maxWidth: '400px', borderRadius: 8, border: '1px solid #ccc', backgroundColor: '#000' }}
            />
          </div>

          <div>
            <h3>Video bạn bè trong phòng</h3>
            {remotePeers.length === 0 && <p>Chưa có ai trong phòng.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {remotePeers.map((socketId) => (
                <video
                  key={socketId}
                  ref={(el) => {
                    remoteVideosRef.current[socketId] = el;
                    console.log('Remote video ref assigned for:', socketId, el);
                  }}
                  autoPlay
                  playsInline
                  style={{
                    width: 160,
                    height: 120,
                    backgroundColor: '#000',
                    borderRadius: 8,
                    border: '1px solid #ccc',
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
