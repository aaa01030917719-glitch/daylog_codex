"use client";

import { ProjectCard } from "@/components/projects/ProjectCard";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  type ProjectBoardStatus,
  type ProjectSummary,
} from "@/components/projects/project-board-types";

interface ProjectColumnProps {
  status: Exclude<ProjectBoardStatus, "ALL">;
  projects: ProjectSummary[];
  processingProjectId: string | null;
  onCompleteProject: (project: ProjectSummary) => void;
  onSelectProject: (project: ProjectSummary) => void;
}

export function ProjectColumn({
  status,
  projects,
  processingProjectId,
  onCompleteProject,
  onSelectProject,
}: ProjectColumnProps) {
  const tone = PROJECT_STATUS_COLORS[status];

  return (
    <section className="p-2 flex flex-col max-w-[680px] w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.text }} />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{PROJECT_STATUS_LABELS[status]}</h2>
        </div>
        <span className="status-badge">
          {projects.length}
        </span>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isProcessing={processingProjectId === project.id}
            onComplete={onCompleteProject}
            onSelect={onSelectProject}
          />
        ))}
      </div>
    </section>
  );
}
