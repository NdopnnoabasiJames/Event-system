import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async register(userData: RegisterDto) {
    // Check if user with this email already exists
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password and default role if not provided
      const newUser = await this.usersService.create({
        ...userData,
        password: hashedPassword,
        role: userData.role
      });

      const { password, ...result } = newUser.toJSON();
      return result;
    } catch (error) {
      throw new Error('Failed to register user: ' + error.message);
    }
  }
}
