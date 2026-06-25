'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlaskConical, SendToBack, ShoppingCart, Ban } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userName?: string;
};

export function FrontlinerModePrompt({ open, onOpenChange, userName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0">
        {/* Top accent banner */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-violet-200">Pharmacy Mode</p>
              <p className="text-base font-bold leading-tight">Frontliner Account</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-semibold">
              {userName ? `Welcome, ${userName}!` : 'Welcome!'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This account is set up for <span className="font-semibold text-violet-600 dark:text-violet-400">Pharmacy Frontliner</span> mode only.
            </DialogDescription>
          </DialogHeader>

          {/* What you can / cannot do */}
          <div className="space-y-2">
            <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5">
              <SendToBack className="h-4 w-4 text-emerald-600 shrink-0 mt-px" />
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">You can tag orders</p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500 mt-0.5">Add items to cart and send them to the cashier queue.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2.5">
              <Ban className="h-4 w-4 text-rose-500 shrink-0 mt-px" />
              <div>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Payment is restricted</p>
                <p className="text-[11px] text-rose-500/80 dark:text-rose-500 mt-0.5">Tender / payment processing is handled by the cashier terminal.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-3 py-2.5">
              <ShoppingCart className="h-4 w-4 text-violet-600 shrink-0 mt-px" />
              <div>
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Cashier handles checkout</p>
                <p className="text-[11px] text-violet-600/80 dark:text-violet-500 mt-0.5">Your queued orders will appear on the cashier screen to be tendered.</p>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => onOpenChange(false)}
          >
            Got it, start tagging
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
