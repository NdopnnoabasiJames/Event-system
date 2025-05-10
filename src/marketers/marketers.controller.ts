import { Controller } from '@nestjs/common';
import { MarketersService } from './marketers.service';

@Controller('marketers')
export class MarketersController {
  constructor(private readonly marketersService: MarketersService) {}
}
