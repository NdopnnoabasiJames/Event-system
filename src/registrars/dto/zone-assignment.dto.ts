import { IsMongoId, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ZoneAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  registrarId: string;

  @IsArray()
  @IsMongoId({ each: true })
  zoneIds: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SingleZoneAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  registrarId: string;

  @IsMongoId()
  @IsNotEmpty()
  zoneId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RemoveZoneAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  registrarId: string;

  @IsMongoId()
  @IsNotEmpty()
  zoneId: string;
}
