'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const HEARTBEAT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Periodically pings the license server to pull renewals and enforce revocations.
 * Offline-safe: a network failure never locks the POS — only an explicit
 * "revoked" or "suspended" response does.
 */
export function useLicenseHeartbeat() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function beat() {
      try {
        const res = await fetch('/api/license/heartbeat', { method: 'POST' });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (json?.status === 'revoked' || json?.status === 'suspended') {
          router.replace('/activate');
        }
      } catch {
        // Network unreachable — keep working on local license.
      }
    }

    beat();
    timerRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [router]);
}
