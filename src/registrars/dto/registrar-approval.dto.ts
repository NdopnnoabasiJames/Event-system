import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ApproveRegistrarDto {
  @IsString()
  @IsNotEmpty()
  registrarId: string;

  @IsString()
  @IsOptional()
  approvalNotes?: string;
}

export class RejectRegistrarDto {
  @IsString()
  @IsNotEmpty()
  registrarId: string;

  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}
