import { IsArray, IsOptional, IsMongoId, IsString } from 'class-validator';
import { MaxSelection, MinSelection, UniqueSelection } from '../../common/decorators/custom-validators.decorator';

export class UpdateEventAvailabilityDto {
  @IsString()
  @IsMongoId()
  eventId: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(50)
  @MinSelection(1)
  @UniqueSelection()
  selectedStates?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(20)
  @MinSelection(1)
  @UniqueSelection()
  selectedBranches?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(10)
  @MinSelection(1)
  @UniqueSelection()
  selectedZones?: string[];
}
