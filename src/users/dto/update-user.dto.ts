import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password', 'role'] as const),
) {
  @IsString()
  @IsOptional()
  currentPassword?: string;

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
