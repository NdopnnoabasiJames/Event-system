import { IsString, IsOptional, IsEmail, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GuestImportDataDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(['bus', 'private'])
  transportPreference: 'bus' | 'private';

  @IsOptional()
  @IsString()
  pickupStation?: string;

  @IsOptional()
  @IsEnum(['invited', 'confirmed', 'checked_in', 'no_show', 'cancelled'])
  status?: string;
}

export class GuestImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestImportDataDto)
  guests: GuestImportDataDto[];
}

export class GuestSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stateIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];

  @IsOptional()
  @IsEnum(['bus', 'private'])
  transportPreference?: 'bus' | 'private';

  @IsOptional()
  @Type(() => Boolean)
  checkedIn?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pickupStationIds?: string[];

  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;
}
