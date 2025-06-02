import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestDto } from './create-guest.dto';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateGuestDto extends PartialType(CreateGuestDto) {
  @IsOptional()
  @IsBoolean()
  checkedIn?: boolean;

  @IsOptional()
  @IsString()
  checkedInBy?: string;

  @IsOptional()
  @IsDate()
  checkedInTime?: Date;
}
