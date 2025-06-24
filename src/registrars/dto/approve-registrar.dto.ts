import { IsMongoId, IsNotEmpty } from 'class-validator';

export class ApproveRegistrarDto {
  @IsNotEmpty()
  @IsMongoId()
  registrarId: string;
}
