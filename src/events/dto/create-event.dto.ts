import { 
  IsString, 
  IsDateString, 
  IsArray, 
  IsOptional, 
  ValidateNested, 
  IsBoolean, 
  IsNumber,
  Min,
  IsNotEmpty,
  IsMongoId
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

class EventPickupStationDto {
  @IsMongoId()
  @IsNotEmpty()
  pickupStationId: string; // Using string for DTOs, will be converted to Types.ObjectId

  @IsDateString()
  @IsNotEmpty()
  departureTime: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCapacity?: number; // Make optional with default

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentCount?: number; // Make optional with default

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsFutureDate()
  date: string;

  @IsArray()
  @IsMongoId({ each: true })
  states: string[];

  @IsArray()
  @IsMongoId({ each: true })
  branches: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventPickupStationDto)
  pickupStations?: EventPickupStationDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
  @IsOptional()
  @IsString()
  bannerImage?: string;
}
