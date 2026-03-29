"use client";

import { useState } from "react";

type ModalType = "idea" | "ceo" | "task" | null;

interface QuickAddModalProps {
  type: ModalType;
  onClose: () => void;
}

function QuickAddModal({ type, onClose }: QuickAddModalProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const config = {
    idea: { title: "💡 아이디어 올리기", postType: "IDEA", placeholder: "아이디어를 자유롭게 적어주세요." },
    ceo: { title: "📬 대표님께 전달", postType: "CEO_MESSAGE", placeholder: "대표님께 전달할 내용을 적어주세요." },
    task: { title: "✅ 프로젝트 추가", postType: null, placeholder: "프로젝트 내용을 입력하세요." },
  }[type ?? "idea"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      if (config.postType) {
        await fetch("/api/board/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: config.postType, title, content }),
        });
      }
      setDone(true);
      setTimeout(onClose, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" style={{ border: "1px solid #E8E0C8" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-base font-semibold" style={{ color: "#0D0D0D" }}>{config.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {done ? (
          <p className="text-center py-6 text-sm font-medium" style={{ color: "#2A8C50" }}>✅ 등록되었습니다!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {type !== "ceo" && (
              <input
                type="text"
                placeholder="제목 (선택)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
                style={{ borderColor: "#E8E0C8", color: "#0D0D0D" }}
              />
            )}
            <textarea
              placeholder={config.placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 resize-none"
              style={{ borderColor: "#E8E0C8", color: "#0D0D0D" }}
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

const BUTTONS = [
  { key: "idea" as ModalType, label: "💡 아이디어 올리기" },
  { key: "ceo" as ModalType, label: "📬 대표님께 전달" },
  { key: "task" as ModalType, label: "✅ 프로젝트 추가" },
];

export function QuickAdd() {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setModal(key)}
            className="rounded-xl py-3.5 px-4 text-sm font-medium text-left transition-all"
            style={{
              border: "1.5px dashed #E8E0C8",
              color: "#555",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#F56B23";
              (e.currentTarget as HTMLButtonElement).style.color = "#F56B23";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#E8E0C8";
              (e.currentTarget as HTMLButtonElement).style.color = "#555";
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {modal && <QuickAddModal type={modal} onClose={() => setModal(null)} />}
    </>
  );
}
