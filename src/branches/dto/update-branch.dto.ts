import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsMongoId()
  @IsOptional()
  stateId?: string;
  @IsString()
  @IsOptional()
  manager?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
