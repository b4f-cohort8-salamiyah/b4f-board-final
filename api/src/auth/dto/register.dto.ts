import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Dana Frontend' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'dana@b4fdemo.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo-password-123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt's own input limit
  password: string;
}
