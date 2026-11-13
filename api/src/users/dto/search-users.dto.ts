import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SearchUsersDto {
  @ApiProperty({
    description: 'Matched against name and email, case-insensitive',
    example: 'dana',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({
    description:
      "If given, scopes/filters by this workspace's membership - caller must be a member themselves. Combine with membersOnly to pick which direction: default excludes existing members (the add-member-picker case); membersOnly=true includes ONLY existing members (the @mention case - you can only mention someone already in the workspace).",
  })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({
    description:
      'Requires workspaceId. "true" restricts results to users who ARE already a member of that workspace (for @mentions) instead of the default of excluding them (for the add-member picker).',
  })
  @IsOptional()
  @IsIn(['true'])
  membersOnly?: string;
}
