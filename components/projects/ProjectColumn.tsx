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
    <section className="card-panel flex min-h-[420px] flex-col bg-[var(--surface-2)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.text }} />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{PROJECT_STATUS_LABELS[status]}</h2>
        </div>
        <span className="status-badge" style={{ background: tone.background, color: tone.text }}>
          {projects.length}
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="empty-panel flex-1">
          <p className="empty-panel__title">해당 상태의 프로젝트가 없습니다.</p>
          <p className="empty-panel__description">상태에 맞는 프로젝트가 생기면 이 컬럼에 자동으로 표시됩니다.</p>
        </div>
      ) : (
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
      )}
    </section>
  );
}
