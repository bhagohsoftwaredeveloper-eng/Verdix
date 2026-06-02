'use client';

/**
 * LicenseGate — app-wide activation wall.
 * ----------------------------------------------------------------------------
 * Mounted once in ClientLayout so it covers EVERY route (POS, login, admin).
 * On mount it checks /api/license/status. If the machine is not licensed (or
 * the license expired / belongs to another machine) it replaces the whole app
 * with an activation screen and blocks access until a valid key is entered.
 *
 * When licensed, it renders the app normally and shows a small banner when a
 * subscription license is close to expiring.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Copy, Check, KeyRound, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type LicenseStatus = 'active' | 'expired' | 'wrong-machine' | 'invalid' | 'unlicensed';

interface LicenseInfo {
  status: LicenseStatus;
  licensed: boolean;
  machineId: string;
  reason?: string;
  customer?: string;
  edition?: string;
  expires?: string | null;
  daysRemaining?: number | null;
}

const STATUS_COPY: Record<LicenseStatus, { title: string; tone: 'idle' | 'warn' | 'error' }> = {
  unlicensed: { title: 'Activation required', tone: 'idle' },
  invalid: { title: 'Invalid license key', tone: 'error' },
  'wrong-machine': { title: 'License is for a different computer', tone: 'error' },
  expired: { title: 'License expired', tone: 'warn' },
  active: { title: 'Licensed', tone: 'idle' },
};

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/license/status', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success) setInfo(json.data as LicenseInfo);
      else setInfo({ status: 'invalid', licensed: false, machineId: '' });
    } catch {
      // If the status check itself fails we fail OPEN to avoid bricking the POS
      // on a transient server hiccup. Signature verification still gates real use.
      setInfo({ status: 'active', licensed: true, machineId: '' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (info && info.licensed) {
    return (
      <>
        <ExpiryBanner info={info} />
        {children}
      </>
    );
  }

  return <ActivationScreen info={info} onActivated={refresh} />;
}

function ExpiryBanner({ info }: { info: LicenseInfo }) {
  const days = info.daysRemaining;
  if (days == null || days > 14) return null;
  return (
    <div className="non-printable w-full bg-amber-500/15 border-b border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2">
      <AlertTriangle className="h-3.5 w-3.5" />
      Your license expires in {days} day{days === 1 ? '' : 's'}. Please renew to avoid interruption.
    </div>
  );
}

function ActivationScreen({
  info,
  onActivated,
}: {
  info: LicenseInfo | null;
  onActivated: () => void;
}) {
  const [key, setKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const machineId = info?.machineId || '';
  const status = info?.status || 'unlicensed';
  const meta = STATUS_COPY[status];

  const copyMachineId = async () => {
    try {
      await navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const activate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const json = await res.json();
      if (json?.success) {
        onActivated();
      } else {
        setError(json?.error || 'Activation failed.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 p-4 overflow-auto">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={
                'flex h-11 w-11 items-center justify-center rounded-xl ' +
                (meta.tone === 'error'
                  ? 'bg-destructive/10 text-destructive'
                  : meta.tone === 'warn'
                  ? 'bg-amber-500/15 text-amber-600'
                  : 'bg-primary/10 text-primary')
              }
            >
              {meta.tone === 'idle' ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">Verdix POS — License Activation</CardTitle>
              <CardDescription>{meta.title}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {status === 'expired' && info?.customer && (
            <p className="text-sm text-muted-foreground">
              The license for <span className="font-semibold">{info.customer}</span> has expired.
              Enter a renewed license key below to continue.
            </p>
          )}
          {status === 'wrong-machine' && (
            <p className="text-sm text-muted-foreground">
              The installed key was issued for another computer. Send the Machine ID below to your
              vendor to receive a key for this machine.
            </p>
          )}

          {/* Machine ID — the customer sends this to the vendor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your Machine ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm break-all">
                {machineId || '—'}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyMachineId} title="Copy">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Send this ID to your software vendor. They will issue a license key locked to this
              computer.
            </p>
          </div>

          {/* License key entry */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              License Key
            </label>
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your license key here (VRDX1.…)"
              rows={4}
              spellCheck={false}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring break-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3">
          <Button onClick={activate} disabled={submitting || !key.trim()} className="w-full">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Activate License
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Verdix POS is protected by per-machine licensing. Keys are cryptographically signed and
            cannot be transferred between computers.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
