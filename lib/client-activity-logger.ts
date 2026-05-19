export type ActivityModule =
  | 'INVENTORY'
  | 'SALES'
  | 'CUSTOMERS'
  | 'PURCHASES'
  | 'SUPPLIERS'
  | 'PRODUCTS'
  | 'USERS'
  | 'POS'
  | 'SETTINGS';

export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ENABLE'
  | 'DISABLE'
  | 'RECEIVE'
  | 'VOID'
  | 'ADJUST'
  | 'TRANSFER'
  | 'LOGIN'
  | 'LOGOUT';

export interface LogActivityOptions {
  action: ActivityAction;
  module: ActivityModule;
  description: string;
  referenceId?: string;
}

function getCurrentUser(): { uid: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mock-user-session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return {
      uid: session.uid || session.userId || 'unknown',
      name: session.displayName || session.email || session.username || 'Unknown User',
    };
  } catch {
    return null;
  }
}

export async function logActivity(options: LogActivityOptions): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) return;

    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
    const res = await fetch(`${base}/user-activity-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user.uid,
        userName: user.name,
        action: options.action,
        module: options.module,
        description: options.description,
        referenceId: options.referenceId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[ActivityLog] Failed to log:', err);
    }
  } catch (err) {
    console.error('[ActivityLog] Error:', err);
  }
}
