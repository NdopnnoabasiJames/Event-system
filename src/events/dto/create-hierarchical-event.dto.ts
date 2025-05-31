import { IsArray, IsOptional, IsMongoId } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

export class CreateHierarchicalEventDto extends CreateEventDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedStates?: string[]; // For super admin

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedBranches?: string[]; // For state admin

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  selectedZones?: string[]; // For branch admin
}
