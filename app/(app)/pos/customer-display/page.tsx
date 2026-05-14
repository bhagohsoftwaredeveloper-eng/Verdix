'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-config';
import { CustomerDisplayEvent } from '@/hooks/use-customer-display';

const CHANNEL_NAME = 'pos-customer-display';
const IDLE_TIMEOUT_MS = 60_000;

type Screen =
  | { kind: 'idle' }
  | { kind: 'cart'; items: any[]; subtotal: number; discount: number; total: number; currency: string }
  | { kind: 'payment'; total: number; tendered: number; change: number; currency: string }
  | { kind: 'complete'; change: number; orNumber: string; currency: string };

interface DisplaySettings {
  message: string;
  showLogo: boolean;
  logoPath: string | null;
  businessName: string;
}

function fmt(n: number, currency = '₱') {
  return `${currency}${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}

function IdleScreen({ settings }: { settings: DisplaySettings }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-white select-none">
      {settings.showLogo && settings.logoPath && (
        <img
          src={settings.logoPath}
          alt={settings.businessName}
          className="max-h-32 max-w-xs object-contain drop-shadow-lg"
        />
      )}
      <h1 className="text-5xl font-bold tracking-tight text-center px-8 drop-shadow">
        {settings.message || 'Welcome!'}
      </h1>
      <p className="text-2xl font-light opacity-80">{settings.businessName}</p>
      <div className="text-4xl font-mono opacity-60 mt-4">
        <Clock />
      </div>
    </div>
  );
}

function CartScreen({ screen }: { screen: Extract<Screen, { kind: 'cart' }> }) {
  const gross = screen.subtotal;
  const discountAmt = gross - screen.total;

  return (
    <div className="flex flex-col h-full text-white select-none">
      <div className="px-8 py-4 bg-white/10 backdrop-blur-sm">
        <h2 className="text-2xl font-semibold tracking-wide">Current Order</h2>
      </div>

      <div className="flex-1 overflow-auto px-8 py-4 space-y-2">
        {screen.items.map((item, i) => {
          const lineGross = item.price * item.quantity;
          const lineDiscount = (lineGross * item.discount) / 100;
          const lineTotal = lineGross - lineDiscount;
          return (
            <div key={i} className="flex items-center justify-between py-3 border-b border-white/20">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-lg font-medium truncate">{item.name}</p>
                <p className="text-sm opacity-60">
                  {fmt(item.price, screen.currency)} × {item.quantity}
                  {item.discount > 0 && (
                    <span className="ml-2 text-yellow-300">-{item.discount}%</span>
                  )}
                </p>
              </div>
              <p className="text-xl font-semibold font-mono shrink-0">
                {fmt(lineTotal, screen.currency)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="px-8 py-6 bg-white/10 backdrop-blur-sm space-y-2">
        <div className="flex justify-between text-lg opacity-80">
          <span>Subtotal</span>
          <span className="font-mono">{fmt(gross, screen.currency)}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between text-lg text-yellow-300">
            <span>Discount</span>
            <span className="font-mono">- {fmt(discountAmt, screen.currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-4xl font-bold pt-2 border-t border-white/30">
          <span>TOTAL</span>
          <span className="font-mono">{fmt(screen.total, screen.currency)}</span>
        </div>
      </div>
    </div>
  );
}

function PaymentScreen({ screen }: { screen: Extract<Screen, { kind: 'payment' }> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white gap-10 select-none">
      <div className="text-center space-y-2">
        <p className="text-2xl opacity-70 uppercase tracking-widest">Amount Due</p>
        <p className="text-7xl font-bold font-mono drop-shadow-lg">
          {fmt(screen.total, screen.currency)}
        </p>
      </div>
      <div className="text-center space-y-2">
        <p className="text-2xl opacity-70 uppercase tracking-widest">Tendered</p>
        <p className="text-5xl font-semibold font-mono">
          {fmt(screen.tendered, screen.currency)}
        </p>
      </div>
      {screen.change > 0 && (
        <div className="text-center space-y-1">
          <p className="text-xl opacity-70 uppercase tracking-widest">Change</p>
          <p className="text-4xl font-bold text-green-300 font-mono">
            {fmt(screen.change, screen.currency)}
          </p>
        </div>
      )}
    </div>
  );
}

function CompleteScreen({ screen }: { screen: Extract<Screen, { kind: 'complete' }> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white gap-8 select-none">
      <div className="text-center space-y-3">
        <p className="text-3xl opacity-70 uppercase tracking-widest">Change Due</p>
        <p className="text-9xl font-bold font-mono text-green-300 drop-shadow-2xl">
          {fmt(screen.change, screen.currency)}
        </p>
      </div>
      <div className="mt-6 text-center space-y-1">
        <p className="text-4xl font-bold tracking-wide">Thank You!</p>
        {screen.orNumber && (
          <p className="text-xl opacity-60">OR # {screen.orNumber}</p>
        )}
      </div>
    </div>
  );
}

export default function CustomerDisplayPage() {
  const [screen, setScreen] = useState<Screen>({ kind: 'idle' });
  const [settings, setSettings] = useState<DisplaySettings>({
    message: 'Welcome! Thank you for shopping.',
    showLogo: true,
    logoPath: null,
    businessName: '',
  });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setScreen({ kind: 'idle' });
    }, IDLE_TIMEOUT_MS);
  }, []);

  // Fetch settings once on mount
  useEffect(() => {
    fetch(getApiUrl('/pos-settings'))
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setSettings({
            message: result.data.customerDisplayMessage || 'Welcome! Thank you for shopping.',
            showLogo: result.data.customerDisplayShowLogo !== false,
            logoPath: result.data.logoPath || null,
            businessName: result.data.businessName || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Listen for events from POS and broadcast READY so POS can replay last state
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    // Tell POS we're ready — it will re-send the last cart/idle event
    channel.postMessage({ type: 'READY' });

    channel.onmessage = (event: MessageEvent<CustomerDisplayEvent>) => {
      const data = event.data;

      switch (data.type) {
        case 'IDLE':
          setScreen({ kind: 'idle' });
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          break;

        case 'CART_UPDATE':
          setScreen({
            kind: 'cart',
            items: data.items,
            subtotal: data.subtotal,
            discount: data.discount,
            total: data.total,
            currency: data.currency,
          });
          resetIdleTimer();
          break;

        case 'PAYMENT_START':
          setScreen({
            kind: 'payment',
            total: data.total,
            tendered: data.tendered,
            change: Math.max(0, data.tendered - data.total),
            currency: data.currency,
          });
          resetIdleTimer();
          break;

        case 'PAYMENT_UPDATE':
          // Live update as cashier types the tendered amount
          setScreen((prev) => {
            if (prev.kind !== 'payment') return prev;
            return {
              ...prev,
              tendered: data.tendered,
              change: data.change,
            };
          });
          break;

        case 'PAYMENT_COMPLETE':
          setScreen({
            kind: 'complete',
            change: data.change,
            orNumber: data.orNumber,
            currency: data.currency,
          });
          // Auto-return to idle after 5 seconds
          setTimeout(() => setScreen({ kind: 'idle' }), 5000);
          break;

        case 'SETTINGS':
          setSettings({
            message: data.message,
            showLogo: data.showLogo,
            logoPath: data.logoPath,
            businessName: data.businessName,
          });
          break;
      }
    };

    return () => {
      channel.close();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const bgClass =
    screen.kind === 'complete'
      ? 'bg-gradient-to-br from-emerald-700 to-emerald-900'
      : screen.kind === 'payment'
      ? 'bg-gradient-to-br from-blue-700 to-blue-900'
      : screen.kind === 'cart'
      ? 'bg-gradient-to-br from-slate-800 to-slate-900'
      : 'bg-gradient-to-br from-primary/80 to-primary';

  return (
    <div className={`fixed inset-0 ${bgClass} transition-colors duration-700`}>
      {screen.kind === 'idle' && <IdleScreen settings={settings} />}
      {screen.kind === 'cart' && <CartScreen screen={screen} />}
      {screen.kind === 'payment' && <PaymentScreen screen={screen} />}
      {screen.kind === 'complete' && <CompleteScreen screen={screen} />}
    </div>
  );
}
