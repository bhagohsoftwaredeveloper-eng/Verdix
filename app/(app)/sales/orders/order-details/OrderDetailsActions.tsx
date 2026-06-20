'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

type Props = {
  onPrint: () => void;
  onPrintPOSInvoice: () => void;
  onClose: () => void;
};

export function OrderDetailsActions({ onPrint, onPrintPOSInvoice, onClose }: Props) {
  return (
    <div className="flex justify-center gap-3 p-4 border-t non-printable bg-slate-50/50 shrink-0">
      <Button variant="outline" onClick={onPrint} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
        <Printer className="mr-2 h-4 w-4" /> Print
      </Button>
      <Button variant="outline" onClick={onPrintPOSInvoice} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
        <Printer className="mr-2 h-4 w-4" /> Print POS Invoice
      </Button>
      <Button variant="outline" onClick={onPrint} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
        <Printer className="mr-2 h-4 w-4" /> Print to template
      </Button>
      <Button variant="outline" onClick={onClose} className="h-10 px-6 font-bold text-xs uppercase tracking-tight bg-white">
        Close
      </Button>
    </div>
  );
}
