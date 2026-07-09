/**
 * Pure cloud-sync gate decision. ZERO imports (unit-testable). Sync runs only when
 * the cloud DB is configured, the license grants 'cloud-sync', AND the admin toggle
 * is enabled. The reason drives the settings UI's "why is sync off" message.
 */
export type SyncGateReason = 'ok' | 'not_configured' | 'not_licensed' | 'disabled';

export function evaluateSyncGate(s: {
  configured: boolean;
  licensed: boolean;
  enabled: boolean;
}): { open: boolean; reason: SyncGateReason } {
  if (!s.configured) return { open: false, reason: 'not_configured' };
  if (!s.licensed) return { open: false, reason: 'not_licensed' };
  if (!s.enabled) return { open: false, reason: 'disabled' };
  return { open: true, reason: 'ok' };
}
