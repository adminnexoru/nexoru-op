"use client";

import { useEffect, useRef } from "react";
import { isIdleExpired } from "@/lib/auth/idle";
import { signOutIdle } from "@/lib/auth/actions";

const ACTIVITY_EVENTS = ["keydown", "mousemove", "mousedown", "touchstart", "scroll"] as const;
const CHANNEL = "nexoru-op-activity";

/**
 * Closes the session after 30 minutes without activity in any tab (FR-007, research R6).
 * The server enforces the same limit on its own (check_session and the token hook); this
 * timer only makes it visible to the user at the right moment.
 */
export function IdleTimer() {
  const lastActivity = useRef(0);
  const signingOut = useRef(false);

  useEffect(() => {
    lastActivity.current = Date.now();
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
    let lastBroadcast = 0;

    const onActivity = () => {
      const now = Date.now();
      lastActivity.current = now;
      if (channel && now - lastBroadcast > 5_000) {
        lastBroadcast = now;
        channel.postMessage(now);
      }
    };
    if (channel) channel.onmessage = (event: MessageEvent<number>) => {
      lastActivity.current = Math.max(lastActivity.current, event.data);
    };

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });
    const interval = window.setInterval(() => {
      if (!signingOut.current && isIdleExpired(lastActivity.current, Date.now())) {
        signingOut.current = true;
        void signOutIdle();
      }
    }, 15_000);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      window.clearInterval(interval);
      channel?.close();
    };
  }, []);

  return null;
}
