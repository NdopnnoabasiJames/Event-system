import { 
  IsString, 
  IsDateString, 
  IsArray, 
  IsOptional, 
  ValidateNested, 
  IsBoolean, 
  IsNumber,
  Min,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusPickup, Branch } from '../../common/interfaces/event.interface';
import { IsFutureDate } from '../../common/decorators/date-validators.decorator';

class BusPickupDto implements BusPickup {
  @ApiProperty({
    example: 'Central Station',
    description: 'The pickup location name',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: '2025-07-15T09:00:00Z',
    description: 'The departure time from the pickup location',
  })
  @IsDateString()
  departureTime: string;

  @ApiProperty({
    example: 50,
    description: 'Maximum number of attendees for this pickup location',
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  maxCapacity: number;

  @ApiProperty({
    example: 0,
    description: 'Current number of attendees registered for this pickup',
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  currentCount: number;

  @ApiPropertyOptional({
    example: 'Please arrive 15 minutes before departure',
    description: 'Additional notes about the pickup location'
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

class BranchDto implements Branch {
  @ApiProperty({
    example: 'Downtown Branch',
    description: 'The name of the branch',
    minLength: 3
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '123 Main St, City',
    description: 'The physical location of the branch',
    minLength: 5
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({
    example: 'John Smith',
    description: 'The manager of the branch'
  })
  @IsString()
  @IsOptional()
  manager?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Contact number for the branch'
  })
  @IsString()
  @IsOptional()
  contact?: string;
}

export class CreateEventDto {
  @ApiProperty({
    example: 'Summer Tech Conference 2025',
    description: 'The name of the event',
    minLength: 5
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '2025-07-15T09:00:00Z',
    description: 'The date and time when the event takes place'
  })
  @IsDateString()
  @IsFutureDate()
  date: string;

  @ApiProperty({
    example: 'California',
    description: 'The state where the event takes place'
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    example: 500,
    description: 'Maximum number of attendees allowed for the event',
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  maxAttendees: number;

  @ApiProperty({
    type: [BranchDto],
    description: 'List of branches involved in organizing the event',
    example: [{
      name: 'Downtown Branch',
      location: '123 Main St, City',
      manager: 'John Smith',
      contact: '+1234567890'
    }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchDto)
  branches: Branch[];

  @ApiPropertyOptional({
    type: [BusPickupDto],
    description: 'List of bus pickup locations for the event',
    example: [{
      location: 'Central Station',
      departureTime: '2025-07-15T07:00:00Z',
      maxCapacity: 50,
      currentCount: 0,
      notes: 'Please arrive 15 minutes before departure'
    }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusPickupDto)
  busPickups?: BusPickup[];
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the event is currently active and accepting registrations'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
  @ApiPropertyOptional({
    example: 'event-banner.jpg',
    description: 'The filename of the event banner image'
  })
  @IsOptional()
  @IsString()
  bannerImage?: string;
}
