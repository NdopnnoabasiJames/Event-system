import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsEnum, 
  MinLength,
  Matches 
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'
    }
  )
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
