import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MemberRoleSelect } from "@/components/settings/MemberRoleSelect";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/");

  const workspaceId = session.user.workspaceId ?? "";

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, createdAt: true },
  });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [
      { role: "asc" },  // OWNER가 먼저
      { joinedAt: "asc" },
    ],
  });

  const ROLE_LABELS: Record<string, string> = {
    OWNER: "대표",
    ADMIN: "관리자",
    MEMBER: "직원",
  };

  return (
    <div style={{ maxWidth: "720px" }}>
      {/* 페이지 제목 */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "20px", fontWeight: 700, color: "#0D0D0D", margin: 0 }}>
          워크스페이스 설정
        </h1>
        <p style={{ fontSize: "13px", color: "#999", marginTop: "4px" }}>
          워크스페이스 정보를 확인하고 멤버 역할을 관리합니다.
        </p>
      </div>

      {/* 섹션 1 — 기본 정보 */}
      <section style={{
        background: "#fff", border: "1px solid #E8E0C8", borderRadius: "12px",
        padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "15px", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          워크스페이스 정보
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {[
            { label: "워크스페이스 이름", value: workspace?.name ?? "-" },
            { label: "생성일", value: workspace ? format(new Date(workspace.createdAt), "yyyy년 M월 d일", { locale: ko }) : "-" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "13px", color: "#999", width: "140px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#0D0D0D" }}>{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 섹션 2 — 멤버 관리 */}
      <section style={{
        background: "#fff", border: "1px solid #E8E0C8", borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "15px", fontWeight: 600, color: "#0D0D0D", marginBottom: "1rem" }}>
          멤버 관리
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5EED5" }}>
                {["이름", "이메일", "역할", "변경"].map((h) => (
                  <th key={h} style={{
                    padding: "8px 14px", textAlign: "left",
                    fontSize: "11px", fontWeight: 600, color: "#7A6A4A",
                    borderBottom: "0.5px solid #F0EBE0",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isMe = m.user.id === session.user.id;
                const isOwnerRow = m.role === "OWNER";
                return (
                  <tr key={m.id} style={{ borderBottom: "0.5px solid #F0EBE0" }}>
                    <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 500, color: "#0D0D0D" }}>
                      {m.user.name ?? "-"}
                      {isMe && (
                        <span style={{ fontSize: "10px", color: "#F56B23", marginLeft: "6px", fontWeight: 600 }}>나</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: "#555" }}>
                      {m.user.email}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
                        background: isOwnerRow ? "#FEF0E8" : m.role === "ADMIN" ? "#EEF3FC" : "#F5F5F5",
                        color: isOwnerRow ? "#C05621" : m.role === "ADMIN" ? "#3B5BDB" : "#555",
                      }}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {isOwnerRow ? (
                        <span style={{ fontSize: "12px", color: "#ccc" }}>변경 불가</span>
                      ) : (
                        <MemberRoleSelect memberId={m.id} currentRole={m.role} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
