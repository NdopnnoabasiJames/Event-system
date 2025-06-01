import { IsArray, IsOptional, IsMongoId } from 'class-validator';
import { CreateEventDto } from './create-event.dto';
import { MaxSelection, MinSelection, UniqueSelection } from '../../common/decorators/custom-validators.decorator';

export class CreateHierarchicalEventDto extends CreateEventDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(50)
  @MinSelection(1)
  @UniqueSelection()
  selectedStates?: string[]; // For super admin

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(20)
  @MinSelection(1)
  @UniqueSelection()
  selectedBranches?: string[]; // For state admin

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(10)
  @MinSelection(1)
  @UniqueSelection()
  selectedZones?: string[]; // For branch admin
}
