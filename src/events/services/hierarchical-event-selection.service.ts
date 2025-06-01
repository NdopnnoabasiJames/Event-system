import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { Role } from '../../common/enums/role.enum';

export interface MultiSelectValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalSelected: number;
  maxAllowed?: number;
}

export interface SelectionLimits {
  branches?: {
    min?: number;
    max?: number;
    recommended?: number;
  };
  zones?: {
    min?: number;
    max?: number;
    recommended?: number;
  };
}

@Injectable()
export class HierarchicalEventSelectionService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

  /**
   * Phase 2.2: Enhanced multi-selection for branches (State Admin)
   */
  async selectBranchesForEventEnhanced(
    eventId: string,
    selectedBranches: string[],
    stateAdminId: string,
    options?: {
      validateLimits?: boolean;
      replacePrevious?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{ event?: EventDocument; validation: MultiSelectValidationResult }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(stateAdminId);
    
    if (admin.role !== Role.STATE_ADMIN) {
      throw new ForbiddenException('Only state admins can select branches');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Validate event type
    if (event.creatorLevel !== 'super_admin') {
      throw new BadRequestException('Can only select branches for super admin events');
    }

    // Check admin's access to event
    const adminStateInEvent = event.availableStates.some(
      stateId => stateId.toString() === admin.state.toString()
    );

    if (!adminStateInEvent) {
      throw new ForbiddenException('Event is not available in your state');
    }

    // Validate branch selection
    const validation = await this.validateBranchSelection(
      selectedBranches,
      stateAdminId,
      eventId,
      options?.validateLimits
    );

    if (options?.dryRun) {
      return { validation };
    }

    if (!validation.valid) {
      throw new BadRequestException(`Invalid branch selection: ${validation.errors.join(', ')}`);
    }

    // Update event
    const branchIds = selectedBranches.map(id => new Types.ObjectId(id));
    
    if (options?.replacePrevious) {
      // Replace existing branches from this state
      const stateAdminBranches = await this.branchModel
        .find({ stateId: admin.state })
        .select('_id')
        .exec();
      
      const stateAdminBranchIds = stateAdminBranches.map(b => b._id.toString());
      
      // Remove existing branches from this state admin
      event.availableBranches = event.availableBranches.filter(
        branchId => !stateAdminBranchIds.includes(branchId.toString())
      );
    }

    // Add new branches (avoiding duplicates)
    const existingBranches = event.availableBranches.map(id => id.toString());
    const newBranches = branchIds.filter(id => !existingBranches.includes(id.toString()));
    
    event.availableBranches.push(...newBranches);
    
    const updatedEvent = await event.save();
    return { event: updatedEvent, validation };
  }

  /**
   * Phase 2.2: Enhanced multi-selection for zones (Branch Admin)
   */
  async selectZonesForEventEnhanced(
    eventId: string,
    selectedZones: string[],
    branchAdminId: string,
    options?: {
      validateLimits?: boolean;
      replacePrevious?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{ event?: EventDocument; validation: MultiSelectValidationResult }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(branchAdminId);
    
    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can select zones');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Validate event type
    if (!['super_admin', 'state_admin'].includes(event.creatorLevel)) {
      throw new BadRequestException('Can only select zones for super admin or state admin events');
    }

    // Check admin's access to event
    const adminBranchInEvent = event.availableBranches.some(
      branchId => branchId.toString() === admin.branch.toString()
    );

    if (!adminBranchInEvent) {
      throw new ForbiddenException('Event is not available in your branch');
    }

    // Validate zone selection
    const validation = await this.validateZoneSelection(
      selectedZones,
      branchAdminId,
      eventId,
      options?.validateLimits
    );

    if (options?.dryRun) {
      return { validation };
    }

    if (!validation.valid) {
      throw new BadRequestException(`Invalid zone selection: ${validation.errors.join(', ')}`);
    }

    // Update event
    const zoneIds = selectedZones.map(id => new Types.ObjectId(id));
    
    if (options?.replacePrevious) {
      // Replace existing zones from this branch
      const branchAdminZones = await this.zoneModel
        .find({ branchId: admin.branch })
        .select('_id')
        .exec();
      
      const branchAdminZoneIds = branchAdminZones.map(z => z._id.toString());
      
      // Remove existing zones from this branch admin
      event.availableZones = event.availableZones.filter(
        zoneId => !branchAdminZoneIds.includes(zoneId.toString())
      );
    }

    // Add new zones (avoiding duplicates)
    const existingZones = event.availableZones.map(id => id.toString());
    const newZones = zoneIds.filter(id => !existingZones.includes(id.toString()));
    
    event.availableZones.push(...newZones);
    
    const updatedEvent = await event.save();
    return { event: updatedEvent, validation };
  }

  /**
   * Validate branch selection with limits and permissions
   */
  private async validateBranchSelection(
    selectedBranches: string[],
    stateAdminId: string,
    eventId: string,
    validateLimits: boolean = true
  ): Promise<MultiSelectValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate branch access
    for (const branchId of selectedBranches) {
      const canAccess = await this.adminHierarchyService.canAccessBranch(stateAdminId, branchId);
      if (!canAccess) {
        errors.push(`No access to branch ${branchId}`);
      }
    }

    // Check for duplicates
    const uniqueBranches = [...new Set(selectedBranches)];
    if (uniqueBranches.length !== selectedBranches.length) {
      warnings.push('Duplicate branches removed');
    }

    // Validate limits if requested
    if (validateLimits) {
      const limits = await this.getSelectionLimits(stateAdminId, 'branch');
      
      if (limits.branches?.min && uniqueBranches.length < limits.branches.min) {
        errors.push(`Minimum ${limits.branches.min} branches required`);
      }
      
      if (limits.branches?.max && uniqueBranches.length > limits.branches.max) {
        errors.push(`Maximum ${limits.branches.max} branches allowed`);
      }
      
      if (limits.branches?.recommended && uniqueBranches.length !== limits.branches.recommended) {
        warnings.push(`Recommended: ${limits.branches.recommended} branches`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalSelected: uniqueBranches.length,
      maxAllowed: validateLimits ? (await this.getSelectionLimits(stateAdminId, 'branch')).branches?.max : undefined
    };
  }

  /**
   * Validate zone selection with limits and permissions
   */
  private async validateZoneSelection(
    selectedZones: string[],
    branchAdminId: string,
    eventId: string,
    validateLimits: boolean = true
  ): Promise<MultiSelectValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate zone access
    for (const zoneId of selectedZones) {
      const canAccess = await this.adminHierarchyService.canAccessZone(branchAdminId, zoneId);
      if (!canAccess) {
        errors.push(`No access to zone ${zoneId}`);
      }
    }

    // Check for duplicates
    const uniqueZones = [...new Set(selectedZones)];
    if (uniqueZones.length !== selectedZones.length) {
      warnings.push('Duplicate zones removed');
    }

    // Validate limits if requested
    if (validateLimits) {
      const limits = await this.getSelectionLimits(branchAdminId, 'zone');
      
      if (limits.zones?.min && uniqueZones.length < limits.zones.min) {
        errors.push(`Minimum ${limits.zones.min} zones required`);
      }
      
      if (limits.zones?.max && uniqueZones.length > limits.zones.max) {
        errors.push(`Maximum ${limits.zones.max} zones allowed`);
      }
      
      if (limits.zones?.recommended && uniqueZones.length !== limits.zones.recommended) {
        warnings.push(`Recommended: ${limits.zones.recommended} zones`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalSelected: uniqueZones.length,
      maxAllowed: validateLimits ? (await this.getSelectionLimits(branchAdminId, 'zone')).zones?.max : undefined
    };
  }

  /**
   * Get selection limits based on admin role and jurisdiction
   */
  private async getSelectionLimits(adminId: string, type: 'branch' | 'zone'): Promise<SelectionLimits> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    
    if (type === 'branch' && admin.role === Role.STATE_ADMIN) {
      // Get total branches in state to set reasonable limits
      const totalBranches = await this.branchModel.countDocuments({ 
        stateId: admin.state, 
        isActive: true 
      });
      
      return {
        branches: {
          min: 1,
          max: totalBranches,
          recommended: Math.min(5, Math.ceil(totalBranches * 0.5)) // 50% or max 5
        }
      };
    }
    
    if (type === 'zone' && admin.role === Role.BRANCH_ADMIN) {
      // Get total zones in branch to set reasonable limits
      const totalZones = await this.zoneModel.countDocuments({ 
        branchId: admin.branch, 
        isActive: true 
      });
      
      return {
        zones: {
          min: 1,
          max: totalZones,
          recommended: Math.min(3, Math.ceil(totalZones * 0.7)) // 70% or max 3
        }
      };
    }

    return {};
  }

  /**
   * Get available options for multi-selection
   */
  async getAvailableOptionsForSelection(adminId: string, eventId: string): Promise<{
    branches?: BranchDocument[];
    zones?: ZoneDocument[];
    limits: SelectionLimits;
  }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const event = await this.eventModel.findById(eventId);
    
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    let result: any = { limits: {} };

    if (admin.role === Role.STATE_ADMIN) {
      // Get branches in admin's state
      result.branches = await this.branchModel
        .find({ stateId: admin.state, isActive: true })
        .sort({ name: 1 })
        .exec();
      
      result.limits = await this.getSelectionLimits(adminId, 'branch');
    }
    
    if (admin.role === Role.BRANCH_ADMIN) {
      // Get zones in admin's branch
      result.zones = await this.zoneModel
        .find({ branchId: admin.branch, isActive: true })
        .sort({ name: 1 })
        .exec();
      
      result.limits = await this.getSelectionLimits(adminId, 'zone');
    }

    return result;
  }

  /**
   * State admin selects branches for super admin event
   */
  async selectBranchesForEvent(
    eventId: string,
    selectedBranches: string[],
    stateAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(stateAdminId);
    
    if (admin.role !== Role.STATE_ADMIN) {
      throw new ForbiddenException('Only state admins can select branches');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    if (event.creatorLevel !== 'super_admin') {
      throw new BadRequestException('Can only select branches for super admin events');
    }

    // Check if admin's state is in the event's available states
    const adminStateInEvent = event.availableStates.some(
      stateId => stateId.toString() === admin.state.toString()
    );

    if (!adminStateInEvent) {
      throw new ForbiddenException('Event is not available in your state');
    }

    // Validate all selected branches belong to admin's state
    const branchIds = selectedBranches.map(id => new Types.ObjectId(id));
    for (const branchId of branchIds) {
      const canAccess = await this.adminHierarchyService.canAccessBranch(stateAdminId, branchId.toString());
      if (!canAccess) {
        throw new ForbiddenException('Cannot select branches outside your state');
      }
    }

    // Add branches to event (don't replace, add to existing)
    const existingBranches = event.availableBranches.map(id => id.toString());
    const newBranches = branchIds.filter(id => !existingBranches.includes(id.toString()));
    
    event.availableBranches.push(...newBranches);
    
    return await event.save();
  }

  /**
   * Branch admin selects zones for state/super admin event
   */
  async selectZonesForEvent(
    eventId: string,
    selectedZones: string[],
    branchAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(branchAdminId);
    
    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can select zones');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    if (!['super_admin', 'state_admin'].includes(event.creatorLevel)) {
      throw new BadRequestException('Can only select zones for super admin or state admin events');
    }

    // Check if admin's branch is in the event's available branches
    const adminBranchInEvent = event.availableBranches.some(
      branchId => branchId.toString() === admin.branch.toString()
    );

    if (!adminBranchInEvent) {
      throw new ForbiddenException('Event is not available in your branch');
    }

    // Validate all selected zones belong to admin's branch
    const zoneIds = selectedZones.map(id => new Types.ObjectId(id));
    for (const zoneId of zoneIds) {
      const canAccess = await this.adminHierarchyService.canAccessZone(branchAdminId, zoneId.toString());
      if (!canAccess) {
        throw new ForbiddenException('Cannot select zones outside your branch');
      }
    }

    // Add zones to event (don't replace, add to existing)
    const existingZones = event.availableZones.map(id => id.toString());
    const newZones = zoneIds.filter(id => !existingZones.includes(id.toString()));
    
    event.availableZones.push(...newZones);
    
    return await event.save();
  }
}
