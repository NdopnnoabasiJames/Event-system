import { Module } from '@nestjs/common';
import { MarketersService } from './marketers.service';
import { MarketersController } from './marketers.controller';

@Module({
  controllers: [MarketersController],
  providers: [MarketersService],
})
export class MarketersModule {}
