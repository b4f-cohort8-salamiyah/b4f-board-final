import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectSprintsController, SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [ProjectSprintsController, SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
