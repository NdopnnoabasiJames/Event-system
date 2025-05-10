import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsEnum, 
  ValidateNested, 
  IsDateString,
  ValidateIf 
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPhoneNumber } from '../../common/decorators/custom-validators.decorator';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

class BusPickupDto {
  @IsString()
  location: string;

  @IsDateString()
  @IsFutureDate()
  departureTime: Date;
}

export class CreateAttendeeDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsEnum(['bus', 'private'], { message: 'Transport preference must be either bus or private' })
  transportPreference: string;

  @ValidateIf(o => o.transportPreference === 'bus')
  @ValidateNested()
  @Type(() => BusPickupDto)
  busPickup?: BusPickupDto;

  @IsString()
  event: string;
}
