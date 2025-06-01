import { IsArray, IsMongoId, IsString } from 'class-validator';
import { MaxSelection, MinSelection, UniqueSelection } from '../../common/decorators/custom-validators.decorator';

export class SelectBranchesDto {
  @IsString()
  @IsMongoId()
  eventId: string;

  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(20)
  @MinSelection(1)
  @UniqueSelection()
  selectedBranches: string[];
}

export class SelectZonesDto {
  @IsString()
  @IsMongoId()
  eventId: string;

  @IsArray()
  @IsMongoId({ each: true })
  @MaxSelection(10)
  @MinSelection(1)
  @UniqueSelection()
  selectedZones: string[];
}
