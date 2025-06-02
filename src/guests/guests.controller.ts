import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('guests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}  @Post(':eventId')
  @Roles(Role.WORKER)
  create(
    @Param('eventId') eventId: string,
    @Body() createGuestDto: CreateGuestDto,
    @Request() req,
  ) {
    return this.guestsService.create({
      ...createGuestDto,
      event: eventId,
      registeredBy: req.user.userId,
    });
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.WORKER, Role.REGISTRAR)
  findAll(@Query('eventId') eventId?: string, @Query('transport') transport?: 'bus' | 'private') {
    if (eventId && transport) {
      return this.guestsService.getGuestsByTransport(eventId, transport);
    } else if (eventId) {
      return this.guestsService.getEventGuests(eventId);
    }
    return this.guestsService.findAll();
  }  @Get('bus-pickups/:location')
  @Roles(Role.SUPER_ADMIN, Role.WORKER)
  findByBusPickup(
    @Param('location') location: string,
    @Query('eventId') eventId: string,
  ) {
    return this.guestsService.getBusGuestsByPickup(eventId, location);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.WORKER)
  findOne(@Param('id') id: string) {
    return this.guestsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.WORKER)
  update(
    @Param('id') id: string,
    @Body() updateGuestDto: UpdateGuestDto,
  ) {
    return this.guestsService.update(id, updateGuestDto);
  }

  @Delete(':id')
  @Roles(Role.WORKER)
  remove(@Param('id') id: string) {
    return this.guestsService.remove(id);
  }
}
