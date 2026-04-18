'use client';

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ApprovalItem {
  id: string;
  transaction_type: string;
  transaction_data: any;
  status: 'Pending' | 'Approved' | 'Rejected';
  current_step: number;
  created_by: string;
  requester_name: string;
  requester_email: string;
  created_at: string;
  updated_at: string;
  currentStepRole: string;
  currentStepRoleId: string | null;
  history: any[];
  workflow: any[];
}

interface PrintPreviewDialogProps {
  item: ApprovalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintPreviewDialog({ item, open, onOpenChange }: PrintPreviewDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Print Preview</title>');
    // Copy computed styles or just use the same styles from print-approval.ts
    printWindow.document.write(`
      <style>
        @page { size: portrait; margin: 15mm; }
        body { font-family: "Inter", "Segoe UI", Helvetica, Arial, sans-serif; color: #000; line-height: 1.4; font-size: 11pt; margin: 0; padding: 20px; }
        .document-container { max-width: 800px; margin: 0 auto; }
        .doc-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .company-title { margin: 0; font-size: 20pt; font-weight: 800; text-transform: uppercase; }
        .doc-type { margin: 0; font-size: 14pt; font-weight: 600; color: #444; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 25px; }
        .meta-table { width: 100%; border-collapse: collapse; }
        .meta-table td { padding: 4px 0; vertical-align: top; }
        .label { font-weight: 600; font-size: 9pt; color: #555; text-transform: uppercase; width: 130px; }
        .value { font-weight: 500; }
        .id-value { font-family: monospace; font-weight: 700; font-size: 10pt; }
        .section-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; border-bottom: 1pt solid #000; padding-bottom: 5px; margin: 25px 0 12px 0; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table th { text-align: left; padding: 8px; border-bottom: 1.5pt solid #000; font-size: 9pt; text-transform: uppercase; font-weight: 700; }
        .data-table td { padding: 8px; border-bottom: 0.5pt solid #eee; }
        .audit-trail { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .audit-trail th { text-align: left; padding: 4px 8px; border-bottom: 1pt solid #000; font-size: 8pt; color: #666; text-transform: uppercase; }
        .audit-trail td { padding: 6px 8px; border-bottom: 0.5pt solid #f5f5f5; font-size: 9pt; }
        .numeric { text-align: right; font-family: monospace; }
        .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; page-break-inside: avoid; }
        .sig-item { display: flex; flex-direction: column; }
        .sig-name { font-size: 10pt; min-height: 45px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; border-bottom: 1.5pt solid #000; font-weight: 700; text-align: center; }
        .sig-label { font-size: 8pt; color: #555; text-align: center; margin-top: 5px; text-transform: uppercase; font-weight: 600; }
        .footer { border-top: 0.5pt solid #eee; padding-top: 10px; font-size: 8pt; color: #999; text-align: center; margin-top: 50px; }
        .barcode-value { font-family: monospace; font-size: 13pt; font-weight: 700; color: #000; margin-top: 2px; display: block; }
        @media print {
          body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      // Only close if it's not a print preview window we want to keep
      // printWindow.close();
    }, 500);
  };

  const formattedType = item.transaction_type.replace(/_/g, ' ');
  const createdAt = new Date(item.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white text-black">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-secondary/10">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Preview
          </DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 font-bold border-primary/20 text-primary hover:bg-primary/5">
              <Printer className="h-4 w-4" />
              Print Document
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-zinc-100/50">
          <div 
            ref={printRef}
            className="bg-white shadow-2xl mx-auto p-[15mm] min-h-[297mm] w-[210mm] document-container text-black scale-[0.9] origin-top md:scale-100"
            style={{ 
              fontFamily: '"Inter", "Segoe UI", Helvetica, Arial, sans-serif',
              lineHeight: '1.4'
            }}
          >
            {/* Header */}
            <div className="doc-header flex justify-between items-end border-b-2 border-black pb-2 mb-5">
              <div>
                <h1 className="company-title m-0 text-3xl font-black uppercase tracking-tighter">STOCK PILOT</h1>
              </div>
              <div>
                <h2 className="doc-type m-0 text-xl font-semibold text-zinc-600">TRANSACTION AUTHORIZATION</h2>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="meta-grid grid grid-cols-2 gap-10 mb-6">
              <table className="meta-table w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="label font-semibold text-[9pt] text-zinc-500 uppercase w-[130px] py-1">Reference ID</td>
                    <td className="value id-value font-mono font-bold text-[10pt] py-1">{item.id.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td className="label font-semibold text-[9pt] text-zinc-500 uppercase w-[130px] py-1">Transaction</td>
                    <td className="value font-medium py-1">{formattedType}</td>
                  </tr>
                  <tr>
                    <td className="label font-semibold text-[9pt] text-zinc-500 uppercase w-[130px] py-1">Status</td>
                    <td className="value py-1">
                        <span className="font-bold uppercase text-[8pt] border border-black px-1.5 py-0.5">
                            {item.status.toUpperCase()}
                        </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="meta-table w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="label font-semibold text-[9pt] text-zinc-500 uppercase w-[130px] py-1">Date Requested</td>
                    <td className="value font-medium py-1">{format(createdAt, 'yyyy-MM-dd HH:mm')}</td>
                  </tr>
                  <tr>
                    <td className="label font-semibold text-[9pt] text-zinc-500 uppercase w-[130px] py-1">Requester</td>
                    <td className="value font-medium py-1">{item.requester_name || 'SYSTEM ADMIN'}</td>
                  </tr>
                  <tr>
                    <td className="label font-semibold text-[9pt] text-zinc-500 uppercase w-[130px] py-1">Contact</td>
                    <td className="value font-medium py-1 text-zinc-600 text-[9pt]">{item.requester_email || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="section-title text-[10pt] font-bold uppercase border-b border-zinc-300 pb-1 mb-3 mt-6">Record Details</div>
            
            {/* Transaction Specific Tables */}
            {item.transaction_type === 'STOCK_ADJUSTMENT' && (
              <>
                <table className="data-table w-full border-collapse mb-5">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="text-left p-2 text-[9pt] font-bold uppercase w-[35%]">Product Name</th>
                      <th className="text-left p-2 text-[9pt] font-bold uppercase">SKU / Barcode</th>
                      <th className="text-right p-2 text-[9pt] font-bold uppercase">Change</th>
                      <th className="text-right p-2 text-[9pt] font-bold uppercase">Prev Bal</th>
                      <th className="text-right p-2 text-[9pt] font-bold uppercase">New Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-100">
                      <td className="p-2 text-[10pt] font-medium">{item.transaction_data.productName || item.transaction_data.name || 'Unknown Product'}</td>
                      <td className="p-2 text-[10pt]">
                        <div className="font-mono font-bold text-slate-600 text-[9pt]">
                          {item.transaction_data.productSku || item.transaction_data.sku || '-'}
                        </div>
                        <div className="barcode-value font-mono font-bold text-black text-[12pt] mt-1">
                          {item.transaction_data.productBarcode || item.transaction_data.barcode || '-'}
                        </div>
                      </td>
                      <td className="p-2 text-[10pt] font-mono text-right font-bold">
                        {(Number(item.transaction_data.quantity) || 0) > 0 ? '+' : ''}{item.transaction_data.quantity || 0}
                      </td>
                      <td className="p-2 text-[10pt] font-mono text-right">{item.transaction_data.currentStock ?? '-'}</td>
                      <td className="p-2 text-[10pt] font-mono text-right font-bold text-blue-700">
                        {item.transaction_data.currentStock !== undefined 
                            ? (Number(item.transaction_data.currentStock) + Number(item.transaction_data.quantity || 0)) 
                            : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="remarks italic text-zinc-700 text-[10pt]">
                    <strong>Reason for Adjustment:</strong> {item.transaction_data.reason || 'Not documented'}
                </div>
              </>
            )}

            {item.transaction_type === 'STOCK_TRANSFER' && (
              <table className="data-table w-full border-collapse mb-5">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="p-2 text-[9pt] font-bold uppercase w-[35%]">Product Name</th>
                    <th className="p-2 text-[9pt] font-bold uppercase">SKU / Barcode</th>
                    <th className="p-2 text-[9pt] font-bold uppercase">Source</th>
                    <th className="p-2 text-[9pt] font-bold uppercase">Destination</th>
                    <th className="p-2 text-[9pt] font-bold uppercase text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-100">
                    <td className="p-2 text-[10pt] font-medium">{item.transaction_data.productName || 'Multiple Items'}</td>
                    <td className="p-2 text-[10pt]">
                      <div className="font-mono font-bold text-slate-600 text-[9pt]">
                        {item.transaction_data.productSku || item.transaction_data.sku || '-'}
                      </div>
                      <div className="barcode-value font-mono font-bold text-black text-[12pt] mt-1">
                        {item.transaction_data.productBarcode || item.transaction_data.barcode || '-'}
                      </div>
                    </td>
                    <td className="p-2 text-[10pt]">
                       <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[8pt] font-bold border border-amber-100/50">
                        {item.transaction_data.fromWarehouseName || item.transaction_data.sourceWarehouseId}
                       </span>
                    </td>
                    <td className="p-2 text-[10pt]">
                       <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[8pt] font-bold border border-emerald-100/50">
                        {item.transaction_data.toWarehouseName || item.transaction_data.targetWarehouseId}
                       </span>
                    </td>
                    <td className="p-2 text-[10pt] font-mono text-right font-bold text-blue-700">
                      {item.transaction_data.quantity || item.transaction_data.items?.length || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {item.transaction_type === 'STOCK_COUNT' && (
              <>
                <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded text-sm">
                  <strong>Stock Count Reference:</strong> {item.transaction_data.name}
                </div>
                <table className="data-table w-full border-collapse mb-5">
                  <thead>
                    <tr className="border-b border-black text-left">
                      <th className="p-2 text-[9pt] font-bold uppercase w-[35%]">Product Name</th>
                      <th className="p-2 text-[9pt] font-bold uppercase">SKU / Barcode</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right">Expected</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right">Counted</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.transaction_data.items || []).map((it: any, idx: number) => {
                      const variance = (Number(it.counted_quantity) || 0) - (Number(it.snapshot_quantity) || 0);
                      return (
                        <tr key={idx} className="border-b border-zinc-100">
                          <td className="p-2 text-[10pt] font-medium">{it.productName || it.name}</td>
                          <td className="p-2 text-[10pt]">
                            <div className="font-mono font-bold text-slate-600 text-[8pt]">{it.productSku || it.sku || '-'}</div>
                            <div className="barcode-value font-mono font-bold text-black text-[11pt] mt-0.5">{it.productBarcode || it.barcode || '-'}</div>
                          </td>
                          <td className="p-2 text-[10pt] text-right">{it.snapshot_quantity}</td>
                          <td className="p-2 text-[10pt] text-right font-bold">{it.counted_quantity}</td>
                          <td className={`p-2 text-[10pt] text-right font-bold ${variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {variance > 0 ? `+${variance}` : variance}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {item.transaction_data.items && !['STOCK_COUNT', 'STOCK_TRANSFER', 'STOCK_ADJUSTMENT'].includes(item.transaction_type.toUpperCase()) && (
              <>
                <table className="data-table w-full border-collapse mb-2 text-left">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="p-2 text-[9pt] font-bold uppercase w-[35%]">Item Description</th>
                      <th className="p-2 text-[9pt] font-bold uppercase">SKU / Barcode</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right w-[60px]">Qty</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right">Unit Rate</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right">Extended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.transaction_data.items.map((it: any, idx: number) => (
                      <tr key={idx} className="border-b border-zinc-100">
                        <td className="p-2 text-[10pt] font-medium">{it.productName || it.name}</td>
                        <td className="p-2 text-[10pt]">
                           <div className="font-mono font-bold text-slate-600 text-[8pt]">{it.productSku || it.sku || '-'}</div>
                           <div className="barcode-value font-mono font-bold text-black text-[11pt] mt-0.5">{it.productBarcode || it.barcode || '-'}</div>
                        </td>
                        <td className="p-2 text-[10pt] font-mono text-right">{it.quantity}</td>
                        <td className="p-2 text-[10pt] font-mono text-right">
                            {it.cost ? it.cost.toLocaleString() : it.price ? it.price.toLocaleString() : '-'}
                        </td>
                        <td className="p-2 text-[10pt] font-mono text-right font-bold">
                            {(it.cost || it.price) ? ((it.cost || it.price) * it.quantity).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end font-bold text-[11pt] mt-3 uppercase tracking-tight">
                    <span>Grand Total: ₱{(Number(item.transaction_data.total || item.transaction_data.grandTotal || item.transaction_data.total_amount) || 0).toLocaleString()}</span>
                </div>
              </>
            )}

            {/* General items for Stock related types that don't have their own detailed table yet */}
            {item.transaction_data.items && ['STOCK_TRANSFER', 'STOCK_ADJUSTMENT'].includes(item.transaction_type.toUpperCase()) && (
              <>
                <table className="data-table w-full border-collapse mb-2 text-left">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="p-2 text-[9pt] font-bold uppercase w-[40%]">Item Description</th>
                      <th className="p-2 text-[9pt] font-bold uppercase w-[40%]">SKU / Barcode</th>
                      <th className="p-2 text-[9pt] font-bold uppercase text-right w-[20%]">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.transaction_data.items.map((it: any, idx: number) => (
                      <tr key={idx} className="border-b border-zinc-100">
                        <td className="p-2 text-[10pt] font-medium">{it.productName || it.name}</td>
                        <td className="p-2 text-[10pt]">
                           <div className="font-mono font-bold text-slate-600 text-[8pt]">{it.productSku || it.sku || '-'}</div>
                           <div className="barcode-value font-mono font-bold text-black text-[11pt] mt-0.5">{it.productBarcode || it.barcode || '-'}</div>
                        </td>
                        <td className="p-2 text-[10pt] font-mono text-right">{it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="section-title text-[10pt] font-bold uppercase border-b border-zinc-300 pb-1 mb-3 mt-8">Approval Audit Trail</div>
            <table className="audit-trail w-full border-collapse mb-5">
              <thead>
                <tr className="text-left">
                  <th className="p-2 text-[8pt] text-zinc-500 uppercase w-[10%]">Step</th>
                  <th className="p-2 text-[8pt] text-zinc-500 uppercase w-[20%]">Level</th>
                  <th className="p-2 text-[8pt] text-zinc-500 uppercase w-[40%]">Action / Authorized By</th>
                  <th className="p-2 text-[8pt] text-zinc-500 uppercase w-[30%] text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {item.workflow.map((step, idx) => {
                  const historyItem = item.history.find(h => h.step_number === step.step_order);
                  const isCurrent = item.status === 'Pending' && item.current_step === step.step_order;
                  return (
                    <tr key={idx} className="border-b border-zinc-50">
                      <td className="p-2 text-[9pt]">{step.step_order}</td>
                      <td className="p-2 text-[9pt] font-semibold">{step.role_name}</td>
                      <td className="p-2 text-[9pt]">
                        {historyItem ? (
                          <>
                            <span className="font-bold uppercase text-[8pt] inline-block mr-2">{historyItem.action}</span>
                            <span>{historyItem.userName || 'Authorized Signature'}</span>
                            {historyItem.notes && (
                                <div className="text-[8pt] text-zinc-500 mt-0.5 italic">Note: {historyItem.notes}</div>
                            )}
                          </>
                        ) : isCurrent ? (
                          <em className="text-zinc-400">CURRENTLY PENDING</em>
                        ) : (
                          <span className="text-zinc-200">AWAITING PREVIOUS</span>
                        )}
                      </td>
                      <td className="p-2 text-[9pt] text-right text-zinc-500">
                        {historyItem ? format(new Date(historyItem.created_at), 'yyyy-MM-dd HH:mm') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="signatures-grid grid grid-cols-2 gap-12 mt-16">
              <div className="sig-item">
                <div className="sig-name min-h-[45px] border-b border-black flex items-end justify-center font-bold text-[10pt] pb-1">
                    {item.requester_name.toUpperCase()}
                </div>
                <div className="sig-label text-center text-[8pt] text-zinc-500 mt-1 uppercase font-semibold">Prepared By / Requester Signature</div>
              </div>
              
              {item.workflow.map((step, idx) => {
                const approver = item.history.find(h => h.step_number === step.step_order && h.action === 'Approved');
                return (
                  <div key={idx} className="sig-item">
                    <div className="sig-name min-h-[45px] border-b border-black flex items-end justify-center font-bold text-[10pt] pb-1">
                        {approver ? approver.userName.toUpperCase() : ''}
                    </div>
                    <div className="sig-label text-center text-[8pt] text-zinc-500 mt-1 uppercase font-semibold">
                        {step.role_name.toUpperCase()} / Authorized Signature
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="footer mt-12 pt-4 border-t border-zinc-100 text-[8pt] text-zinc-400 text-center">
                OFFICIAL DOCUMENT - STOCK PILOT ERP SYSTEM - REF: {item.id}<br />
                Printed: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')} (EST)
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-secondary/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close Preview</Button>
          <Button onClick={handlePrint} className="gap-2 font-bold px-8">
            <Printer className="h-4 w-4" />
            Print Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
