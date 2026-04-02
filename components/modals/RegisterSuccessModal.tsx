"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  name: string;
  hasWorkspace?: boolean;
}

export function RegisterSuccessModal({ open, name, hasWorkspace = false }: Props) {
  function handleStart() {
    window.location.href = hasWorkspace ? "/" : "/onboarding";
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          className="modal-shell"
        >
          <div className="modal-card w-full max-w-[22rem] overflow-hidden">
            <div className="modal-body px-6 py-7 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--success-light)] text-[var(--success)]">
                <CheckCircle2 size={40} strokeWidth={2.2} />
              </div>

              <h2 className="modal-title justify-center">회원가입이 완료되었습니다</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Daylog에 오신 것을 환영합니다. <span className="font-semibold text-[var(--text-primary)]">{name}</span>님의 업무 공간을 바로 시작해 보세요.
              </p>

              <div className="mt-6">
                <button type="button" onClick={handleStart} className="primary-button w-full">
                  시작하기
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
