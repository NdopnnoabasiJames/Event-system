import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class LoginResponseDto {
  access_token: string;

  user: {
    id: string;
    email: string;
    role: string;
  };
}
