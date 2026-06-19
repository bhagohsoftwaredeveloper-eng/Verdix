'use client';

import { Separator } from '@/components/ui/separator';
import { type PurchaseOrder } from '@/lib/types';

interface PoSummaryProps {
  order: PurchaseOrder;
}

export function PoSummary({ order }: PoSummaryProps) {
  const subtotal = order.items.reduce((acc, item) => acc + item.cost * item.quantity, 0);

  return (
    <div className="grid grid-cols-2 gap-12 pt-4">
      {/* Notes */}
      <div className="bg-zinc-100 p-6 rounded-lg border border-zinc-300 h-fit space-y-4">
        <p className="text-xs font-bold text-zinc-900 uppercase">Notes / Instructions</p>
        <p className="text-sm text-zinc-800 italic font-medium">
          Please ensure all items are sealed and in good condition upon delivery. Call ahead 24
          hours before delivery.
        </p>
      </div>

      {/* Totals + Signatures */}
      <div className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center text-zinc-700">
            <span>Subtotal</span>
            <span className="font-bold text-zinc-900">
              ₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-700">
            <span>Shipping Fee</span>
            <span className="font-bold text-zinc-900">
              ₱{(order.shippingFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-700">
            <span>VAT (12%)</span>
            <span className="font-bold text-zinc-900">
              ₱{(order.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <Separator className="my-2 bg-zinc-400" />
          <div className="flex justify-between items-center text-xl font-black bg-zinc-900 p-3 rounded text-white mt-4">
            <span>Grand Total</span>
            <span>
              ₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="border-b-2 border-zinc-400 h-8" />
            <p className="text-xs text-center text-zinc-900 font-bold uppercase tracking-wide">
              Approved By
            </p>
          </div>
          <div className="space-y-2">
            <div className="border-b-2 border-zinc-400 h-8" />
            <p className="text-xs text-center text-zinc-900 font-bold uppercase tracking-wide">
              Received By
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
