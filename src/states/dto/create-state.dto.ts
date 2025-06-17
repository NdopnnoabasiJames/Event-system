import { IsString, IsNotEmpty, IsOptional, IsBoolean, Length } from 'class-validator';

export class CreateStateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @Length(3, 3, { message: 'State code must be exactly 3 characters' })
  code?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
