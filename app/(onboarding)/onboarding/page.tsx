"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Building2, CheckCircle2, Link2 } from "lucide-react";
import { WorkspaceSuccessModal } from "@/components/modals/WorkspaceSuccessModal";

type CreatedWorkspace = {
  name: string;
  inviteCode: string;
};

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const alreadyHasWorkspace = !!(session?.user as { workspaceId?: string } | undefined)?.workspaceId;

  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedWorkspace | null>(null);

  async function handleCreate() {
    if (!workspaceName.trim()) {
      setError("워크스페이스 이름을 입력해 주세요.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "워크스페이스를 생성하지 못했습니다.");
        return;
      }

      await update();
      if (data.alreadyExists) {
        window.location.href = "/";
        return;
      }

      setCreated({
        name: data.name ?? workspaceName.trim(),
        inviteCode: data.inviteCode ?? "",
      });
    } catch {
      setError("워크스페이스를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <WorkspaceSuccessModal open={true} workspaceName={created.name} inviteCode={created.inviteCode} />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)] px-4 py-10">
      <div className="w-full max-w-[30rem] space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-title)]">daylog</h1>
          <p className="mt-2 text-sm text-[var(--text-sub)]">
            워크스페이스를 만들고 바로 협업을 시작해 보세요.
          </p>
        </div>

        {alreadyHasWorkspace ? (
          <div className="rounded-2xl border border-[#bbf7d0] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-light)] text-[var(--success)]">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-title)]">이미 워크스페이스에 참여 중입니다</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-sub)]">
              현재 계정으로 바로 Daylog를 사용할 수 있습니다.
            </p>
            <button
              type="button"
              className="primary-button mt-6 w-full"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              워크스페이스로 이동
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)]">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-title)]">새 워크스페이스 만들기</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-sub)]">
                  팀 이름이나 브랜드 이름으로 워크스페이스를 생성한 뒤 구성원을 초대할 수 있습니다.
                </p>
              </div>
            </div>

            <label className="field">
              <span className="field-label">워크스페이스 이름</span>
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) {
                    void handleCreate();
                  }
                }}
                className="form-input"
                autoFocus
                placeholder="예: Daylog Marketing Team"
              />
            </label>

            {error ? <p className="mt-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

            <button
              type="button"
              className="primary-button mt-6 w-full"
              onClick={() => void handleCreate()}
              disabled={loading || !workspaceName.trim()}
            >
              {loading ? "생성 중..." : "워크스페이스 만들기"}
            </button>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[var(--accent)]">
                  <Link2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-title)]">초대 링크가 있다면</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-sub)]">
                    초대 코드를 직접 입력하지 말고, 전달받은 초대 링크를 열어 바로 참여해 주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!alreadyHasWorkspace ? (
          <div className="text-center text-sm text-[var(--text-sub)]">
            일반 홈으로 돌아가시겠어요?{" "}
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-[var(--accent)]"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              홈으로 이동
              <ArrowRight size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
