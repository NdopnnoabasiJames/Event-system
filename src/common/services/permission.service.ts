import { Injectable } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

@Injectable()
export class PermissionService {
  private readonly rolePermissions: Record<Role, Permission[]> = {
    [Role.SUPER_ADMIN]: [
      // Super Admin has all permissions
      ...Object.values(Permission),
    ],
    
    [Role.STATE_ADMIN]: [
      // Event permissions
      Permission.CREATE_EVENT,
      Permission.READ_EVENT,
      Permission.UPDATE_EVENT,
      Permission.DELETE_EVENT,
      Permission.EXPORT_EVENT,

      // Admin management (for branch admins only)
      Permission.READ_ADMIN,
      Permission.APPROVE_ADMIN,
      Permission.DISABLE_ADMIN,
      Permission.REPLACE_ADMIN,
      Permission.EXPORT_ADMIN,

      // State hierarchy
      Permission.READ_STATE,
      Permission.READ_BRANCH,
      Permission.UPDATE_BRANCH,
      Permission.EXPORT_BRANCH,
      Permission.READ_ZONE,
      Permission.EXPORT_ZONE,

      // Pickup stations in their state
      Permission.READ_PICKUP_STATION,
      Permission.EXPORT_PICKUP_STATION,
    ],

    [Role.BRANCH_ADMIN]: [
      // Event permissions
      Permission.CREATE_EVENT,
      Permission.READ_EVENT,
      Permission.UPDATE_EVENT,
      Permission.DELETE_EVENT,
      Permission.EXPORT_EVENT,

      // Admin management (for zonal admins only)
      Permission.READ_ADMIN,
      Permission.APPROVE_ADMIN,
      Permission.DISABLE_ADMIN,
      Permission.REPLACE_ADMIN,
      Permission.EXPORT_ADMIN,

      // Branch hierarchy
      Permission.READ_BRANCH,
      Permission.READ_ZONE,
      Permission.UPDATE_ZONE,
      Permission.EXPORT_ZONE,

      // Pickup stations in their branch
      Permission.READ_PICKUP_STATION,
      Permission.UPDATE_PICKUP_STATION,
      Permission.EXPORT_PICKUP_STATION,
    ],

    [Role.ZONAL_ADMIN]: [
      // Event permissions
      Permission.CREATE_EVENT,
      Permission.READ_EVENT,
      Permission.UPDATE_EVENT,
      Permission.DELETE_EVENT,
      Permission.EXPORT_EVENT,

      // Zone hierarchy
      Permission.READ_ZONE,

      // Pickup stations in their zone
      Permission.CREATE_PICKUP_STATION,
      Permission.READ_PICKUP_STATION,
      Permission.UPDATE_PICKUP_STATION,
      Permission.DELETE_PICKUP_STATION,
      Permission.EXPORT_PICKUP_STATION,
    ],

    [Role.WORKER]: [
      // Limited event permissions
      Permission.READ_EVENT,

      // Limited pickup station access
      Permission.READ_PICKUP_STATION,
    ],

    [Role.REGISTRAR]: [
      // Event check-in permissions
      Permission.READ_EVENT,
      Permission.UPDATE_EVENT, // For check-in operations

      // Limited pickup station access
      Permission.READ_PICKUP_STATION,
    ],

    [Role.GUEST]: [
      // Basic event access
      Permission.READ_EVENT,
    ],
  };

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userRole: Role, permission: Permission): boolean {
    const permissions = this.rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Get all permissions for a role
   */
  getPermissions(userRole: Role): Permission[] {
    return this.rolePermissions[userRole] || [];
  }

  /**
   * Check if user can manage another admin based on hierarchy
   */
  canManageAdmin(managerRole: Role, targetRole: Role): boolean {
    // Super Admin can manage all
    if (managerRole === Role.SUPER_ADMIN) {
      return true;
    }

    // State Admin can manage Branch Admins
    if (managerRole === Role.STATE_ADMIN && targetRole === Role.BRANCH_ADMIN) {
      return true;
    }

    // Branch Admin can manage Zonal Admins
    if (managerRole === Role.BRANCH_ADMIN && targetRole === Role.ZONAL_ADMIN) {
      return true;
    }

    return false;
  }
}
