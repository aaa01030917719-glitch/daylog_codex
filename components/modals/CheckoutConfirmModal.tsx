"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  checkInTime: string; // ISO string
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function calcDuration(checkInIso: string, checkOutIso: string) {
  const diffMs = new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export function CheckoutConfirmModal({ checkInTime, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  // 모달이 열릴 때 기준 현재 시각
  const [checkOutTime] = useState(() => new Date().toISOString());

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent style={{ maxWidth: "22rem" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Noto Serif KR, serif", color: "#0D0D0D" }}>
            퇴근 처리할까요?
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", padding: "0.25rem 0" }}>
          {[
            { label: "출근 시간", value: formatTime(checkInTime) },
            { label: "퇴근 시간", value: formatTime(checkOutTime) },
            { label: "총 근무시간", value: calcDuration(checkInTime, checkOutTime) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
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
