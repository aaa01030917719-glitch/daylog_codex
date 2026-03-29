"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  doneTasks: number;
  _count: { tasks: number };
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

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "진행중", bg: "#E8F7EE", text: "#2A8C50" },
  ARCHIVED: { label: "보관됨", bg: "#F0F0F0", text: "#777" },
};

export function ProjectsClientPage({ initialProjects, isAdmin, members }: Props) {
  const router = useRouter();
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
          {projects.map((p) => {
            const s = STATUS_LABELS[p.status];
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </h3>
                </div>

                {p.description && (
                  <p style={{ fontSize: "0.8125rem", color: "#555", marginBottom: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.description}
                  </p>
                )}

                {/* 진행률 바 */}
                {p._count.tasks > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#999" }}>진행률</span>
                      <span style={{ fontSize: "0.75rem", color: "#555", fontWeight: 600 }}>
                        {p.doneTasks}/{p._count.tasks}
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "#E8E0C8", borderRadius: "9999px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round((p.doneTasks / p._count.tasks) * 100)}%`,
                          background: p.color,
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
                      background: s?.bg,
                      color: s?.text,
                    }}
                  >
                    {s?.label ?? p.status}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#999" }}>
                    프로젝트 {p._count.tasks}개
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create project modal */}
      {showModal && (
        <ProjectCreateModal
          members={members}
          onCreated={(project) => {
            setProjects((prev) => [project, ...prev]);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
