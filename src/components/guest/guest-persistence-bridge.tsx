"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GUEST_LOCAL_STORAGE_KEY } from "@/domain/viewer/types";
import { syncGuestIdentityAction } from "@/server/actions/guest-session";

/**
 * Keeps guest learner id stable across reloads:
 * httpOnly cookie (server) ↔ localStorage (browser).
 */
export function GuestPersistenceBridge() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let localGuestId: string | null = null;
    try {
      localGuestId = window.localStorage.getItem(GUEST_LOCAL_STORAGE_KEY);
    } catch {
      localGuestId = null;
    }

    void syncGuestIdentityAction({ localGuestId }).then((res) => {
      if (res.guestId) {
        try {
          window.localStorage.setItem(GUEST_LOCAL_STORAGE_KEY, res.guestId);
        } catch {
          // private mode / blocked storage — cookie alone still works
        }
        // If we restored a preferred id that differs from middleware mint, refresh.
        if (localGuestId && localGuestId === res.guestId) {
          // stable — no refresh needed
        } else if (localGuestId && localGuestId !== res.guestId) {
          router.refresh();
        }
      }
    });
  }, [router]);

  return null;
}
