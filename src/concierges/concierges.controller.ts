import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('concierges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConciergesController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('assignments')
  @Roles(Role.CONCIERGE)
  async getAssignments(@Request() req) {
    const userId = req.user.userId;
    return this.eventsService.getConciergeAssignments(userId);
  }
}