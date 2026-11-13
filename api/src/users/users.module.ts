import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
