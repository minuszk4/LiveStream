'use client';

import React, { useState, useEffect } from 'react';
import { VideoPlayer } from '../components/VideoPlayer';

interface Stream {
  id: number;
  title: string;
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
}

export default function RtmpPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchStreams() {
    try {
      const res = await fetch('http://localhost:3000/livestream');
      if (!res.ok) throw new Error('Failed to fetch streams');
      const data = await res.json();
      setStreams(data);
    } catch (err: any) {
      setError(err.message || 'Error loading streams');
    }
  }

  useEffect(() => {
    fetchStreams();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3000/livestream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create stream');
      const newStream = await res.json();
      setStreams((prev) => [...prev, newStream]);
      setTitle('');
    } catch (err: any) {
      setError(err.message || 'Error creating stream');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>RTMP Player</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Enter stream title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          style={{ padding: 8, width: '80%', marginRight: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul style={{ paddingLeft: 0 }}>
        {streams.map((stream) => (
          <li
            key={stream.id}
            style={{
              marginBottom: 20,
              borderBottom: '1px solid #ddd',
              paddingBottom: 12,
              listStyle: 'none',
            }}
          >
            <strong>{stream.title}</strong> <br />
            <small>ID: {stream.id}</small>
            <br />
            <small>Stream Key: {stream.streamKey}</small>
            <br />
            <small>RTMP URL: {stream.rtmpUrl}</small>
            <br />
            <small>Playback: {stream.playbackUrl}</small>

            <div style={{ marginTop: 10 }}>
              <VideoPlayer src={stream.playbackUrl} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
