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
  ) {}  async validateUser(email: string, password: string): Promise<any> {
    try {
      console.log('Attempting to validate user:', email);
      
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        console.log('User not found:', email);
        throw new UnauthorizedException('User not found');
      }

      // Check if admin user is approved
      if ((user.role === 'state_admin' || user.role === 'branch_admin') && !user.isApproved) {
        console.log('Admin user not approved:', email);
        throw new UnauthorizedException('Your account is pending approval from the administrator');
      }
      
      console.log('User found, validating password');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('Invalid password for user:', email);
        throw new UnauthorizedException('Invalid password');
      }

      console.log('Password valid, login successful');
      const { password: _, ...result } = user.toJSON();
      return result;
    } catch (error) {
      console.error('Login error:', error.message);
      throw new UnauthorizedException(error.message);
    }
  }  async login(user: any) {
    try {
      console.log('Creating JWT payload for user:', user.email);
      const payload = { 
        email: user.email, 
        sub: user._id ? user._id.toString() : user.id,
        role: user.role,
        name: user.name,
        state: user.state,
        branch: user.branch,
      };
      console.log('JWT Payload:', payload);
      
      const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });
      console.log('JWT Token generated successfully');
      
      // Direct format, not nested inside data property
      return {
        access_token,
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          name: payload.name,
          state: payload.state,
          branch: payload.branch,
        }
      };
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate authentication token: ' + error.message);
    }
  }async register(userData: RegisterDto) {
    // Check if user with this email already exists
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Determine approval status based on role
      let isApproved = true; // Default for regular users
      if (userData.role === 'state_admin' || userData.role === 'branch_admin') {
        isApproved = false; // Admins need approval
      }
      
      // Create user with hashed password and admin fields
      const newUser = await this.usersService.create({
        ...userData,
        password: hashedPassword,
        role: userData.role,
        isApproved,
        state: userData.state,
        branch: userData.branch
      });

      const { password, ...result } = newUser.toJSON();
      return result;
    } catch (error) {
      throw new Error('Failed to register user: ' + error.message);
    }
  }
}
