import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { JURISDICTION_KEY } from '../../common/decorators/jurisdiction.decorator';

@Injectable()
export class JurisdictionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredJurisdictions = this.reflector.getAllAndOverride<string[]>(JURISDICTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredJurisdictions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const body = request.body;
    const query = request.query;

    // Super Admin has access to everything
    if (user.currentRole === Role.SUPER_ADMIN) {
      return true;
    }

    // Check jurisdiction boundaries based on admin role
    return this.checkJurisdictionBoundaries(user, params, body, query, requiredJurisdictions);
  }

  private checkJurisdictionBoundaries(
    user: any,
    params: any,
    body: any,
    query: any,
    requiredJurisdictions: string[]
  ): boolean {
    const { currentRole, state, branch, zone } = user;

    // For each required jurisdiction, check if user has access
    for (const jurisdiction of requiredJurisdictions) {
      switch (jurisdiction) {
        case 'state':
          if (!this.hasStateAccess(currentRole, state, params, body, query)) {
            throw new ForbiddenException('Access denied: insufficient state jurisdiction');
          }
          break;

        case 'branch':
          if (!this.hasBranchAccess(currentRole, state, branch, params, body, query)) {
            throw new ForbiddenException('Access denied: insufficient branch jurisdiction');
          }
          break;

        case 'zone':
          if (!this.hasZoneAccess(currentRole, state, branch, zone, params, body, query)) {
            throw new ForbiddenException('Access denied: insufficient zone jurisdiction');
          }
          break;

        default:
          return false;
      }
    }

    return true;
  }

  private hasStateAccess(userRole: Role, userState: Types.ObjectId, params: any, body: any, query: any): boolean {
    switch (userRole) {
      case Role.STATE_ADMIN:
        // State admin can only access their own state
        const stateId = params.stateId || body.stateId || query.stateId || params.id;
        return stateId && userState && userState.toString() === stateId;

      case Role.BRANCH_ADMIN:
      case Role.ZONAL_ADMIN:
        // Branch and Zonal admins can access their state's data
        const targetStateId = params.stateId || body.stateId || query.stateId;
        return targetStateId && userState && userState.toString() === targetStateId;

      default:
        return false;
    }
  }

  private hasBranchAccess(
    userRole: Role,
    userState: Types.ObjectId,
    userBranch: Types.ObjectId,
    params: any,
    body: any,
    query: any
  ): boolean {
    switch (userRole) {
      case Role.STATE_ADMIN:
        // State admin can access all branches in their state
        const stateId = params.stateId || body.stateId || query.stateId;
        return stateId && userState && userState.toString() === stateId;

      case Role.BRANCH_ADMIN:
        // Branch admin can only access their own branch
        const branchId = params.branchId || body.branchId || query.branchId || params.id;
        return branchId && userBranch && userBranch.toString() === branchId;

      case Role.ZONAL_ADMIN:
        // Zonal admin can access their branch's data
        const targetBranchId = params.branchId || body.branchId || query.branchId;
        return targetBranchId && userBranch && userBranch.toString() === targetBranchId;

      default:
        return false;
    }
  }

  private hasZoneAccess(
    userRole: Role,
    userState: Types.ObjectId,
    userBranch: Types.ObjectId,
    userZone: Types.ObjectId,
    params: any,
    body: any,
    query: any
  ): boolean {
    switch (userRole) {
      case Role.STATE_ADMIN:
        // State admin can access all zones in their state
        const stateId = params.stateId || body.stateId || query.stateId;
        return stateId && userState && userState.toString() === stateId;

      case Role.BRANCH_ADMIN:
        // Branch admin can access all zones in their branch
        const branchId = params.branchId || body.branchId || query.branchId;
        return branchId && userBranch && userBranch.toString() === branchId;

      case Role.ZONAL_ADMIN:
        // Zonal admin can only access their own zone
        const zoneId = params.zoneId || body.zoneId || query.zoneId || params.id;
        return zoneId && userZone && userZone.toString() === zoneId;

      default:
        return false;
    }
  }
}
