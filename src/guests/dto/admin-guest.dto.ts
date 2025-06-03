import { IsOptional, IsString, IsBoolean, IsEnum, IsArray, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminGuestFiltersDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @IsEnum(['bus', 'private'])
  transportPreference?: 'bus' | 'private';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  checkedIn?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  pickupStationId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(['name', 'registeredAt', 'checkedInTime', 'status'])
  sortBy?: 'name' | 'registeredAt' | 'checkedInTime' | 'status';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class BulkGuestOperationDto {
  @IsArray()
  @IsString({ each: true })
  guestIds: string[];

  @IsEnum(['update', 'delete', 'status_change', 'assign_pickup'])
  operation: 'update' | 'delete' | 'status_change' | 'assign_pickup';

  @IsOptional()
  data?: any;
}

export class UpdateGuestStatusDto {
  @IsEnum(['invited', 'confirmed', 'checked_in', 'no_show', 'cancelled'])
  status: string;
}

export class GuestExportDto {
  @IsOptional()
  @IsEnum(['csv', 'excel', 'json'])
  format?: 'csv' | 'excel' | 'json';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];

  @IsOptional()
  filters?: AdminGuestFiltersDto;
}
