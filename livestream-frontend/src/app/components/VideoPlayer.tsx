'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface Props {
  src: string;
}

export function VideoPlayer({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    } else if (videoRef.current) {
      // Safari support HLS natively
      videoRef.current.src = src;
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      style={{ width: '100%', maxHeight: 300, marginTop: 8 }}
    />
  );
}
