import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class QueryNotificationsDto {
  @ApiPropertyOptional({
    description: 'When "true", only unread notifications are returned.',
  })
  @IsOptional()
  @IsIn(['true'])
  unread?: string;
}
