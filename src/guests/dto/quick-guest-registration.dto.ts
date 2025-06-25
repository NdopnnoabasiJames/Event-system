import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsMongoId,
  MinLength
} from 'class-validator';
import { IsPhoneNumber } from '../../common/decorators/custom-validators.decorator';

export class QuickGuestRegistrationDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsPhoneNumber()
  phone: string;

  @IsEnum(['bus', 'private'], { message: 'Transport preference must be either bus or private' })
  transportPreference: string;

  @IsOptional()
  @IsMongoId()
  pickupStation?: string;
  // Optional fields for quick registration
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
