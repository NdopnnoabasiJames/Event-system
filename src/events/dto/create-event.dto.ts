import { IsString, IsDateString, IsArray, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { BusPickup, Branch } from '../../common/interfaces/event.interface';

class BusPickupDto implements BusPickup {
  @IsString()
  location: string;

  @IsDateString()
  departureTime: Date;
}

class BranchDto implements Branch {
  @IsString()
  name: string;

  @IsString()
  location: string;
}

export class CreateEventDto {
  @IsString()
  name: string;

  @IsDateString()
  date: Date;

  @IsString()
  state: string;

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
