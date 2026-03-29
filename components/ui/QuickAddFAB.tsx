"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, CalendarPlus, FolderPlus } from "lucide-react";
import { EventCreateModal } from "@/components/modals/EventCreateModal";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"event" | "project" | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const fabRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSubClick(type: "event" | "project") {
    setOpen(false);
    if (members.length === 0) {
      const res = await fetch("/api/workspace/members");
      if (res.ok) setMembers(await res.json());
    }
    setModal(type);
  }

  return (
    <>
      {/* FAB 컨테이너 */}
      <div
        ref={fabRef}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2"
      >
        {/* 서브 버튼 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.5rem",
            transition: "opacity 150ms ease, transform 150ms ease",
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(8px)",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {/* 프로젝트 */}
          <button
            onClick={() => handleSubClick("project")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#FFFFFF",
              border: "1px solid #E8E0C8",
              borderRadius: "24px",
              padding: "8px 16px",
              cursor: "pointer",
              color: "#0D0D0D",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#FAF7EE";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF";
            }}
          >
            <FolderPlus size={16} />
            프로젝트
          </button>

          {/* 일정 */}
          <button
            onClick={() => handleSubClick("event")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#FFFFFF",
              border: "1px solid #E8E0C8",
              borderRadius: "24px",
              padding: "8px 16px",
              cursor: "pointer",
              color: "#0D0D0D",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#FAF7EE";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF";
            }}
          >
            <CalendarPlus size={16} />
            일정
          </button>
        </div>

        {/* 메인 버튼 */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="빠른 등록"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#F56B23",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(245,107,35,0.4)",
            transition: "background 150ms ease, transform 150ms ease",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#D4581A";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#F56B23";
          }}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </button>
      </div>

      {/* 모달 */}
      {modal === "event" && (
        <EventCreateModal
          members={members}
          onCreated={() => setModal(null)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "project" && (
        <ProjectCreateModal
          members={members}
          onCreated={() => setModal(null)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
