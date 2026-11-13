import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IssuePriority } from '@prisma/client';

export class CreateIssueDto {
  @ApiProperty({ example: 'Fix broken footer link on mobile' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: IssuePriority })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @ApiPropertyOptional({
    description: 'Must be a member of the issue’s workspace',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Never negative' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  storyPoints?: number;

  @ApiPropertyOptional({
    description:
      'Must belong to this issue’s project. Omit to create in the Backlog (no sprint)',
  })
  @IsOptional()
  @IsUUID()
  sprintId?: string;
}
