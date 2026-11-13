import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  // Required only when `password` is present - verified against the stored
  // hash before a new password is set. See AUTH-AND-PERMISSIONS.md and the
  // Phase A audit fix: changing a password must prove knowledge of the
  // current one, not just an active session.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPassword?: string;
}
