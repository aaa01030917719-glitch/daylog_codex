"use client";

import { useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";
import { ProjectsBoardClient } from "@/components/projects/ProjectsBoardClient";
import type {
  ProjectBoardStatus,
  ProjectMember,
  ProjectSummary,
  ProjectViewMode,
} from "@/components/projects/project-board-types";

interface Project {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  doneTasks: number;
  _count?: { tasks: number };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  initialProjects: Project[];
  isAdmin: boolean;
  members: Member[];
}

interface ProjectsPageProps {
  initialProjects: ProjectSummary[];
  isAdmin: boolean;
  members: ProjectMember[];
  initialStatus: ProjectBoardStatus;
  initialView: ProjectViewMode;
  initialProjectId: string | null;
}

export function ProjectsClientPage(props: ProjectsPageProps) {
  return <ProjectsBoardClient {...props} />;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "진행 중", bg: "#E8F7EE", text: "#2A8C50" },
  ARCHIVED: { label: "보관됨", bg: "#F0F0F0", text: "#777" },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyProjectsClientPage({ initialProjects, isAdmin, members }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          프로젝트
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "#F56B23",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            새 프로젝트
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
          <FolderOpen size={48} style={{ color: "#E8E0C8", margin: "0 auto 1rem" }} />
          <p style={{ color: "#999", fontSize: "0.875rem" }}>아직 프로젝트가 없습니다.</p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              style={{ marginTop: "1rem", color: "#F56B23", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
            >
              첫 프로젝트 만들기
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {projects.map((project) => {
            const statusTone = STATUS_LABELS[project.status];
            const secondaryText = project.subtitle?.trim() || project.description?.trim();

            return (
              <div
                key={project.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(event) => (event.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={(event) => (event.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: project.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {project.name}
                  </h3>
                </div>

                {secondaryText ? (
                  <p style={{ fontSize: "0.8125rem", color: "#555", marginBottom: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {secondaryText}
                  </p>
                ) : null}

                {(project._count?.tasks ?? 0) > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#999" }}>진행률</span>
                      <span style={{ fontSize: "0.75rem", color: "#555", fontWeight: 600 }}>
                        {project.doneTasks}/{project._count?.tasks ?? 0}
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "#E8E0C8", borderRadius: "9999px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round((project.doneTasks / (project._count?.tasks ?? 1)) * 100)}%`,
                          background: project.color,
                          borderRadius: "9999px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "9999px",
                      background: statusTone?.bg,
                      color: statusTone?.text,
                    }}
                  >
                    {statusTone?.label ?? project.status}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#999" }}>
                    프로젝트 {project._count?.tasks ?? 0}개
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal ? (
        <ProjectCreateModal
          members={members}
          onCreated={(project) => {
            setProjects((prev) => [
              {
                ...project,
                _count: project._count ?? { tasks: 0 },
              },
              ...prev,
            ]);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </div>
  );
}
