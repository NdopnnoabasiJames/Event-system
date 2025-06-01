import { Injectable } from '@nestjs/common';
import { EventDocument } from '../schemas/event.schema';
import { PickupStationDocument } from '../schemas/pickup-station.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHierarchicalEventDto } from './dto/create-hierarchical-event.dto';
import { UpdateEventAvailabilityDto } from './dto/update-event-availability.dto';
import { 
  AssignPickupStationsDto, 
  UpdatePickupStationAssignmentDto, 
  RemovePickupStationAssignmentDto 
} from './dto/assign-pickup-stations.dto';

// Import the new smaller services
import { HierarchicalEventCreationService as HierarchicalEventCreationBaseService } from './services/hierarchical-event-creation.service';
import { HierarchicalEventSelectionService } from './services/hierarchical-event-selection.service';
import { HierarchicalEventAccessService } from './services/hierarchical-event-access.service';
import { HierarchicalEventAvailabilityService } from './services/hierarchical-event-availability.service';
import { HierarchicalPickupStationAssignmentService } from './services/hierarchical-pickup-station-assignment.service';

@Injectable()
export class HierarchicalEventCreationService {
  constructor(
    private hierarchicalEventCreationBaseService: HierarchicalEventCreationBaseService,
    private hierarchicalEventSelectionService: HierarchicalEventSelectionService,
    private hierarchicalEventAccessService: HierarchicalEventAccessService,
    private hierarchicalEventAvailabilityService: HierarchicalEventAvailabilityService,
    private hierarchicalPickupStationAssignmentService: HierarchicalPickupStationAssignmentService,
  ) {}
  /**
   * Create event by Super Admin
   */
  async createSuperAdminEvent(
    createEventDto: CreateHierarchicalEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventCreationBaseService.createSuperAdminEvent(createEventDto, creatorId);
  }
  /**
   * Create event by State Admin
   */
  async createStateAdminEvent(
    createEventDto: CreateHierarchicalEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventCreationBaseService.createStateAdminEvent(createEventDto, creatorId);
  }  /**
   * Create event by Branch Admin
   */
  async createBranchAdminEvent(
    createEventDto: CreateHierarchicalEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventCreationBaseService.createBranchAdminEvent(createEventDto, creatorId);
  }

  /**
   * Create event by Zonal Admin
   */
  async createZonalAdminEvent(
    createEventDto: CreateEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventCreationBaseService.createZonalAdminEvent(createEventDto, creatorId);
  }
  /**
   * State admin selects branches for super admin event
   */
  async selectBranchesForEvent(
    eventId: string,
    selectedBranches: string[],
    stateAdminId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventSelectionService.selectBranchesForEvent(eventId, selectedBranches, stateAdminId);
  }

  /**
   * Branch admin selects zones for state/super admin event
   */
  async selectZonesForEvent(
    eventId: string,
    selectedZones: string[],
    branchAdminId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventSelectionService.selectZonesForEvent(eventId, selectedZones, branchAdminId);
  }
  /**
   * Get events that need branch selection by state admin
   */
  async getEventsNeedingBranchSelection(stateAdminId: string): Promise<EventDocument[]> {
    return this.hierarchicalEventAccessService.getEventsNeedingBranchSelection(stateAdminId);
  }

  /**
   * Get events that need zone selection by branch admin
   */
  async getEventsNeedingZoneSelection(branchAdminId: string): Promise<EventDocument[]> {
    return this.hierarchicalEventAccessService.getEventsNeedingZoneSelection(branchAdminId);
  }

  /**
   * Get accessible events for an admin based on their role and hierarchy
   */
  async getAccessibleEvents(adminId: string): Promise<EventDocument[]> {
    return this.hierarchicalEventAccessService.getAccessibleEvents(adminId);
  }

  /**
   * Get events available for pickup station assignment by Zonal Admin
   */
  async getEventsForPickupAssignment(zonalAdminId: string): Promise<EventDocument[]> {
    return this.hierarchicalEventAccessService.getEventsForPickupAssignment(zonalAdminId);
  }
  /**
   * Update event availability (for admin modifications)
   */
  async updateEventAvailability(
    updateDto: UpdateEventAvailabilityDto,
    adminId: string
  ): Promise<EventDocument> {
    return this.hierarchicalEventAvailabilityService.updateEventAvailability(updateDto, adminId);
  }
  /**
   * Assign pickup stations to an event by Zonal Admin
   */
  async assignPickupStations(
    assignDto: AssignPickupStationsDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    return this.hierarchicalPickupStationAssignmentService.assignPickupStations(assignDto, zonalAdminId);
  }
  /**
   * Update a specific pickup station assignment
   */
  async updatePickupStationAssignment(
    updateDto: UpdatePickupStationAssignmentDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    return this.hierarchicalPickupStationAssignmentService.updatePickupStationAssignment(updateDto, zonalAdminId);
  }
  /**
   * Remove pickup station assignment from event
   */
  async removePickupStationAssignment(
    removeDto: RemovePickupStationAssignmentDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    return this.hierarchicalPickupStationAssignmentService.removePickupStationAssignment(removeDto, zonalAdminId);
  }
  /**
   * Get pickup stations available for assignment in admin's zone
   */
  async getAvailablePickupStations(zonalAdminId: string): Promise<PickupStationDocument[]> {
    return this.hierarchicalPickupStationAssignmentService.getAvailablePickupStations(zonalAdminId);
  }
  /**
   * Get pickup station assignments for a specific event in admin's zone
   */
  async getEventPickupStations(
    eventId: string,
    zonalAdminId: string
  ): Promise<{ event: EventDocument; pickupStations: any[] }> {
    return this.hierarchicalPickupStationAssignmentService.getEventPickupStations(eventId, zonalAdminId);
  }
}
