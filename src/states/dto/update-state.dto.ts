import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';

export class UpdateStateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Length(3, 3, { message: 'State code must be exactly 3 characters' })
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
