import { 
  IsString, 
  IsArray, 
  IsNotEmpty, 
  ValidateNested, 
  IsMongoId,
  IsOptional,
  IsNumber,
  Min,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

export class EventPickupStationAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  pickupStationId: string;

  @IsDateString()
  @IsFutureDate()
  departureTime: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCapacity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignPickupStationsDto {
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventPickupStationAssignmentDto)
  pickupStations: EventPickupStationAssignmentDto[];
}

export class UpdatePickupStationAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @IsMongoId()
  @IsNotEmpty()
  pickupStationId: string;

  @IsDateString()
  @IsFutureDate()
  @IsOptional()
  departureTime?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCapacity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RemovePickupStationAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @IsMongoId()
  @IsNotEmpty()
  pickupStationId: string;
}
