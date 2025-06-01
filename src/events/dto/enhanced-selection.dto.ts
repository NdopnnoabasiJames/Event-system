import { IsArray, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class EnhancedSelectionRequestDto {

  @IsString()
  @IsNotEmpty()
  adminId: string;

  @IsString()
  @IsNotEmpty()
  selectionType: 'states' | 'branches' | 'zones';


  @IsString()
  @IsOptional()
  stateId?: string;


  @IsString()
  @IsOptional()
  branchId?: string;
}

export class ValidateMultiSelectionDto {

  @IsString()
  @IsNotEmpty()
  adminId: string;


  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedStates?: string[];


  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedBranches?: string[];


  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedZones?: string[];
}

export class EnhancedSelectionResponseDto {
  items: {
    _id: string;
    name: string;
    isAccessible: boolean;
    hierarchyLevel: string;
    [key: string]: any;
  }[];


  adminLevel: string;


  totalAccessible: number;
}

export class ValidationResultDto {

  isValid: boolean;


  errors?: string[];


  validSelections: {
    validStates: string[];
    validBranches: string[];
    validZones: string[];
  };

  
  invalidSelections: {
    invalidStates: string[];
    invalidBranches: string[];
    invalidZones: string[];
  };
}
