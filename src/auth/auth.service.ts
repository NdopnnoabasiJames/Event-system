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
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      // Check if admin user is approved (super admins are always approved)
      const rolesRequiringApproval = ['state_admin', 'branch_admin', 'zonal_admin', 'worker', 'registrar'];
      if (rolesRequiringApproval.includes(user.role) && !user.isApproved) {
        throw new UnauthorizedException('Your account is pending approval');
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }

      const { password: _, ...result } = user.toJSON();
      return result;
    } catch (error) {
      console.error('Login error:', error.message);
      throw new UnauthorizedException(error.message);
    }
  }  async login(user: any) {
    try {
      const payload = { 
        email: user.email, 
        sub: user._id ? user._id.toString() : user.id,
        role: user.role,
        name: user.name,
        // If populated, the state/branch will be objects with _id field
        // If not populated, they will be ObjectId strings
        state: user.state?._id ? user.state._id.toString() : (user.state ? user.state.toString() : null),
        branch: user.branch?._id ? user.branch._id.toString() : (user.branch ? user.branch.toString() : null),
      };
      
      const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });      
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
      if (['state_admin', 'branch_admin', 'zonal_admin', 'worker', 'registrar'].includes(userData.role)) {
        isApproved = false; // These roles need approval
      }
      
      // Create user with hashed password and admin fields
      const newUser = await this.usersService.create({
        ...userData,
        password: hashedPassword,
        role: userData.role,
        isApproved,
        state: userData.state,
        branch: userData.branch,
        zone: userData.zone
      });      const { password, ...result } = newUser.toJSON();
      return result;
    } catch (error) {
      throw new Error('Failed to register user: ' + error.message);
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    const { password, ...userProfile } = user.toJSON();
    return userProfile;
  }
}
