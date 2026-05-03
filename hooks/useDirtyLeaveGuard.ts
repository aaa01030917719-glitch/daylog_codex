"use client";

import { useCallback, useEffect } from "react";

const DEFAULT_MESSAGE =
  "나가면 작성 중인 내용은 저장되지 않고 사라집니다. 나가시겠습니까?";

interface UseDirtyLeaveGuardOptions {
  isDirty: boolean;
  onDiscard?: () => void;
  disabled?: boolean;
  message?: string;
}

function isModifiedMouseEvent(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getAnchorTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest("a[href]") as HTMLAnchorElement | null;
}

function shouldSkipAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href) {
    return true;
  }

  if (
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return true;
  }

  if (anchor.target && anchor.target !== "_self") {
    return true;
  }

  return false;
}

export function useDirtyLeaveGuard({
  isDirty,
  onDiscard,
  disabled = false,
  message = DEFAULT_MESSAGE,
}: UseDirtyLeaveGuardOptions) {
  const shouldWarn = isDirty && !disabled;

  const confirmIfNeeded = useCallback(() => {
    if (!shouldWarn) {
      return true;
    }

    return window.confirm(message);
  }, [message, shouldWarn]);

  const requestClose = useCallback(() => {
    if (confirmIfNeeded()) {
      onDiscard?.();
    }
  }, [confirmIfNeeded, onDiscard]);

  useEffect(() => {
    if (!shouldWarn) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = message;
      return message;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedMouseEvent(event)) {
        return;
      }

      const anchor = getAnchorTarget(event.target);
      if (!anchor || shouldSkipAnchor(anchor)) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, currentUrl.href);

      if (nextUrl.href === currentUrl.href) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [message, shouldWarn]);

  useEffect(() => {
    if (!onDiscard) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      requestClose();
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onDiscard, requestClose]);

  return {
    shouldWarn,
    confirmIfNeeded,
    requestClose,
  };
}
