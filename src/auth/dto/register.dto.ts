import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'The name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'The email of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'StrongPass123!', 
    description: 'Password must be at least 8 characters long and include uppercase, lowercase, number and special character' 
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ 
    enum: Role, 
    example: Role.USER,
    description: 'The role of the user',
    required: false,
    default: Role.USER
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
