import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { IssuesController, ProjectIssuesController } from './issues.controller';
import { IssuesService } from './issues.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [IssuesController, ProjectIssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
