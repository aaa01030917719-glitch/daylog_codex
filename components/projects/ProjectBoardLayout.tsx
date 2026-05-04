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
  "REVIEW",
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
  const allColumns = ORDER.map((status) => ({
    status,
    items: columns[status],
  }));

  const visibleColumns =
    activeStatus === "ALL"
      ? allColumns.filter((column) => column.items.length > 0)
      : allColumns.filter(
          (column) => column.status === activeStatus && column.items.length > 0
        );

  const gridClassName =
  visibleColumns.length <= 1
    ? "grid-cols-1"
    : visibleColumns.length === 2
      ? "grid-cols-1 md:grid-cols-2"
      : visibleColumns.length === 3
        ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={`grid gap-4 ${gridClassName}`}>
      {visibleColumns.map(({ status, items }) => (
        <ProjectColumn
          key={status}
          status={status}
          projects={items}
          processingProjectId={processingProjectId}
          onCompleteProject={onCompleteProject}
          onSelectProject={onSelectProject}
        />
      ))}
    </div>
  );
}
