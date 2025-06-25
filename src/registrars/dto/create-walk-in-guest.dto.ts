import { IsString, IsOptional, IsNotEmpty, IsMongoId, IsPhoneNumber, IsEmail, IsBoolean } from 'class-validator';

export class CreateWalkInGuestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber(null, { message: 'Phone number is not valid' })
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @IsMongoId()
  @IsNotEmpty()
  stateId: string;

  @IsMongoId()
  @IsNotEmpty()
  branchId: string;
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  comments?: string;
  
  @IsBoolean()
  @IsOptional()
  autoCheckIn?: boolean;
}
