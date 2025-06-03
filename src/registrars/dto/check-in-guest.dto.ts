import { IsString, IsOptional, IsNotEmpty, IsMongoId } from 'class-validator';

export class CheckInGuestDto {
  @IsMongoId()
  @IsNotEmpty()
  guestId: string;

  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
