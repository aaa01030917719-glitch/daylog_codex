interface DashboardStatCard {
  label: string;
  value: string;
  description: string;
  href: string;
  icon: string;
  tone: string;
}

export function buildDashboardStatCards(params: {
  ongoingProjects: number;
  totalProjects: number;
  ideaCount: number;
  pendingDocs: number;
  remainingLeave: string;
}) {
  return [
    {
      label: "진행 중인 프로젝트",
      value: `${params.ongoingProjects}`,
      description: `전체 ${params.totalProjects}개 프로젝트 중`,
      href: "/projects",
      icon: "📁",
      tone: "var(--accent)",
    },
    {
      label: "아이디어",
      value: `${params.ideaCount}`,
      description: `팀에 공유된 아이디어 ${params.ideaCount}개`,
      href: "/ideas",
      icon: "💡",
      tone: "var(--purple)",
    },
    {
      label: "검토 대기 중",
      value: `${params.pendingDocs}`,
      description: `결재 요청이 ${params.pendingDocs}건 있어요`,
      href: "/docs",
      icon: "📄",
      tone: "var(--warning)",
    },
    {
      label: "남은 연차",
      value: params.remainingLeave,
      description: `연차 ${params.remainingLeave} 남았어요`,
      href: "/leave",
      icon: "🌴",
      tone: "var(--success)",
    },
  ] satisfies DashboardStatCard[];
}
