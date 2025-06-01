import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';

interface AuthenticatedRequest extends Request {
  user?: any;
}

@Injectable()
export class ActiveAdminMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.substring(7);
      const decoded = this.jwtService.verify(token);
      
      if (!decoded || !decoded.sub) {
        return next();
      }

      // Fetch current user status from database
      const user = await this.usersService.findById(decoded.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if admin account is active
      if (user.isActive === false) {
        throw new UnauthorizedException('Your account has been disabled. Please contact your administrator.');
      }

      // Check if admin account is approved
      if (user.isApproved === false) {
        throw new UnauthorizedException('Your account is pending approval.');
      }

      // Attach updated user to request
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // If token verification fails, let the request continue
      // The auth guard will handle invalid tokens
      next();
    }
  }
}
