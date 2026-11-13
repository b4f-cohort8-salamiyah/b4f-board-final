import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CommentsController, IssueCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [CommentsController, IssueCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
