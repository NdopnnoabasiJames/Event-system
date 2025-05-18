import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsEnum, 
  MinLength,
  Matches 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user',
    minLength: 3
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the user'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'The user\'s password. Must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'
    }
  )
  password: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'The phone number of the user'
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: '123 Main St, City',
    description: 'The address of the user'
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.CONCIERGE,
    description: 'The role of the user. Can be USER, MARKETER, or ADMIN'
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
