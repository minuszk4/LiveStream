import { Module } from '@nestjs/common';
import { LivestreamModule } from './module/livestream.module';
import { WebrtcModule } from './module/webrtc.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [LivestreamModule,WebrtcModule, ConfigModule.forRoot({
    isGlobal: true,
  })],
})
export class AppModule {}
