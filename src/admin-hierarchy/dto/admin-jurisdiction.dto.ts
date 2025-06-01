import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class AdminReplacementDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  currentAdminId: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  newAdminId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class JurisdictionTransferDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  fromAdminId: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  toAdminId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Role)
  adminRole: Role;

  @IsString()
  @IsOptional()
  @IsMongoId()
  stateId?: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  zoneId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class JurisdictionTransferResponseDto {
  success: boolean;
  
  fromAdmin: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };

  toAdmin: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };

  transferredJurisdiction: {
    stateId?: string;
    stateName?: string;
    branchId?: string;
    branchName?: string;
    zoneId?: string;
    zoneName?: string;
  };

  transferDate: Date;
  reason?: string;
  notes?: string;
}

export class AdminReplacementResponseDto {
  success: boolean;
  
  replacedAdmin: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };

  newAdmin: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };

  replacementDate: Date;
  reason?: string;
  notes?: string;
}
