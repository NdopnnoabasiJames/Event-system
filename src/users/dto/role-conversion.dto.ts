import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class ConvertUserRoleDto {
  @IsString()
  userId: string;

  @IsEnum(Role)
  toRole: Role;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConvertToRegistrarDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConvertToWorkerDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
