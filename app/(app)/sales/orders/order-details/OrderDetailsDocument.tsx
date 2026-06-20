'use client';

import { RefObject } from 'react';
import { Separator } from '@/components/ui/separator';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatQuantity } from '@/lib/utils';
import type { Sale } from '@/lib/types';
import type { POSSettings, OrderDialogMode } from './order-details-types';

type Props = {
  order: Sale;
  settings: POSSettings;
  mode: OrderDialogMode;
  documentTitle: string;
  displayDate: string | null | undefined;
  subtotal: number;
  shipping: number;
  grandTotal: number;
  printContentRef: RefObject<HTMLDivElement>;
};

export function OrderDetailsDocument({
  order, settings, mode, documentTitle,
  displayDate, subtotal, shipping, grandTotal, printContentRef,
}: Props) {
  const labelRef = mode === 'delivery-note' ? 'Reference Number'
    : documentTitle === 'SALES ORDER' ? 'Order Number' : 'Invoice Number';
  const labelDate = mode === 'delivery-note' ? 'Date'
    : documentTitle === 'SALES ORDER' ? 'Order Date' : 'Invoice Date';

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50 non-printable flex justify-center">
      <div
        ref={printContentRef}
        className="printable-area space-y-6 p-[20mm] bg-white shadow-xl border w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0"
      >
        <div className="text-xs text-muted-foreground non-printable">1 of 1</div>

        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col items-start gap-1">
            <div className="h-20 w-20 flex items-center justify-center border-2 border-foreground/10 rounded-full overflow-hidden mb-1">
              {settings.logoPath ? (
                <img src={settings.logoPath} alt="Company Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center">
                  <FileText className="h-10 w-10 text-primary-foreground" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight">
              {settings.businessName || 'verdix'}
            </h2>
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-black text-foreground/80 mb-6 italic tracking-tighter">
              {documentTitle}
            </h1>
            <table className="text-xs ml-auto border-collapse">
              <tbody>
                <tr>
                  <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left w-32">{labelRef}</td>
                  <td className="px-3 py-1.5 border border-slate-200 text-right min-w-[120px]">{order.reference || order.id}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left">{labelDate}</td>
                  <td className="px-3 py-1.5 border border-slate-200 text-right">
                    {displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left">Payment Terms</td>
                  <td className="px-3 py-1.5 border border-slate-200 text-right uppercase">{order.paymentMethod || 'CASH'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left">Sales Person</td>
                  <td className="px-3 py-1.5 border border-slate-200 text-right uppercase">{order.salesPerson || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left">Due Date</td>
                  <td className="px-3 py-1.5 border border-slate-200 text-right">
                    {order.deliveryDate
                      ? format(new Date(order.deliveryDate), 'MMMM d, yyyy')
                      : displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div>
            <h3 className="font-bold text-sm mb-1">Bill to:</h3>
            <p className="text-sm">{order.customer.name}</p>
            <p className="text-sm text-muted-foreground">{order.customer.contactNumber || '-'}</p>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Ship to:</h3>
            <p className="text-sm">{order.customer.name}</p>
            <p className="text-sm text-muted-foreground">{order.deliveryAddress || '-'}</p>
            <p className="text-sm text-muted-foreground">{order.customer.contactNumber || '-'}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-8">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-foreground/30">
                <th className="py-2.5 text-left font-bold tracking-wider">DESCRIPTION</th>
                <th className="py-2.5 text-center font-bold tracking-wider w-32">QUANTITY</th>
                <th className="py-2.5 text-right font-bold tracking-wider w-32">PRICE</th>
                <th className="py-2.5 text-right font-bold tracking-wider w-32">DISCOUNT</th>
                <th className="py-2.5 text-right font-bold tracking-wider w-32">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-foreground/5">
                  <td className="py-3 uppercase font-medium">{item.product.name}</td>
                  <td className="py-3 text-center">{formatQuantity(item.quantity)} {(item.product as any).unit || 'pc'}</td>
                  <td className="py-2 text-right">{item.price.toFixed(2)}</td>
                  <td className="py-2 text-right">0.00</td>
                  <td className="py-2 text-right font-semibold">
                    {(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Separator />

        {/* Footer: Terms & Totals */}
        <div className="grid grid-cols-2 gap-8 mt-4">
          <div>
            <h3 className="font-bold text-sm mb-2">Terms and Conditions</h3>
            <p className="text-xs text-muted-foreground">{(order as any).notes || (order as any).note || '-'}</p>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">SUBTOTAL</span>
              <span className="font-bold">{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">SHIPPING</span>
              <span>{shipping.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">VAT INCLUDED</span>
              <span>0.00</span>
            </div>
            <div className="flex justify-between font-black text-sm border-t-2 border-foreground pt-2 mt-2">
              <span>GRAND TOTAL</span>
              <span>{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
