import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsEnum, 
  IsDateString,
  ValidateIf,
  IsMongoId
} from 'class-validator';
import { IsPhoneNumber } from '../../common/decorators/custom-validators.decorator';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

export class CreateAttendeeDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber()
  phone: string;

  @IsEnum(['bus', 'private'], { message: 'Transport preference must be either bus or private' })
  transportPreference: string;

  @ValidateIf(o => o.transportPreference === 'bus')
  @IsMongoId()
  pickupStation?: string;

  @ValidateIf(o => o.transportPreference === 'bus')
  @IsDateString()
  @IsFutureDate()
  departureTime?: string;

  @IsMongoId()
  state: string;

  @IsMongoId()
  branch: string;

  @IsMongoId()
  event: string;
}
