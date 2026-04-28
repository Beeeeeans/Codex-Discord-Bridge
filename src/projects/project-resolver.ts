import type { ProjectConfig } from "../sessions/session-types.js";

export class ProjectResolver {
  private readonly byChannelId: Map<string, ProjectConfig>;
  private readonly byId: Map<string, ProjectConfig>;

  constructor(projects: ProjectConfig[]) {
    this.byChannelId = new Map(projects.map((project) => [project.channelId, project]));
    this.byId = new Map(projects.map((project) => [project.id, project]));
  }

  forChannel(channelId: string): ProjectConfig | undefined {
    return this.byChannelId.get(channelId);
  }

  byProjectId(projectId: string): ProjectConfig | undefined {
    return this.byId.get(projectId);
  }

  all(): ProjectConfig[] {
    return [...this.byId.values()];
  }
}
