import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    this.logger.log(`JWT validation - User: ${payload.email}, Role: ${payload.role}, Branch: ${payload.branch}`);
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role, 
      name: payload.name,
      state: payload.state,
      branch: payload.branch,
      zone: payload.zone
    };
  }
}
