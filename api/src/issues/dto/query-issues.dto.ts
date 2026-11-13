import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { IssuePriority, IssueStatus } from '@prisma/client';

export class QueryIssuesDto {
  @ApiPropertyOptional({ enum: IssueStatus })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiPropertyOptional({ enum: IssuePriority })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignee?: string;

  @ApiPropertyOptional({ description: 'Search issue title/key' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Issues in this sprint only' })
  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @ApiPropertyOptional({
    description:
      'When "true", issues with no sprint (the backlog). Ignored if sprintId is also given.',
  })
  @IsOptional()
  @IsIn(['true'])
  backlog?: string;
}
