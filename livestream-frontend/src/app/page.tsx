'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Livestream Mini</h1>

      <p>Chọn chế độ xem:</p>

      <div style={{ display: 'flex', gap: 12 }}>
        <Link
          href="/rtmp"
          style={{
            padding: 12,
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          RTMP Player
        </Link>

        <Link
          href="/webrtc"
          style={{
            padding: 12,
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          WebRTC Player
        </Link>
      </div>
    </main>
  );
}
