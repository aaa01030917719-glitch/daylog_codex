"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  checkInTime: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function calcDuration(checkInIso: string, checkOutIso: string) {
  const diffMs = new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

export function CheckoutConfirmModal({ checkInTime, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [checkOutTime] = useState(() => new Date().toISOString());

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent style={{ maxWidth: "22rem" }}>
        <DialogHeader>
          <DialogTitle
            style={{ fontFamily: "Noto Serif KR, serif", color: "#0D0D0D", fontWeight: 500 }}
          >
            퇴근 처리할까요?
          </DialogTitle>
        </DialogHeader>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.625rem", padding: "0.25rem 0" }}
        >
          {[
            { label: "출근 시간", value: formatTime(checkInTime) },
            { label: "퇴근 시간", value: formatTime(checkOutTime) },
            { label: "총 근무 시간", value: calcDuration(checkInTime, checkOutTime) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}
            >
              <span style={{ color: "#999" }}>{label}</span>
              <span style={{ fontWeight: 600, color: "#0D0D0D" }}>{value}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            style={{ background: "#dc2626", color: "#fff" }}
            className="hover:opacity-90"
          >
            {loading ? "처리 중..." : "퇴근 처리"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
