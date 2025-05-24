import { Injectable } from '@nestjs/common';

import { Stream } from '../model/stream.model';

@Injectable()
export class LivestreamService {
  private streams: Stream[] = [];

  createStream(title: string): Stream {
    const id = Date.now();
    const streamKey = `stream-${id}`;
    const rtmpUrl = `rtmp://localhost/live/${streamKey}`;
    const playbackUrl = `http://localhost:8080/hls/${streamKey}.m3u8`; // Tùy vào cấu hình nginx

    const stream: Stream = { id, title, streamKey, rtmpUrl, playbackUrl };
    this.streams.push(stream);
    return stream;
  }

  getAllStreams(): Stream[] {
    return this.streams;
  }

  getStreamById(id: number): Stream | undefined {
    return this.streams.find(s => s.id === id);
  }
}