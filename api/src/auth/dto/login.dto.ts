import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dana@b4fdemo.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo-password-123' })
  @IsString()
  @MinLength(1)
  password: string;
}
