import { IsString, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';

export class UpdateRegistrarProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
  @IsString()
  @IsOptional()
  bio?: string;
}
