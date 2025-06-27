import { Injectable } from '@nestjs/common';
import { AdminHierarchyCoreService } from './services/admin-hierarchy-core.service';
import { AdminManagementService } from './services/admin-management.service';
import { ZoneAdminApprovalService } from './services/zone-admin-approval.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { AdminDataAccessService } from './services/admin-data-access.service';
import { DashboardStatsService } from './services/dashboard-stats.service';
import { UserDocument } from '../schemas/user.schema';
import { StateDocument } from '../schemas/state.schema';
import { BranchDocument } from '../schemas/branch.schema';
import { ZoneDocument } from '../schemas/zone.schema';
import { EventDocument } from '../schemas/event.schema';
import { Role } from '../common/enums/role.enum';
import {
  AdminReplacementDto,
  JurisdictionTransferDto,
  AdminReplacementResponseDto,
  JurisdictionTransferResponseDto,
} from './dto/admin-jurisdiction.dto';

/**
 * Refactored main AdminHierarchyService that delegates to smaller, focused services
 * This service acts as a facade, maintaining the same public API while using the smaller services
 */
@Injectable()
export class AdminHierarchyService {  constructor(
    private adminHierarchyCoreService: AdminHierarchyCoreService,
    private adminManagementService: AdminManagementService,
    private zoneAdminApprovalService: ZoneAdminApprovalService,
    private performanceAnalyticsService: PerformanceAnalyticsService,
    private adminDataAccessService: AdminDataAccessService,
    private dashboardStatsService: DashboardStatsService,
  ) {}

  // ===============================
  // Core Hierarchy Methods
  // ===============================

  /**
   * Get admin user with hierarchy validation
   */
  async getAdminWithHierarchy(userId: string): Promise<UserDocument> {
    return this.adminHierarchyCoreService.getAdminWithHierarchy(userId);
  }

  /**
   * Validate if admin can access specific state
   */
  async canAccessState(adminId: string, stateId: string): Promise<boolean> {
    return this.adminHierarchyCoreService.canAccessState(adminId, stateId);
  }

  /**
   * Validate if admin can access specific branch
   */
  async canAccessBranch(adminId: string, branchId: string): Promise<boolean> {
    return this.adminHierarchyCoreService.canAccessBranch(adminId, branchId);
  }

  /**
   * Validate if admin can access specific zone
   */
  async canAccessZone(adminId: string, zoneId: string): Promise<boolean> {
    return this.adminHierarchyCoreService.canAccessZone(adminId, zoneId);
  }

  /**
   * Enhanced jurisdiction-based access control with admin status checking
   */
  async validateAdminAccess(
    adminId: string,
    requiredRole?: Role,
  ): Promise<UserDocument> {
    return this.adminHierarchyCoreService.validateAdminAccess(adminId, requiredRole);
  }

  // ===============================
  // Data Access Methods
  // ===============================

  /**
   * Get states accessible by admin
   */
  async getAccessibleStates(adminId: string): Promise<StateDocument[]> {
    return this.adminDataAccessService.getAccessibleStates(adminId);
  }

  /**
   * Get branches accessible by admin
   */
  async getAccessibleBranches(
    adminId: string,
    stateId?: string,
  ): Promise<BranchDocument[]> {
    return this.adminDataAccessService.getAccessibleBranches(adminId, stateId);
  }

  /**
   * Get zones accessible by admin
   */
  async getAccessibleZones(
    adminId: string,
    branchId?: string,
  ): Promise<ZoneDocument[]> {
    return this.adminDataAccessService.getAccessibleZones(adminId, branchId);
  }

  /**
   * Get events visible to admin based on hierarchy
   */
  async getEventsForAdmin(adminId: string): Promise<EventDocument[]> {
    return this.adminDataAccessService.getEventsForAdmin(adminId);
  }

  /**
   * Get admins accessible by requesting admin for export
   */
  async getAccessibleAdmins(adminId: string): Promise<UserDocument[]> {
    return this.adminDataAccessService.getAccessibleAdmins(adminId);
  }
  /**
   * Get workers accessible by requesting admin
   */  async getAccessibleWorkers(adminId: string): Promise<UserDocument[]> {
    const result = await this.adminDataAccessService.getAccessibleWorkers(adminId);
    return result;
  }

  /**
   * Get guests accessible by requesting admin
   */
  async getAccessibleGuests(adminId: string): Promise<any[]> {
    return this.adminDataAccessService.getAccessibleGuests(adminId);
  }

  // ===============================
  // Admin Management Methods
  // ===============================

