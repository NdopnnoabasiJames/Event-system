import { IsString, IsEmail, IsEnum, IsOptional, MinLength, IsArray } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsArray()
  @IsOptional()
  eventParticipation?: string[];
}
