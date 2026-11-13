import { Injectable } from '@nestjs/common';
import { ActivityAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordActivityInput {
  workspaceId: string;
  issueId?: string;
  actorId: string;
  action: ActivityAction;
  metadata?: Prisma.InputJsonValue;
}

// Append-only, per specification/DOMAIN-MODEL.md - there is deliberately no
// update/delete here. Every other module that changes something writes
// through this service rather than touching the ActivityLog table directly.
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    input: RecordActivityInput,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.activityLog.create({ data: input });
  }

  // One MENTIONED entry per mentioned user, per Phase E - see
  // common/mentions.util.ts for how mentions are found in text. Mentioning
  // yourself records nothing (there's no one to notify).
  async recordMentions(
    input: {
      workspaceId: string;
      issueId?: string;
      actorId: string;
      mentionedUserIds: string[];
      context: 'comment' | 'description';
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    for (const mentionedUserId of input.mentionedUserIds) {
      if (mentionedUserId === input.actorId) continue;
      await this.record(
        {
          workspaceId: input.workspaceId,
          issueId: input.issueId,
          actorId: input.actorId,
          action: 'MENTIONED',
          metadata: { mentionedUserId, context: input.context },
        },
        tx,
      );
    }
  }

  listForIssue(issueId: string) {
    return this.prisma.activityLog.findMany({
      where: { issueId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true } } },
    });
  }

  listForWorkspace(workspaceId: string, take = 50) {
    return this.prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: { select: { id: true, name: true } },
        issue: { select: { id: true, key: true, title: true } },
      },
    });
  }
}
