import { IsString, IsOptional, IsNotEmpty, IsMongoId, IsEnum } from 'class-validator';

export class GuestSearchDto {
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @IsMongoId()
  @IsOptional()
  zoneId?: string;

  @IsMongoId()
  @IsNotEmpty()
  eventId: string;
}
