import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class UpdatePickupStationDto {
  @ApiPropertyOptional({
    example: 'Central Station Bus Stop',
    description: 'The location of the pickup station',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'The ID of the branch this pickup station belongs to',
  })
  @IsMongoId()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the pickup station is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
