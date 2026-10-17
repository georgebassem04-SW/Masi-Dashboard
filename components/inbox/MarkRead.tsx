/**
 * Marks a NEW message as read when a staff member actually opens it (not when a link is prefetched).
 * Renders nothing. Used on the inbox page for the open message, and on Customization requests
 * (with `endpoint` = /api/custom-requests/<id>/read).
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function MarkRead({ id, endpoint }: { id: string; endpoint?: string }) {
  const router = useRouter();
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === id) return;
    sent.current = id;
    fetch(endpoint ?? `/api/inbox/${encodeURIComponent(id)}/read`, { method: "POST" })
      .then((r) => r.ok && router.refresh())
      .catch(() => {});
  }, [id, endpoint, router]);
  return null;
}
