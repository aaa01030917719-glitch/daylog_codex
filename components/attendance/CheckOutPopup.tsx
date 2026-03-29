"use client";

import { useEffect, useState } from "react";

export function CheckOutPopup() {
  const [hasCheckIn, setHasCheckIn] = useState(false);
  const [hasCheckOut, setHasCheckOut] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/attendance/today")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHasCheckIn(d.hasCheckIn);
          setHasCheckOut(d.hasCheckOut);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const shouldShow = ready && hasCheckIn && !hasCheckOut;

  useEffect(() => {
    if (!shouldShow) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "퇴근 처리를 하지 않으셨습니다. 퇴근하시겠습니까?";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldShow]);

  return null;
}
