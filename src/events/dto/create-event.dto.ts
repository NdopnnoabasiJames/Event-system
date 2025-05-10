import { IsString, IsDateString, IsArray, IsOptional, ValidateNested, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BusPickup, Branch } from '../../common/interfaces/event.interface';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

class BusPickupDto implements BusPickup {
  @IsString()
  location: string;

  @IsDateString()
  departureTime: Date;

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

class BranchDto implements Branch {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsString()
  @IsOptional()
  manager?: string;

  @IsString()
  @IsOptional()
  contact?: string;
}

export class CreateEventDto {
  @IsString()
  name: string;

  @IsDateString()
  @IsFutureDate()
  date: Date;

  @IsString()
  state: string;

  @IsNumber()
  @Min(1)
  maxAttendees: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchDto)
  branches: Branch[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusPickupDto)
  busPickups?: BusPickup[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
