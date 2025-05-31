import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class CreatePickupStationDto {
  @IsString()
  @IsNotEmpty()
  location: string;

  @IsMongoId()
  @IsNotEmpty()
  branchId: string;

  @IsMongoId()
  @IsNotEmpty()
  zoneId: string;

  @IsMongoId()
  @IsNotEmpty()
  createdBy: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
