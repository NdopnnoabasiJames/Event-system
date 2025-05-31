import { IsArray, IsOptional, IsMongoId, IsString } from 'class-validator';

export class UpdateEventAvailabilityDto {
  @IsString()
  @IsMongoId()
  eventId: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedStates?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedBranches?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedZones?: string[];
}
