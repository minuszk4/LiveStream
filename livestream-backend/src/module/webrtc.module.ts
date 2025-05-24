import { Module } from '@nestjs/common';
import { WebrtcGateway } from '../gateWay/webrtc.gateway';

@Module({
  providers: [WebrtcGateway],  
})
export class WebrtcModule {}
