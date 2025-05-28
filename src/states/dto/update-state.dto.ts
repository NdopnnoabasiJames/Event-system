import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateStateDto {
  @ApiPropertyOptional({
    example: 'Lagos State',
    description: 'The name of the state',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'LAG',
    description: 'The state code',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    example: 'Nigeria',
    description: 'The country where the state is located',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the state is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
