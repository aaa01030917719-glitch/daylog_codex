"use client";

import { useState } from "react";
import { Lightbulb, FolderKanban, CalendarPlus } from "lucide-react";
import { EventCreateModal } from "@/components/modals/EventCreateModal";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";

type ActiveModal = "idea" | "project" | "event" | null;

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}


function IdeaModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/board/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "IDEA", title, content }),
      });
      setDone(true);
      setTimeout(onClose, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        style={{ border: "1px solid #E8E0C8" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-base font-semibold" style={{ color: "#0D0D0D" }}>
            💡 아이디어 올리기
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>
        {done ? (
          <p className="text-center py-6 text-sm font-medium" style={{ color: "#2A8C50" }}>
            ✅ 등록되었습니다!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="제목 (선택)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "#E8E0C8", color: "#0D0D0D" }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
            <textarea
              placeholder="아이디어를 자유롭게 적어주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: "#E8E0C8", color: "#0D0D0D" }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm border transition-colors hover:bg-[#FAF7EE]"
                style={{ borderColor: "#E8E0C8", color: "#555" }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "#F56B23" }}
              >
                {loading ? "등록 중..." : "등록"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function QuickAddFAB() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [members, setMembers] = useState<Member[]>([]);

  async function fetchMembers() {
    if (members.length === 0) {
      const res = await fetch("/api/workspace/members");
      if (res.ok) setMembers(await res.json());
    }
  }

  const buttons: {
    key: ActiveModal;
    icon: React.ElementType;
    label: string;
    onClick: () => void;
  }[] = [
    {
      key: "idea",
      icon: Lightbulb,
      label: "아이디어",
      onClick: () => setActiveModal("idea"),
    },
    {
      key: "project",
      icon: FolderKanban,
      label: "프로젝트",
      onClick: async () => { await fetchMembers(); setActiveModal("project"); },
    },
    {
      key: "event",
      icon: CalendarPlus,
      label: "일정",
      onClick: async () => { await fetchMembers(); setActiveModal("event"); },
    },
  ];

  return (
    <>
      {/* 항상 펼쳐진 3개 버튼 */}
      <div
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end"
        style={{ gap: "10px" }}
      >
        {buttons.map(({ key, icon: Icon, label, onClick }) => (
          <div key={key} className="flex items-center gap-2">
            {/* 라벨 */}
            <span
              style={{
                background: "#fff",
                border: "1px solid #E8E0C8",
                borderRadius: "6px",
                fontSize: "12px",
                padding: "3px 8px",
                color: "#2D2D2D",
                fontWeight: 500,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            {/* 원형 버튼 */}
            <button
              onClick={onClick}
              aria-label={label}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#1C1A17",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
                transition: "background 150ms ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#2D2A26";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#1C1A17";
              }}
            >
              <Icon size={18} />
            </button>
          </div>
        ))}
      </div>

      {activeModal === "idea" && (
        <IdeaModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "project" && (
        <ProjectCreateModal
          members={members}
          onCreated={() => setActiveModal(null)}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "event" && (
        <EventCreateModal
          members={members}
          onCreated={() => setActiveModal(null)}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}
