import { IsString, IsDateString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BusPickupDto {
  @IsString()
  location: string;

  @IsDateString()
  departureTime: Date;
}

class BranchDto {
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
  branches: BranchDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusPickupDto)
  busPickups?: BusPickupDto[];
}
