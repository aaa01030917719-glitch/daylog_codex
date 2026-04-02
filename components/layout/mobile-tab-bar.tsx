"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, FolderKanban, LayoutDashboard, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const tabItems = [
  { href: "/", icon: LayoutDashboard, label: "홈" },
  { href: "/projects", icon: FolderKanban, label: "프로젝트" },
  { href: "/docs", icon: FileText, label: "문서" },
  { href: "/notices", icon: Megaphone, label: "공지" },
  { href: "/notifications", icon: Bell, label: "전달함" },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[rgba(255,255,255,0.96)] px-2 py-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