  /**
   * Disable an admin
   */
  async disableAdmin(
    adminId: string,
    disabledBy: string,
    reason?: string,
  ): Promise<UserDocument> {
    return this.adminManagementService.disableAdmin(adminId, disabledBy, reason);
  }

  /**
   * Enable an admin
   */
  async enableAdmin(adminId: string, enabledBy: string): Promise<UserDocument> {
    return this.adminManagementService.enableAdmin(adminId, enabledBy);
  }

  /**
   * Replace an admin with another admin
   */
  async replaceAdmin(
    replacementDto: AdminReplacementDto,
    requestingAdminId: string,
  ): Promise<AdminReplacementResponseDto> {
    return this.adminManagementService.replaceAdmin(replacementDto, requestingAdminId);
  }

  /**
   * Transfer jurisdiction from one admin to another
   */
  async transferJurisdiction(
    transferDto: JurisdictionTransferDto,
    requestingAdminId: string,
  ): Promise<JurisdictionTransferResponseDto> {
    return this.adminManagementService.transferJurisdiction(transferDto, requestingAdminId);
  }

  /**
   * Get disabled admins in jurisdiction
   */
  async getDisabledAdmins(adminId: string): Promise<UserDocument[]> {
    return this.adminManagementService.getDisabledAdmins(adminId);
  }

  // ===============================
  // Zone Admin Approval Methods
  // ===============================

  /**
   * Get pending zone admin registrations for a branch admin
   */
  async getPendingZoneAdminsByBranch(
    branchAdminId: string,
  ): Promise<UserDocument[]> {
    return this.zoneAdminApprovalService.getPendingZoneAdminsByBranch(branchAdminId);
  }

  /**
   * Get approved zone admins for a branch admin
   */
  async getApprovedZoneAdminsByBranch(
    branchAdminId: string,
  ): Promise<UserDocument[]> {
    return this.zoneAdminApprovalService.getApprovedZoneAdminsByBranch(branchAdminId);
  }

  /**
   * Approve a zone admin registration
   */
  async approveZoneAdmin(
    zoneAdminId: string,
    branchAdminId: string,
    approvalData: any,
  ): Promise<UserDocument> {
    return this.zoneAdminApprovalService.approveZoneAdmin(zoneAdminId, branchAdminId, approvalData);
  }

  /**
   * Reject a zone admin registration
   */
  async rejectZoneAdmin(
    zoneAdminId: string,
    branchAdminId: string,
    reason: string,
  ): Promise<UserDocument> {
    return this.zoneAdminApprovalService.rejectZoneAdmin(zoneAdminId, branchAdminId, reason);
  }

  /**
   * Get zones managed by a branch admin
   */
  async getZonesByBranchAdmin(branchAdminId: string): Promise<ZoneDocument[]> {
    return this.zoneAdminApprovalService.getZonesByBranchAdmin(branchAdminId);
  }

  // ===============================
  // Performance Analytics Methods
  // ===============================

  /**
   * Calculate performance rating for a marketer
   */
  async calculateMarketerPerformanceRating(
    marketerId: string,
  ): Promise<{ rating: number; metrics: any }> {
    return this.performanceAnalyticsService.calculateMarketerPerformanceRating(marketerId);
  }

  /**
   * Get marketers performance summary for an admin's jurisdiction
   */
  async getMarketersPerformanceSummary(adminId: string): Promise<any[]> {
    return this.performanceAnalyticsService.getMarketersPerformanceSummary(adminId);
  }

  // ===============================
  // Performance Rankings Methods
  // ===============================

  /**
   * Get worker rankings with scope based on admin role
   */
  async getWorkerRankings(branchId?: string, stateId?: string, limit?: number): Promise<any[]> {
    return this.performanceAnalyticsService.getWorkerRankings(branchId, stateId, limit);
  }

  /**
   * Get branch rankings with scope based on admin role
   */
  async getBranchRankings(stateId?: string, limit?: number): Promise<any[]> {
    return this.performanceAnalyticsService.getBranchRankings(stateId, limit);
  }

  /**
   * Get state rankings (national level)
   */
  async getStateRankings(limit?: number): Promise<any[]> {
    return this.performanceAnalyticsService.getStateRankings(limit);
  }

  // ===============================
  // Dashboard Stats Methods
  // ===============================

  /**
   * Get dashboard statistics for a branch admin
   */
  async getBranchDashboardStats(branchAdminId: string): Promise<any> {
    return this.dashboardStatsService.getBranchDashboardStats(branchAdminId);
  }
}
