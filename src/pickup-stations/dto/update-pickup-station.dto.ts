import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class UpdatePickupStationDto {
  @IsString()
  @IsOptional()
  location?: string;

  @IsMongoId()
  @IsOptional()
  branchId?: string;

  @IsMongoId()
  @IsOptional()
  zoneId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
