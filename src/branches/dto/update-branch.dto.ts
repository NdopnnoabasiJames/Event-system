import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class UpdateBranchDto {
  @ApiPropertyOptional({
    example: 'Lagos Island Branch',
    description: 'The name of the branch',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '123 Main Street, Lagos Island',
    description: 'The physical location of the branch',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'The ID of the state this branch belongs to',
  })
  @IsMongoId()
  @IsOptional()
  stateId?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'The manager of the branch',
  })
  @IsString()
  @IsOptional()
  manager?: string;

  @ApiPropertyOptional({
    example: '+234-123-456-7890',
    description: 'Contact information for the branch',
  })
  @IsString()
  @IsOptional()
  contact?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the branch is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
