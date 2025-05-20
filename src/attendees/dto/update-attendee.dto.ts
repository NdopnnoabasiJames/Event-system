import { PartialType } from '@nestjs/swagger';
import { CreateAttendeeDto } from './create-attendee.dto';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateAttendeeDto extends PartialType(CreateAttendeeDto) {
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
