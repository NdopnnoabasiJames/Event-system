import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // Debug logging
    console.log('RolesGuard - Required roles:', requiredRoles);
    console.log('RolesGuard - User object:', JSON.stringify(user, null, 2));
    console.log('RolesGuard - User currentRole:', user.currentRole);
    console.log('RolesGuard - User role (fallback):', user.role);
    
    // Use currentRole if available, otherwise fall back to role
    const userRole = user.currentRole || user.role;
    const hasRole = requiredRoles.some((role) => userRole === role);
    console.log('RolesGuard - Effective role:', userRole);
    console.log('RolesGuard - Access granted:', hasRole);
    
    return hasRole;
  }
}
