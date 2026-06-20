'use client';

import { Button } from '@/components/ui/button';
import { Printer, User, Clock, Ban, Undo, Files, BookOpen, Search, Banknote, ArrowRight } from 'lucide-react';

function CashTransferIcon({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className ?? ''}`}>
      <Banknote className="h-full w-full" />
      <ArrowRight className="absolute -bottom-1 -right-1 h-3 w-3 stroke-[3]" />
    </span>
  );
}

type Props = {
  handleOpenEndShift: () => void;
  setIsCashTransferOpen: (v: boolean) => void;
  setIsCustomerSelectOpen: (v: boolean) => void;
  handleOpenLoyalty: () => void;
  setIsRecentSalesOpen: (v: boolean) => void;
  setIsVoidSalesOpen: (v: boolean) => void;
  setIsReturnSalesOpen: (v: boolean) => void;
  handleOpenOverallReading: () => void;
  setIsZReadingOpen: (v: boolean) => void;
  setIsPriceInquiryOpen: (v: boolean) => void;
};

export function PosFooterActions({
  handleOpenEndShift, setIsCashTransferOpen, setIsCustomerSelectOpen, handleOpenLoyalty,
  setIsRecentSalesOpen, setIsVoidSalesOpen, setIsReturnSalesOpen, handleOpenOverallReading,
  setIsZReadingOpen, setIsPriceInquiryOpen,
}: Props) {
  const footerActions = [
    { icon: Printer, label: 'Cash count', shortcut: 'Ctrl+1', action: handleOpenEndShift, tint: 'text-emerald-600' },
    { icon: CashTransferIcon, label: 'Cash transfer', shortcut: 'Ctrl+2', action: () => setIsCashTransferOpen(true), tint: 'text-emerald-600' },
    { icon: User, label: 'Customer', shortcut: 'Ctrl+3', action: () => setIsCustomerSelectOpen(true), tint: 'text-sky-600' },
    { icon: User, label: 'Loyalty', shortcut: 'Ctrl+4', action: handleOpenLoyalty, tint: 'text-sky-600' },
    { icon: Clock, label: 'Recent Sales', shortcut: 'Ctrl+5', action: () => setIsRecentSalesOpen(true), tint: 'text-amber-600' },
    { icon: Ban, label: 'Post Void', shortcut: 'Ctrl+6', action: () => setIsVoidSalesOpen(true), tint: 'text-rose-600' },
    { icon: Undo, label: 'Merch Credit', shortcut: 'Ctrl+7', action: () => setIsReturnSalesOpen(true), tint: 'text-amber-600' },
    { icon: Files, label: 'OVERALL', shortcut: 'Ctrl+8', action: handleOpenOverallReading, tint: 'text-purple-600' },
    { icon: BookOpen, label: 'Z-READING', shortcut: 'Ctrl+0', action: () => setIsZReadingOpen(true), tint: 'text-purple-600' },
    { icon: Search, label: 'Price Inquiry', shortcut: 'Ctrl+P', action: () => setIsPriceInquiryOpen(true), tint: 'text-fuchsia-600' },
  ];

  return (
    <div className="grid grid-cols-10 gap-2 shrink-0">
      {footerActions.map(({ icon: Icon, label, shortcut, action, tint }) => (
        <Button
          key={label}
          variant="ghost"
          onClick={action}
          className="group flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-background px-1 text-xs font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
        >
          <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${tint}`} />
          <span className="leading-tight text-center text-[11px] text-foreground">{label}</span>
          {shortcut && <kbd className="rounded bg-muted px-1 py-px text-[8px] font-mono font-semibold leading-none text-muted-foreground">{shortcut}</kbd>}
        </Button>
      ))}
    </div>
  );
}
