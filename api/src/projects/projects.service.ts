import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateProjectDto) {
    await this.access.requireRole(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const existing = await this.prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId, key: dto.key } },
    });
    if (existing) {
      throw new ConflictException('That project key is already used in this workspace');
    }

    return this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        key: dto.key,
        description: dto.description,
      },
    });
  }

  async findAllForWorkspace(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.prisma.project.findMany({
      where: { workspaceId },
      include: { _count: { select: { issues: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getProjectOrThrow(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async findOne(projectId: string, userId: string) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireMembership(project.workspaceId, userId);
    return project;
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireRole(project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    return this.prisma.project.update({ where: { id: projectId }, data: dto });
  }

  async remove(projectId: string, userId: string) {
    const project = await this.getProjectOrThrow(projectId);
    await this.access.requireRole(project.workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { deleted: true };
  }
}
