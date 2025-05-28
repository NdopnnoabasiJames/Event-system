import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsMongoId()
  @IsNotEmpty()
  stateId: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
