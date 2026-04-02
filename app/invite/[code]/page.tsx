"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, Building2, CheckCircle2, Loader2, LogIn, UserPlus } from "lucide-react";
import { createInvitePath, normalizeInviteCode } from "@/lib/utils";

type InviteReason = "INVALID" | "EXPIRED" | "ERROR" | null;

type InviteInfo = {
  workspaceName: string;
  ownerName: string | null;
};

type JoinState = "idle" | "joining" | "joined" | "same-workspace" | "other-workspace" | "error";

export default function InvitePage() {
  const params = useParams();
  const code = normalizeInviteCode(String(params.code ?? ""));
  const { status, update } = useSession();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [validating, setValidating] = useState(true);
  const [invalidReason, setInvalidReason] = useState<InviteReason>(null);
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [joinMessage, setJoinMessage] = useState("");
  const joinAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function validateInvite() {
      setValidating(true);
      setInvalidReason(null);
      setInfo(null);

      try {
        const response = await fetch("/api/workspace/validate-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: code }),
        });
        const data = (await response.json()) as {
          valid?: boolean;
          reason?: InviteReason;
          workspaceName?: string;
          ownerName?: string | null;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.valid || !data.workspaceName) {
          setInvalidReason(data.reason ?? "INVALID");
          return;
        }

        setInfo({
          workspaceName: data.workspaceName,
          ownerName: data.ownerName ?? null,
        });
      } catch {
        if (!cancelled) {
          setInvalidReason("ERROR");
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    }

    if (!code) {
      setInvalidReason("INVALID");
      setValidating(false);
      return;
    }

    void validateInvite();

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (status !== "authenticated" || !info || joinAttemptedRef.current) {
      return;
    }

    joinAttemptedRef.current = true;

    async function joinWorkspace() {
      setJoinState("joining");
      setJoinMessage("워크스페이스에 참여하는 중입니다...");

      try {
        const response = await fetch("/api/workspace/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: code }),
        });
        const data = (await response.json()) as {
          error?: string;
          alreadyExists?: boolean;
          sameWorkspace?: boolean;
          code?: string;
        };

        if (response.ok) {
          await update();
          if (data.alreadyExists && data.sameWorkspace) {
            setJoinState("same-workspace");
            setJoinMessage("이미 이 워크스페이스에 참여 중입니다. 바로 이동할 수 있어요.");
            return;
          }

          setJoinState("joined");
          setJoinMessage("참여가 완료되었습니다. 워크스페이스로 이동합니다.");
          window.setTimeout(() => {
            window.location.href = "/";
          }, 900);
          return;
        }

        if (data.code === "ALREADY_IN_OTHER_WORKSPACE") {
          setJoinState("other-workspace");
          setJoinMessage(data.error ?? "이미 다른 워크스페이스에 참여 중입니다.");
          return;
        }

        setJoinState("error");
        setJoinMessage(data.error ?? "워크스페이스 참여에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } catch {
        setJoinState("error");
        setJoinMessage("워크스페이스 참여에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }

    void joinWorkspace();
  }, [code, info, status, update]);

  const inviteLoginHref = `/login?inviteCode=${encodeURIComponent(code)}`;
  const inviteRegisterHref = `/register?inviteCode=${encodeURIComponent(code)}`;

  function renderInvalidState() {
    const title =
      invalidReason === "EXPIRED"
        ? "만료되었거나 비활성화된 초대 링크입니다"
        : invalidReason === "ERROR"
          ? "초대 링크를 확인하지 못했습니다"
          : "유효하지 않은 초대 링크입니다";

    const description =
      invalidReason === "EXPIRED"
        ? "초대 링크의 사용 기간이 지났거나 관리자가 링크를 비활성화했습니다. 새로운 초대 링크를 다시 받아 주세요."
        : invalidReason === "ERROR"
          ? "일시적인 오류로 초대 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "초대 링크가 잘못되었거나 더 이상 사용할 수 없습니다. 링크를 다시 확인해 주세요.";

    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-light)] text-[var(--danger)]">
          <AlertTriangle size={30} />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-title)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-sub)]">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/register" className="primary-button w-full justify-center">
            일반 회원가입
          </Link>
          <Link href="/" className="secondary-button w-full justify-center">
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  function renderValidState() {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
            <Building2 size={30} />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-title)]">{info?.workspaceName}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-sub)]">
            {info?.ownerName
              ? `${info.ownerName}님이 초대한 워크스페이스입니다.`
              : "초대 링크를 통해 워크스페이스에 참여합니다."}
          </p>
        </div>

        {status === "loading" || validating ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
            <Loader2 size={16} className="animate-spin" />
            초대 링크를 확인하는 중입니다...
          </div>
        ) : null}

        {status === "unauthenticated" ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              로그인 또는 회원가입 후 바로 참여할 수 있습니다.
            </p>
            <Link href={inviteLoginHref} className="primary-button w-full justify-center gap-2">
              <LogIn size={16} />
              로그인 후 참여하기
            </Link>
            <Link href={inviteRegisterHref} className="secondary-button w-full justify-center gap-2">
              <UserPlus size={16} />
              회원가입 후 참여하기
            </Link>
          </div>
        ) : null}

        {status === "authenticated" ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
              {joinState === "joining" ? (
                <span className="inline-flex items-center gap-2 text-[var(--text-primary)]">
                  <Loader2 size={16} className="animate-spin" />
                  {joinMessage}
                </span>
              ) : joinState === "joined" ? (
                <span className="inline-flex items-center gap-2 font-medium text-[var(--success)]">
                  <CheckCircle2 size={16} />
                  {joinMessage}
                </span>
              ) : (
                <span>{joinMessage || "초대 링크를 확인했습니다."}</span>
              )}
            </div>

            {joinState === "same-workspace" || joinState === "joined" ? (
              <Link href="/" className="primary-button w-full justify-center">
                워크스페이스로 이동
              </Link>
            ) : null}

            {joinState === "other-workspace" || joinState === "error" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/" className="secondary-button w-full justify-center">
                  홈으로 이동
                </Link>
                <Link href={createInvitePath(code)} className="primary-button w-full justify-center">
                  다시 확인
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-light)] px-4 py-10">
      <div className="w-full max-w-[28rem] space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-title)]">daylog</h1>
          <p className="mt-2 text-sm text-[var(--text-sub)]">
            초대 링크를 통해 워크스페이스에 참여합니다.
          </p>
        </div>

        {validating && !info && !invalidReason ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
              <Loader2 size={16} className="animate-spin" />
              초대 링크를 확인하는 중입니다...
            </div>
          </div>
        ) : null}

        {!validating && invalidReason ? renderInvalidState() : null}
        {!validating && !invalidReason && info ? renderValidState() : null}
      </div>
    </div>
  );
}
