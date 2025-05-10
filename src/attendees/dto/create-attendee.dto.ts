import { IsString, IsEmail, IsOptional, IsEnum, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class BusPickupDto {
  @IsString()
  location: string;

  @IsDateString()
  departureTime: Date;
}

export class CreateAttendeeDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['bus', 'private'])
  transportPreference: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusPickupDto)
  busPickup?: BusPickupDto;
}
