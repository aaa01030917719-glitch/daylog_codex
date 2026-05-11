"use client";

import { useState } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";
import { TaskCreateDetailModal } from "@/components/tasks/TaskCreateDetailModal";
import type { ProjectMember, ProjectSummary } from "@/components/projects/project-board-types";

interface ProjectDetailPageActionsProps {
  project: ProjectSummary;
  members: ProjectMember[];
  canManage: boolean;
  currentUserId: string;
}

export function ProjectDetailPageActions({
  project,
  members,
  canManage,
  currentUserId,
}: ProjectDetailPageActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        "이 프로젝트를 삭제하면 모든게 날아가고 되돌릴 수 없게됩니다. 정말 삭제하시겠습니까?"
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "프로젝트를 삭제하지 못했습니다.");
      }

      window.location.href = "/projects";
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "프로젝트를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {error ? (
        <span className="text-xs font-medium text-[var(--danger)]">{error}</span>
      ) : null}

      {canManage ? (
        <div className="relative">
          <button
            type="button"
            className="secondary-button btn--sm"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="프로젝트 작업 더보기"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[132px] overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-white py-1 shadow-[var(--shadow)]">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                onClick={() => {
                  if (
                    window.confirm(
                      "변경된 사항으로 모두 변경됩니다. 변경하시겠습니까?"
                    )
                  ) {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }
                }}
              >
                수정
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--danger)] transition hover:bg-[var(--danger-light)]"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                삭제
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="primary-button btn--sm"
        onClick={() => setTaskOpen(true)}
      >
        <Plus size={15} />
        업무 추가
      </button>

      {editOpen ? (
        <ProjectCreateModal
          members={members}
          project={project}
          canDelete={canManage}
          startInEditMode
          onClose={() => setEditOpen(false)}
          onSaved={() => window.location.reload()}
          onDeleted={() => {
            window.location.href = "/projects";
          }}
        />
      ) : null}

      {taskOpen ? (
        <TaskCreateDetailModal
          projectId={project.id}
          projectName={project.name}
          defaultStatus="IN_PROGRESS"
          members={members}
          currentUserId={currentUserId}
          onClose={() => setTaskOpen(false)}
          onCreated={() => window.location.reload()}
        />
      ) : null}
    </div>
  );
}
