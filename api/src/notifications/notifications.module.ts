import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// Global, same as ActivityModule - IssuesService, CommentsService,
// WorkspacesService and SprintsService all inject NotificationsService
// directly rather than going through an event bus (this project has no
// message queue / event emitter infrastructure, and the task this was built
// for is explicit: no WebSockets/push/external services).
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
