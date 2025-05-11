import { OmitType, PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password', 'role'] as const),
) {
  @ApiProperty({
    required: false,
    example: 'OldPass123!',
    description: 'Current password (required when changing password)'
  })
  @IsString()
  @IsOptional()
  currentPassword?: string;


  
  @ApiProperty({
    required: false,
    example: 'NewPass123!',
    description: 'New password (must meet password requirements)',
    minLength: 8
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: 'New password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'
    }
  )
  newPassword?: string;
}
