import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class DisableAdminDto {
  @IsString()
  @IsNotEmpty()
  adminId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class EnableAdminDto {
  @IsString()
  @IsNotEmpty()
  adminId: string;
}

export class PerformanceRatingResponseDto {
  rating: number;

  metrics: {
    totalInvited: number;
    totalCheckedIn: number;
    checkInRate: number;
    rating: number;
    ratingText: string;
  };
}

export class MarketerPerformanceSummaryDto {
  id: string;

  name: string;

  email: string;

  rating: number;

  ratingText: string;

  totalInvited: number;

  totalCheckedIn: number;

  checkInRate: number;

  location: {
    state: any;
    branch: any;
    zone: any;
  };
}
