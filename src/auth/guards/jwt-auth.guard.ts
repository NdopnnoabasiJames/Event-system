import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    this.logger.log(`JWT Guard - Auth header present: ${!!authHeader}`);
    if (authHeader) {
      this.logger.log(`JWT Guard - Token starts with Bearer: ${authHeader.startsWith('Bearer ')}`);
    }
    
    // Call the parent class method first
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.log(`JWT Guard - Error: ${!!err}, User: ${!!user}, Info: ${info?.message || 'none'}`);
    
    // Handle authentication errors
    if (err || !user) {
      this.logger.error('JWT authentication failed', err || info);
      throw err || new UnauthorizedException('Invalid authentication credentials');
    }

    // Check if the user account is active
    if (user.isActive === false) {
      this.logger.warn(`Inactive user attempted access: ${user.email}`);
      throw new UnauthorizedException('Your account has been disabled. Please contact your administrator.');
    }

    this.logger.log(`JWT Guard - User authenticated: ${user.email}, Role: ${user.role}`);
    return user;
  }
}
