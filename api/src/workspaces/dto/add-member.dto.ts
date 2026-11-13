import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

// Deliberate simplification: adding a member requires an existing account -
// see specification/API-SPECIFICATION.md, "Workspace members".
export class AddMemberDto {
  @ApiProperty({ example: 'sam@b4fdemo.local' })
  @IsEmail()
  email: string;
}
