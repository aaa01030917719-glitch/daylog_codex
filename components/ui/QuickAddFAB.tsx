"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, FolderKanban, Lightbulb } from "lucide-react";
import { EventCreateModal } from "@/components/modals/EventCreateModal";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";

type ActiveModal = "project" | "event" | null;

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

export function QuickAddFAB() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const showFloatingButton = false;

  async function fetchMembers() {
    if (members.length === 0) {
      const response = await fetch("/api/workspace/members");
      if (response.ok) {
        setMembers(await response.json());
      }
    }
  }

  const buttons: Array<{
    key: string;
    icon: React.ElementType;
    label: string;
    onClick: () => void | Promise<void>;
  }> = [
    {
      key: "idea",
      icon: Lightbulb,
      label: "아이디어",
      onClick: () => router.push("/ideas"),
    },
    {
      key: "project",
      icon: FolderKanban,
      label: "프로젝트",
      onClick: async () => {
        await fetchMembers();
        setActiveModal("project");
      },
    },
    {
      key: "event",
      icon: CalendarPlus,
      label: "일정",
      onClick: async () => {
        await fetchMembers();
        setActiveModal("event");
      },
    },
  ];

  return (
    <>
      <div
        aria-hidden={!showFloatingButton}
        className="fixed bottom-20 right-4 z-50 hidden flex-col items-end gap-3 md:bottom-6 md:right-6 md:flex"
        hidden={!showFloatingButton}
      >
        {buttons.map(({ key, icon: Icon, label, onClick }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
              {label}
            </span>
            <button
              type="button"
              onClick={() => {
                void onClick();
              }}
              aria-label={label}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sidebar-bg)] text-white shadow-[0_16px_28px_rgba(15,23,42,0.24)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--accent)]"
            >
              <Icon size={18} />
            </button>
          </div>
        ))}
      </div>

      {activeModal === "project" ? (
        <ProjectCreateModal
          members={members}
          onCreated={() => setActiveModal(null)}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === "event" ? (
        <EventCreateModal
          members={members}
          onCreated={() => setActiveModal(null)}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </>
  );
}
