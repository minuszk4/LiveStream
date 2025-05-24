import { Module } from '@nestjs/common';
import { LivestreamController } from '../controller/livestream.controller';
import { LivestreamService } from '../service/livestream.service';

@Module({
  controllers: [LivestreamController],
  providers: [LivestreamService],
})
export class LivestreamModule {}
