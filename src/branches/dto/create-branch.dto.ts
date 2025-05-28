import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({
    example: 'Lagos Island',
    description: 'The name of the branch',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '123 Main Street, Lagos Island',
    description: 'The physical location of the branch',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'The ID of the state this branch belongs to',
  })
  @IsMongoId()
  @IsNotEmpty()
  stateId: string;

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
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
