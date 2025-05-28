import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class CreatePickupStationDto {
  @ApiProperty({
    example: 'Central Station Bus Stop',
    description: 'The location of the pickup station',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'The ID of the branch this pickup station belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the pickup station is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
