import { IsString, IsNotEmpty, IsOptional, IsEmail, IsMongoId, IsEnum } from 'class-validator';

export class RegistrarRegistrationDto {

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsMongoId()
  @IsNotEmpty()
  state: string;

  @IsMongoId()
  @IsNotEmpty()
  branch: string;
}