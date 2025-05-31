import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class UpdateZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsMongoId()
  @IsOptional()
  branchId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
