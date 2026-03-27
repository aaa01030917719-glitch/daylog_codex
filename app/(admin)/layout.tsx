import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-light)]">
      {/* 관리자 헤더 */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-[var(--border)] bg-white px-6">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Shield size={20} />
          <span className="font-serif font-semibold text-[var(--text-title)]">
            관리자 패널
          </span>
        </div>
        <span className="text-[var(--border)]">|</span>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-[var(--text-sub)] hover:text-[var(--text-body)] transition-colors"
        >
          <ArrowLeft size={14} />
          일반 화면으로
        </Link>
        <div className="ml-auto text-sm text-[var(--text-sub)]">
          {session.user.name} ({session.user.role})
        </div>
      </header>

      <main className="mx-auto max-w-layout px-6 py-6">{children}</main>
    </div>
  );
}
