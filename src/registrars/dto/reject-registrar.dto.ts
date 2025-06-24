import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectRegistrarDto {
  @IsNotEmpty()
  @IsMongoId()
  registrarId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
