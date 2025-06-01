import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent class method first
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Handle authentication errors
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid authentication credentials');
    }

    // Check if the user account is active
    if (user.isActive === false) {
      throw new UnauthorizedException('Your account has been disabled. Please contact your administrator.');
    }

    return user;
  }
}
