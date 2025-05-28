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
import { EventPickupStation } from '../../common/interfaces/event.interface';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

class EventPickupStationDto implements EventPickupStation {
  @IsMongoId()
  pickupStationId: string;

  @IsDateString()
  departureTime: string;

  @IsNumber()
  @Min(1)
  maxCapacity: number;

  @IsNumber()
  @Min(0)
  currentCount: number;

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
