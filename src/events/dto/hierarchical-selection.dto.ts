import { IsArray, IsMongoId, IsString } from 'class-validator';

export class SelectBranchesDto {
  @IsString()
  @IsMongoId()
  eventId: string;

  @IsArray()
  @IsMongoId({ each: true })
  selectedBranches: string[];
}

export class SelectZonesDto {
  @IsString()
  @IsMongoId()
  eventId: string;

  @IsArray()
  @IsMongoId({ each: true })
  selectedZones: string[];
}
