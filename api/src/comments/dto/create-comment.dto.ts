import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Looks good, shipping this.' })
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  body: string;
}
