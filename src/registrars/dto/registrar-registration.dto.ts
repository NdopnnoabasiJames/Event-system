import { IsString, IsNotEmpty, IsOptional, IsEmail, IsMongoId } from 'class-validator';

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

  @IsMongoId()
  @IsNotEmpty()
  state: string;

  @IsMongoId()
  @IsNotEmpty()
  branch: string;
}