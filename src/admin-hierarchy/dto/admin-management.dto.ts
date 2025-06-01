import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableAdminDto {
  @ApiProperty({
    description: 'ID of the admin to disable',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString()
  @IsNotEmpty()
  adminId: string;

  @ApiProperty({
    description: 'Reason for disabling the admin',
    example: 'Policy violation',
    required: false
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class EnableAdminDto {
  @ApiProperty({
    description: 'ID of the admin to enable',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString()
  @IsNotEmpty()
  adminId: string;
}

export class PerformanceRatingResponseDto {
  @ApiProperty({
    description: 'Performance rating (0-5 stars)',
    example: 4
  })
  rating: number;

  @ApiProperty({
    description: 'Performance metrics',
    example: {
      totalInvited: 100,
      totalCheckedIn: 85,
      checkInRate: 0.85,
      rating: 4,
      ratingText: '4 Star'
    }
  })
  metrics: {
    totalInvited: number;
    totalCheckedIn: number;
    checkInRate: number;
    rating: number;
    ratingText: string;
  };
}

export class MarketerPerformanceSummaryDto {
  @ApiProperty({
    description: 'Marketer ID',
    example: '507f1f77bcf86cd799439011'
  })
  id: string;

  @ApiProperty({
    description: 'Marketer name',
    example: 'John Doe'
  })
  name: string;

  @ApiProperty({
    description: 'Marketer email',
    example: 'john.doe@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'Performance rating (0-5 stars)',
    example: 4
  })
  rating: number;

  @ApiProperty({
    description: 'Rating text description',
    example: '4 Star'
  })
  ratingText: string;

  @ApiProperty({
    description: 'Total attendees invited',
    example: 100
  })
  totalInvited: number;

  @ApiProperty({
    description: 'Total attendees checked in',
    example: 85
  })
  totalCheckedIn: number;

  @ApiProperty({
    description: 'Check-in rate (0-1)',
    example: 0.85
  })
  checkInRate: number;

  @ApiProperty({
    description: 'Marketer location details',
    example: {
      state: { _id: '507f1f77bcf86cd799439011', name: 'Lagos' },
      branch: { _id: '507f1f77bcf86cd799439012', name: 'Victoria Island' },
      zone: { _id: '507f1f77bcf86cd799439013', name: 'Zone A' }
    }
  })
  location: {
    state: any;
    branch: any;
    zone: any;
  };
}
