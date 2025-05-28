import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateStateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
