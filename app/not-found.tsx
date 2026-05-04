import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 py-16">
      {/* Illustration */}
      <div className="mb-10 w-[260px]">
        <svg viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg" width="260" height="180">
          {/* browser card */}
          <rect x="20" y="24" width="220" height="140" rx="14" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="20" y="24" width="220" height="40" rx="14" fill="var(--surface-2)" />
          <rect x="20" y="50" width="220" height="14" fill="var(--surface-2)" />
          {/* traffic lights */}
          <circle cx="42" cy="44" r="5" fill="#EF4444" opacity=".6" />
          <circle cx="58" cy="44" r="5" fill="#EAB308" opacity=".6" />
          <circle cx="74" cy="44" r="5" fill="#22C55E" opacity=".6" />
          {/* URL bar */}
          <rect x="92" y="36" width="110" height="16" rx="8" fill="var(--border-light)" stroke="var(--border)" strokeWidth="1" />
          <circle cx="101" cy="44" r="4" fill="var(--border)" />
          {/* content lines */}
          <rect x="40" y="80" width="80" height="8" rx="4" fill="var(--border-light)" />
          <rect x="40" y="96" width="120" height="6" rx="3" fill="var(--border-light)" opacity=".6" />
          <rect x="40" y="110" width="100" height="6" rx="3" fill="var(--border-light)" opacity=".5" />
          {/* 404 area */}
          <rect x="148" y="72" width="96" height="64" rx="12" fill="var(--accent)" opacity=".08" />
          <text
            x="196" y="114" textAnchor="middle"
            fill="var(--accent)"
            fontFamily="'Noto Sans KR',-apple-system,sans-serif"
            fontSize="36" fontWeight="700" opacity=".9"
          >
            404
          </text>
          <rect x="164" y="78" width="26" height="26" rx="8" fill="var(--accent)" opacity=".15" />
          <text x="177" y="97" textAnchor="middle" fontSize="14" fill="var(--accent)">⚠</text>
        </svg>
      </div>

      {/* Tag */}
      <span className="mb-4 inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
        style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
        Page not found
      </span>

      {/* Title */}
      <h1 className="mb-2 text-center text-[42px] font-bold leading-tight tracking-tight"
        style={{ color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
        페이지를{" "}
        <span style={{ color: "var(--accent)" }}>찾을</span>{" "}
        수 없어요
      </h1>

      {/* Description */}
      <p className="mb-8 max-w-sm text-center text-[15px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}>
        요청하신 페이지가 삭제되었거나, 주소가 변경되었거나,
        일시적으로 접근할 수 없습니다.
      </p>

      {/* Primary Actions */}
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-[10px] px-6 py-3 text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--accent)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 12L12 4l9 8" /><path d="M5 10v10h5v-6h4v6h5V10" />
          </svg>
          홈으로 돌아가기
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-[10px] border px-6 py-3 text-sm font-medium transition-colors"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          이전 페이지
        </Link>
      </div>

      {/* Quick links */}
      <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
        또는 바로 이동하기
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { href: "/", icon: "🏠", label: "내 워크스페이스" },
          { href: "/projects", icon: "📋", label: "프로젝트" },
          { href: "/notices", icon: "📢", label: "공지사항" },
          { href: "/attendance", icon: "🕐", label: "출퇴근 현황" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-2 text-[13px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
          >
            <span className="text-sm">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
