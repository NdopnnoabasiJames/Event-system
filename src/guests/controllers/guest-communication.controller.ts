import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Query, 
  Param,
  Request, 
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GuestCommunicationService } from '../services/guest-communication.service';

@Controller('admin/guests/communication')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestCommunicationController {
  constructor(
    private readonly guestCommunicationService: GuestCommunicationService,
  ) {}

  /**
   * Prepare bulk contact operation
   */
  @Post('bulk/prepare')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async prepareBulkContact(
    @Body() operation: {
      guestIds: string[];
      operation: 'sms' | 'email' | 'both';
      message: string;
      scheduledFor?: string;
    },
    @Request() req
  ) {
    const processedOperation = {
      ...operation,
      scheduledFor: operation.scheduledFor ? new Date(operation.scheduledFor) : undefined,
    };
    
    return this.guestCommunicationService.prepareBulkContact(
      req.user.userId, 
      processedOperation
    );
  }
  /**
   * Get guests suitable for communication
   */
  @Get('guests')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getGuestsForCommunication(
    @Request() req,
    @Query('eventId') eventId?: string,
    @Query('transportPreference') transportPreference?: 'bus' | 'private',
    @Query('status') status?: string,
    @Query('hasValidContact') hasValidContact?: string
  ) {
    return this.guestCommunicationService.getGuestsForCommunication(req.user.userId, {
      eventId,
      transportPreference,
      status,
      hasValidContact: hasValidContact === 'true',
    });
  }
  /**
   * Get communication statistics
   */
  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getCommunicationStats(
    @Request() req,
    @Query('eventId') eventId?: string
  ) {
    return this.guestCommunicationService.getCommunicationStats(req.user.userId, eventId);
  }
  /**
   * Schedule event notifications (foundation for Phase 5)
   */
  @Post('events/:eventId/schedule')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async scheduleEventNotifications(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body('type') notificationType: 'invitation' | 'reminder' | 'confirmation'
  ) {
    return this.guestCommunicationService.scheduleEventNotifications(
      req.user.userId,
      eventId,
      notificationType
    );
  }

  /**
   * Update guest communication preferences
   */
  @Patch('preferences/:guestId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async updateCommunicationPreferences(
    @Param('guestId') guestId: string,
    @Body() preferences: {
      smsEnabled?: boolean;
      emailEnabled?: boolean;
      notificationEnabled?: boolean;
      preferredLanguage?: string;
    }
  ) {
    return this.guestCommunicationService.updateCommunicationPreferences(guestId, preferences);
  }

  /**
   * Get guest communication preferences
   */
  @Get('preferences/:guestId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getCommunicationPreferences(@Param('guestId') guestId: string) {
    return this.guestCommunicationService.getCommunicationPreferences(guestId);
  }
}
