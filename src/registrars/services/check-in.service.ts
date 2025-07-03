import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { Role } from '../../common/enums/role.enum';
import { GuestSearchDto, CheckInGuestDto } from '../dto';
import { ScoreUpdateService } from '../../admin-hierarchy/services/score-update.service';

@Injectable()
export class CheckInService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private readonly scoreUpdateService: ScoreUpdateService,
  ) {}

  /**
   * Search for guests by name or phone number within a specific event and optionally in a specific zone
   */
  async searchGuests(searchDto: GuestSearchDto, userId: string): Promise<any> {
    // Validate event exists
    const eventExists = await this.eventModel.findById(searchDto.eventId);
    if (!eventExists) {
      throw new NotFoundException('Event not found');
    }

    // Build the search query
    const searchQuery: any = { event: new Types.ObjectId(searchDto.eventId) };

    // Add search term if provided
    if (searchDto.searchTerm) {
      const searchRegex = new RegExp(searchDto.searchTerm, 'i');
      searchQuery.$or = [
        { name: searchRegex },
        { phone: searchRegex }
      ];
    }

    // If zoneId is provided, filter guests by zone
    if (searchDto.zoneId) {
      // First validate the user has access to this zone
      const registrar = await this.userModel.findById(userId);
      
      if (!registrar) {
        throw new NotFoundException('Registrar not found');
      }

      // Check if the user is assigned to the requested zone
      if (!registrar.assignedZones?.includes(new Types.ObjectId(searchDto.zoneId))) {
        throw new ForbiddenException('You do not have access to this zone');
      }

      // Filter guests by branch/zone (depends on your guest registration logic)
      const zone = await this.zoneModel.findById(searchDto.zoneId);
      if (!zone) {
        throw new NotFoundException('Zone not found');
      }
      
      searchQuery.branch = zone.branchId;
    } else {
      // If no zone specified, limit search to branches/zones the registrar has access to
      const registrar = await this.userModel.findById(userId).populate('assignedZones');
      
      if (!registrar || !registrar.assignedZones || registrar.assignedZones.length === 0) {
        throw new ForbiddenException('You must be assigned to at least one zone to search for guests');
      }
      
      // Get all branches from registrar's assigned zones
      const zoneIds = registrar.assignedZones.map(zone => zone._id);
      const zones = await this.zoneModel.find({ _id: { $in: zoneIds } });
      const branchIds = [...new Set(zones.map(zone => zone.branchId))];
      
      // Filter guests by these branches
      searchQuery.branch = { $in: branchIds };
    }    // Get guests matching the search criteria
    const guests = await this.guestModel.find(searchQuery)
      .select('name phone email transportPreference status checkedIn checkInNotes checkedInTime branch')
      .populate({
        path: 'branch',
        select: 'name'
      })
      .limit(50)
      .sort({ name: 1 });    return {
      total: guests.length,
      guests: guests.map(guest => ({
        id: guest._id,
        name: guest.name,
        phone: guest.phone,
        email: guest.email,
        transportPreference: guest.transportPreference,
        status: guest.status,
        checkedIn: guest.checkedIn,
        checkedInTime: guest.checkedInTime,
        branch: guest.branch,
      }))
    };
  }

  /**
   * Check in a guest for an event
   */
  async checkInGuest(checkInDto: CheckInGuestDto, registrarId: string): Promise<any> {
    // Validate event exists
    const eventExists = await this.eventModel.findById(checkInDto.eventId);
    if (!eventExists) {
      throw new NotFoundException('Event not found');
    }

    // Validate guest exists
    const guest = await this.guestModel.findById(checkInDto.guestId);
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // Validate guest belongs to the specified event
    if (guest.event.toString() !== checkInDto.eventId) {
      throw new BadRequestException('Guest does not belong to this event');
    }

    // Check if guest is already checked in
    if (guest.checkedIn) {
      throw new BadRequestException('Guest is already checked in');
    }

    // Find the registrar
    const registrar = await this.userModel.findById(registrarId);
    if (!registrar || registrar.role !== Role.REGISTRAR) {
      throw new ForbiddenException('Only registrars can check in guests');
    }

    // Check if registrar has access to guest's branch (via any assigned zone in that branch)
    const registrarZones = await this.zoneModel.find({ 
      _id: { $in: registrar.assignedZones || [] } 
    });
    
    const registrarBranches = [...new Set(registrarZones.map(zone => zone.branchId.toString()))];
    
    if (!registrarBranches.includes(guest.branch.toString())) {
      throw new ForbiddenException('You do not have access to check in guests from this branch');
    }    // Update guest with check-in information
    const now = new Date();

    console.log(`🔄 Before check-in - Guest ${guest.name}:`, {
      id: guest._id,
      checkedIn: guest.checkedIn,
      status: guest.status,
      registeredBy: guest.registeredBy
    });

    guest.checkedIn = true;
    guest.checkedInBy = registrarId as any; // Cast to any to avoid type mismatch
    guest.checkedInTime = now;
    guest.status = 'checked_in';
    
    if (checkInDto.notes) {
      guest.checkInNotes = checkInDto.notes;
    }

    await guest.save();

    console.log(`✅ After check-in - Guest ${guest.name}:`, {
      id: guest._id,
      checkedIn: guest.checkedIn,
      status: guest.status,
      checkedInTime: guest.checkedInTime,
      registeredBy: guest.registeredBy
    });

    // Update worker scores after successful check-in
    await this.scoreUpdateService.updateScoresForWorker(guest.registeredBy.toString());

    return {
      success: true,
      message: 'Guest checked in successfully',
      guest: {
        id: guest._id,
        name: guest.name,
        checkedIn: guest.checkedIn,
        checkedInTime: guest.checkedInTime,
        status: guest.status
      }
    };
  }

  /**
   * Get check-in statistics for an event and optionally a specific zone
   */
  async getCheckInStatistics(eventId: string, zoneId?: string): Promise<any> {
    // Build the query base
    const query: any = { event: new Types.ObjectId(eventId) };
    
    if (zoneId) {
      // If zone specified, we need to find the branch first
      const zone = await this.zoneModel.findById(zoneId);
      if (!zone) {
        throw new NotFoundException('Zone not found');
      }
      query.branch = zone.branchId;
    }

    // Get total guests
    const totalGuests = await this.guestModel.countDocuments(query);
      // Get checked in guests
    const checkedInQuery = { ...query, checkedIn: true };
    const checkedInGuests = await this.guestModel.countDocuments(checkedInQuery);
    
    // Get bus guests
    const busQuery = { ...query, transportPreference: 'bus', checkedIn: true };
    const busGuests = await this.guestModel.countDocuments(busQuery);

    // Get check-in rate
    const checkInRate = totalGuests > 0 ? (checkedInGuests / totalGuests) * 100 : 0;
      return {
      totalGuests,
      checkedInGuests,
      busGuests,
      checkInRate: parseFloat(checkInRate.toFixed(2)),
      notCheckedIn: totalGuests - checkedInGuests,
    };
  }

  /**
   * Get registrar's assigned zones and check-in statistics
   */
  async getRegistrarDashboard(registrarId: string): Promise<any> {
    // Find the registrar
    const registrar = await this.userModel.findById(registrarId);
    if (!registrar || registrar.role !== Role.REGISTRAR) {
      throw new NotFoundException('Registrar not found');
    }
      // Get assigned zones
    const assignedZones = await this.zoneModel.find({
      _id: { $in: registrar.assignedZones || [] }
    }).populate('branchId');
    
    if (!assignedZones.length) {
      return {
        zones: [],
        message: 'You have not been assigned to any zones yet'
      };
    }
    
    // Get active events
    const activeEvents = await this.eventModel.find({ 
      isActive: true, 
      date: { $gte: new Date() }
    }).sort({ date: 1 }).limit(5);
    
    // Prepare response object
    const zoneData = await Promise.all(assignedZones.map(async zone => {
      // Get check-in statistics for this zone for upcoming events
      const zoneStats = await Promise.all(activeEvents.map(async event => {
        const stats = await this.getCheckInStatistics(event._id.toString(), zone._id.toString());
        return {
          eventId: event._id,
          eventName: event.name,
          eventDate: event.date,
          ...stats
        };
      }));        // Handle branch name retrieval safely with type casting
        let branchName = 'Unknown Branch';
        if (zone.branchId && typeof zone.branchId === 'object' && (zone.branchId as any).name) {
          branchName = (zone.branchId as any).name;
        }
        
        return {
          zoneId: zone._id,
          zoneName: zone.name,
          branchName,
          events: zoneStats
        };
    }));
    
    return {
      registrarInfo: {
        name: registrar.name,
        email: registrar.email,
        assignedZonesCount: assignedZones.length,
      },
      zones: zoneData
    };
  }
}
