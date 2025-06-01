import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument, EventPickupStation } from '../../schemas/event.schema';
import { PickupStation, PickupStationDocument } from '../../schemas/pickup-station.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { 
  AssignPickupStationsDto, 
  UpdatePickupStationAssignmentDto, 
  RemovePickupStationAssignmentDto 
} from '../dto/assign-pickup-stations.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class HierarchicalPickupStationAssignmentService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

  /**
   * Assign pickup stations to an event by Zonal Admin
   */
  async assignPickupStations(
    assignDto: AssignPickupStationsDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can assign pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(assignDto.eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Validate that all pickup stations belong to admin's zone and are active
    const pickupStationIds = assignDto.pickupStations.map(ps => ps.pickupStationId);
    const pickupStations = await this.pickupStationModel.find({
      _id: { $in: pickupStationIds },
      zoneId: admin.zone,
      isActive: true
    });

    if (pickupStations.length !== pickupStationIds.length) {
      throw new BadRequestException('Some pickup stations are invalid, inactive, or not in your zone');
    }

    // Remove existing pickup stations for this zone from the event
    event.pickupStations = event.pickupStations.filter(
      ps => !pickupStations.some(station => station._id.toString() === ps.pickupStationId.toString())
    );

    // Add new pickup stations assignments
    const newPickupStations: EventPickupStation[] = assignDto.pickupStations.map(ps => ({
      pickupStationId: new Types.ObjectId(ps.pickupStationId),
      departureTime: ps.departureTime,
      maxCapacity: ps.maxCapacity || 50,
      currentCount: 0,
      notes: ps.notes
    }));

    event.pickupStations.push(...newPickupStations);

    return await event.save();
  }

  /**
   * Update a specific pickup station assignment
   */
  async updatePickupStationAssignment(
    updateDto: UpdatePickupStationAssignmentDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can update pickup station assignments');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(updateDto.eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Validate pickup station belongs to admin's zone
    const pickupStation = await this.pickupStationModel.findOne({
      _id: updateDto.pickupStationId,
      zoneId: admin.zone,
      isActive: true
    });

    if (!pickupStation) {
      throw new BadRequestException('Pickup station not found, inactive, or not in your zone');
    }

    // Find and update the pickup station assignment
    const assignmentIndex = event.pickupStations.findIndex(
      ps => ps.pickupStationId.toString() === updateDto.pickupStationId
    );

    if (assignmentIndex === -1) {
      throw new BadRequestException('Pickup station is not assigned to this event');
    }

    // Update the assignment
    if (updateDto.departureTime) {
      event.pickupStations[assignmentIndex].departureTime = updateDto.departureTime;
    }
    if (updateDto.maxCapacity) {
      event.pickupStations[assignmentIndex].maxCapacity = updateDto.maxCapacity;
    }
    if (updateDto.notes !== undefined) {
      event.pickupStations[assignmentIndex].notes = updateDto.notes;
    }

    return await event.save();
  }

  /**
   * Remove pickup station assignment from event
   */
  async removePickupStationAssignment(
    removeDto: RemovePickupStationAssignmentDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can remove pickup station assignments');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(removeDto.eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Validate pickup station belongs to admin's zone
    const pickupStation = await this.pickupStationModel.findOne({
      _id: removeDto.pickupStationId,
      zoneId: admin.zone
    });

    if (!pickupStation) {
      throw new BadRequestException('Pickup station not found or not in your zone');
    }

    // Remove the pickup station assignment
    event.pickupStations = event.pickupStations.filter(
      ps => ps.pickupStationId.toString() !== removeDto.pickupStationId
    );

    return await event.save();
  }

  /**
   * Get pickup stations available for assignment in admin's zone
   */
  async getAvailablePickupStations(zonalAdminId: string): Promise<PickupStationDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can view available pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    return await this.pickupStationModel.find({
      zoneId: admin.zone,
      isActive: true
    })
    .populate('branchId', 'name location')
    .populate('zoneId', 'name')
    .sort({ location: 1 })
    .exec();
  }

  /**
   * Get pickup station assignments for a specific event in admin's zone
   */
  async getEventPickupStations(
    eventId: string,
    zonalAdminId: string
  ): Promise<{ event: EventDocument; pickupStations: any[] }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can view event pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(eventId)
      .populate('pickupStations.pickupStationId', 'location branchId zoneId')
      .exec();

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Filter pickup stations to only show those in admin's zone
    const zonePickupStations = event.pickupStations.filter(ps => {
      const station = ps.pickupStationId as any;
      return station && station.zoneId && station.zoneId.toString() === admin.zone.toString();
    });

    return {
      event,
      pickupStations: zonePickupStations
    };
  }
}
