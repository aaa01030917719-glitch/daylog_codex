"use client";

import { ProjectColumn } from "@/components/projects/ProjectColumn";
import type {
  ProjectBoardStatus,
  ProjectSummary,
} from "@/components/projects/project-board-types";

interface ProjectBoardLayoutProps {
  activeStatus: ProjectBoardStatus;
  columns: Record<Exclude<ProjectBoardStatus, "ALL">, ProjectSummary[]>;
  processingProjectId: string | null;
  onCompleteProject: (project: ProjectSummary) => void;
  onSelectProject: (project: ProjectSummary) => void;
}

const ORDER: Exclude<ProjectBoardStatus, "ALL">[] = [
  "ONGOING",
  "UPCOMING",
  "COMPLETED",
];

export function ProjectBoardLayout({
  activeStatus,
  columns,
  processingProjectId,
  onCompleteProject,
  onSelectProject,
}: ProjectBoardLayoutProps) {
  const visibleStatuses =
    activeStatus === "ALL" ? ORDER : ORDER.filter((status) => status === activeStatus);

  return (
    <div
      className={`grid gap-4 ${
        visibleStatuses.length === 1 ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"
      }`}
    >
      {visibleStatuses.map((status) => (
        <ProjectColumn
          key={status}
          status={status}
          projects={columns[status]}
          processingProjectId={processingProjectId}
          onCompleteProject={onCompleteProject}
          onSelectProject={onSelectProject}
        />
      ))}
    </div>
  );
}
