"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubscriptionsConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "primary" | "danger";
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export function SubscriptionsConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmTone = "primary",
  loading = false,
  onClose,
  onConfirm,
  children,
}: SubscriptionsConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent style={{ maxWidth: "30rem" }}>
        <DialogHeader>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        {children ? (
          <div className="modal-body text-sm leading-7 text-[var(--text-secondary)]">
            {children}
          </div>
        ) : null}
        <DialogFooter>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            className={confirmTone === "danger" ? "danger-button" : "primary-button"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
