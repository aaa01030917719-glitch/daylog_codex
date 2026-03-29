import Link from "next/link";

export interface StatCardItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface StatCardData {
  label: string;
  value: number;
  unit: string;
  icon: string;
  href: string;
  items?: StatCardItem[];
}

function StatCard({ label, value, unit, icon, href, items }: StatCardData) {
  const max = Math.max(value, 10);
  const pct = Math.min(100, Math.round((value / max) * 100));
  const hasItems = items !== undefined;

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        className="rounded-xl bg-white transition-shadow hover:shadow-md"
        style={{ border: "1px solid #E8E0C8", cursor: "pointer" }}
      >
        <div className="p-3 sm:p-5">
          {/* PC: icon 왼쪽 + 값 오른쪽 */}
          <div className="hidden sm:flex items-start justify-between mb-3">
            <span className="text-xl">{icon}</span>
            <span className="text-2xl font-bold" style={{ color: "#F56B23" }}>
              {value}
              <span className="text-sm font-normal ml-1" style={{ color: "#999999" }}>{unit}</span>
            </span>
          </div>
          {/* 모바일: 아이콘 + 건수 + 라벨 세로 배치, 미니멀 */}
          <div className="sm:hidden flex flex-col items-center gap-0.5">
            <span className="text-base leading-none">{icon}</span>
            <span className="text-base font-bold leading-none" style={{ color: "#F56B23" }}>
              {value}
              <span className="text-xs font-normal ml-0.5" style={{ color: "#999" }}>{unit}</span>
            </span>
            <p className="text-[10px] font-medium text-center mt-0.5 leading-tight" style={{ color: "#2D2D2D" }}>
              {label}
            </p>
          </div>

          {/* PC 라벨 */}
          <p className="hidden sm:block text-sm font-medium" style={{ color: "#2D2D2D" }}>{label}</p>

          {/* 프로그레스바 + % 같은 줄 (PC만) */}
          <div className="hidden sm:flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F5EED5" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "#F56B23" }}
              />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: "#999999" }}>{pct}%</span>
          </div>
        </div>

        {/* 항목 리스트 (PC만) */}
        {hasItems && (
          <div className="hidden sm:block border-t px-5 pb-4" style={{ borderColor: "#F0EBE0", minHeight: "80px" }}>
            {items!.length === 0 ? (
              <p className="text-xs pt-3 text-center" style={{ color: "#bbb" }}>등록된 항목이 없어요</p>
            ) : (
              <>
                {items!.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 pt-2.5">
                    <span className="text-xs truncate flex-1" style={{ color: "#555" }}>{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs flex-shrink-0" style={{ color: "#999" }}>{item.subtitle}</span>
                    )}
                  </div>
                ))}
                <p className="text-xs mt-2 text-right" style={{ color: "#F56B23" }}>더보기 →</p>
              </>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

interface StatCardsProps {
  inProgress: number;
  weekDone: number;
  monthEvents: number;
  inProgressItems?: StatCardItem[];
  weekDoneItems?: StatCardItem[];
  monthEventItems?: StatCardItem[];
}

export function StatCards({
  inProgress,
  weekDone,
  monthEvents,
  inProgressItems,
  weekDoneItems,
  monthEventItems,
}: StatCardsProps) {
  const cards: StatCardData[] = [
    { label: "진행 프로젝트", value: inProgress, unit: "개", icon: "🔄", href: "/projects", items: inProgressItems },
    { label: "이번주 완료", value: weekDone, unit: "개", icon: "✅", href: "/projects", items: weekDoneItems },
    { label: "이번달 일정", value: monthEvents, unit: "건", icon: "📅", href: "/calendar", items: monthEventItems },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
