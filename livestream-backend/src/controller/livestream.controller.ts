// src/controller/livestream.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { LivestreamService } from '../service/livestream.service';

@Controller('livestream')
export class LivestreamController {
  constructor(private readonly livestreamService: LivestreamService) {}

  @Post()
  create(@Body('title') title: string) {
    if (!title || title.trim().length === 0) {
      throw new BadRequestException('Title is required');
    }
    return this.livestreamService.createStream(title.trim());
  }

  @Get()
  findAll() {
    return this.livestreamService.getAllStreams();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const stream = this.livestreamService.getStreamById(id);
    if (!stream) {
      throw new BadRequestException(`Stream with id ${id} not found`);
    }
    return stream;
  }
}
