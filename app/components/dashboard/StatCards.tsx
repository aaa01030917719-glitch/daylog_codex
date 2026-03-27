interface StatCardData {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: string;
}

interface StatCardsProps {
  inProgress: number;
  weekDone: number;
  monthEvents: number;
}

function StatCard({ label, value, max, unit, icon }: StatCardData) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div
      className="rounded-xl bg-white p-5 transition-shadow hover:shadow-md"
      style={{ border: "1px solid #E8E0C8" }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-bold" style={{ color: "#F56B23" }}>
          {value}
          <span className="text-sm font-normal ml-1" style={{ color: "#999999" }}>{unit}</span>
        </span>
      </div>
      <p className="text-sm font-medium mb-3" style={{ color: "#2D2D2D" }}>{label}</p>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F5EED5" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "#F56B23" }}
        />
      </div>
      <p className="text-xs mt-1.5 text-right" style={{ color: "#999999" }}>{pct}%</p>
    </div>
  );
}

export function StatCards({ inProgress, weekDone, monthEvents }: StatCardsProps) {
  const cards: StatCardData[] = [
    { label: "진행중 태스크", value: inProgress, max: Math.max(inProgress, 10), unit: "개", icon: "🔄" },
    { label: "이번주 완료", value: weekDone, max: Math.max(weekDone, 10), unit: "개", icon: "✅" },
    { label: "이번달 일정", value: monthEvents, max: Math.max(monthEvents, 20), unit: "건", icon: "📅" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
