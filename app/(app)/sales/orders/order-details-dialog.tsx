'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import type { Sale } from '@/lib/types';
import { Printer, FileText, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { getApiUrl } from '@/lib/api-config';
import { formatQuantity } from '@/lib/utils';

export type OrderDialogMode = 'order' | 'delivery-note';

interface OrderDetailsDialogProps {
  order: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: OrderDialogMode;
}

interface POSSettings {
  businessName?: string;
  logoPath?: string;
  address?: string;
  contactNumber?: string;
  tin?: string;
}

export function OrderDetailsDialog({ order, open, onOpenChange, mode = 'order' }: OrderDetailsDialogProps) {
  const [settings, setSettings] = useState<POSSettings>({});
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(getApiUrl('/pos-settings'));
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({
            businessName: data.data.businessName || 'StockPilot',
            logoPath: data.data.logoPath,
            address: data.data.address || '',
            contactNumber: data.data.contactNumber || '',
            tin: data.data.tin || '',
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  if (!order) return null;

  const displayDate = order.orderDate || order.date;
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = Number((order as any).shipping || 0);
  const grandTotal = subtotal + shipping;
  const documentTitle = mode === 'delivery-note' ? 'DELIVERY NOTE' : 'SALES ORDER';

  // Regular Print Function - opens print dialog for the current view
  const handlePrint = () => {
    const printContent = printContentRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printStyles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .logo-section { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .logo-placeholder { width: 80px; height: 80px; border: 2px solid #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .logo-placeholder img { width: 100%; height: 100%; object-fit: cover; }
        .business-name { font-size: 20px; font-weight: bold; text-transform: uppercase; }
        .doc-title { font-size: 32px; font-weight: 900; font-style: italic; color: #333; margin-bottom: 20px; letter-spacing: -1px; }
        .info-table { border-collapse: collapse; margin-left: auto; font-size: 12px; }
        .info-table td { border: 1px solid #ddd; padding: 6px 12px; }
        .info-table td:first-child { background: #f8f9fa; font-weight: bold; width: 140px; }
        .info-table td:last-child { text-align: right; width: 160px; }
        .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0; }
        .address-section h3 { font-size: 13px; font-weight: bold; margin-bottom: 5px; }
        .address-section p { font-size: 13px; color: #333; margin: 2px 0; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 30px 0; }
        .items-table th { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 4px; text-align: left; font-weight: bold; }
        .items-table th:nth-child(2) { text-align: center; }
        .items-table th:nth-child(n+3) { text-align: right; }
        .items-table td { padding: 12px 4px; border-bottom: 1px solid #eee; }
        .items-table td:nth-child(2) { text-align: center; }
        .items-table td:nth-child(n+3) { text-align: right; }
        .items-table td.amount { font-weight: bold; }
        .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
        .terms h3 { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
        .terms p { font-size: 11px; color: #666; }
        .totals { font-size: 12px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold; }
        .totals-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle} - ${order.reference || order.id}</title>
          ${printStyles}
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <div class="logo-placeholder">
                ${settings.logoPath ? `<img src="${settings.logoPath}" alt="Logo">` : '<div style="width:100%;height:100%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:24px">📄</div>'}
              </div>
              <div class="business-name">${settings.businessName || 'StockPilot'}</div>
            </div>
            <div>
              <div class="doc-title">${documentTitle}</div>
              <table class="info-table">
                <tr><td>${mode === 'delivery-note' ? 'Reference Number' : (documentTitle === 'SALES ORDER' ? 'Order Number' : 'Invoice Number')}</td><td>${order.reference || order.id}</td></tr>
                <tr><td>${mode === 'delivery-note' ? 'Date' : (documentTitle === 'SALES ORDER' ? 'Order Date' : 'Invoice Date')}</td><td>${displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : 'N/A'}</td></tr>
                <tr><td>Payment Terms</td><td>${order.paymentMethod || 'CASH'}</td></tr>
                <tr><td>Sales Person</td><td>${order.salesPerson || 'N/A'}</td></tr>
                <tr><td>Due Date</td><td>${order.deliveryDate ? format(new Date(order.deliveryDate), 'MMMM d, yyyy') : (displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : '-')}</td></tr>
              </table>
            </div>
          </div>

          <div class="addresses">
            <div class="address-section">
              <h3>Bill to:</h3>
              <p>${order.customer.name}</p>
              <p>${order.customer.contactNumber || '-'}</p>
            </div>
            <div class="address-section">
              <h3>Ship to:</h3>
              <p>${order.customer.name}</p>
              <p>${order.deliveryAddress || '-'}</p>
              <p>${order.customer.contactNumber || '-'}</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th style="width: 100px">QUANTITY</th>
                <th style="width: 100px">PRICE</th>
                <th style="width: 100px">DISCOUNT</th>
                <th style="width: 100px">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td style="text-transform: uppercase; font-weight: 500;">${item.product.name}</td>
                  <td>\${formatQuantity(item.quantity)} \${(item.product as any).unit || 'pc'}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>0.00</td>
                  <td class="amount">${(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div class="terms">
              <h3>Terms and Conditions</h3>
              <p>${(order as any).notes || (order as any).note || '-'}</p>
            </div>
            <div class="totals">
              <div class="totals-row"><span>SUBTOTAL</span><span>${subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div class="totals-row"><span>SHIPPING</span><span>${shipping.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div class="totals-row"><span>VAT INCLUDED</span><span>0.00</span></div>
              <div class="totals-row grand"><span>GRAND TOTAL</span><span>${grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // POS Invoice Print - Thermal receipt style (58mm/80mm)
  const handlePrintPOSInvoice = () => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;

    const receiptStyles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 12px; 
          width: 80mm; 
          padding: 5mm; 
          background: white; 
          color: black;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .business-name { font-weight: bold; font-size: 14px; }
        .address { font-size: 10px; }
        .dashed { border-top: 1px dashed #000; margin: 8px 0; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0; }
        .info-row { display: flex; justify-content: space-between; font-size: 11px; }
        .items { margin: 10px 0; }
        .item { margin-bottom: 5px; }
        .item-name { font-size: 11px; }
        .item-details { display: flex; justify-content: space-between; font-size: 10px; padding-left: 10px; }
        .totals { margin-top: 10px; }
        .total-row { display: flex; justify-content: space-between; font-size: 11px; }
        .total-row.grand { font-weight: bold; font-size: 14px; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #000; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        @media print { 
          body { width: 80mm; margin: 0; padding: 3mm; }
          @page { size: 80mm auto; margin: 0; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Invoice - ${order.reference || order.id}</title>
          ${receiptStyles}
        </head>
        <body>
          <div class="header">
            <div class="business-name">${settings.businessName || 'StockPilot'}</div>
            ${settings.address ? `<div class="address">${settings.address}</div>` : ''}
            ${settings.contactNumber ? `<div class="address">${settings.contactNumber}</div>` : ''}
            ${settings.tin ? `<div class="address">TIN: ${settings.tin}</div>` : ''}
          </div>

          <div class="dashed"></div>

          <div class="title">${documentTitle}</div>

          <div class="info-row"><span>Order #:</span><span>${order.reference || order.id}</span></div>
          <div class="info-row"><span>Date:</span><span>${displayDate ? format(new Date(displayDate), 'MM/dd/yyyy') : 'N/A'}</span></div>
          <div class="info-row"><span>Sales Person:</span><span>${order.salesPerson || 'N/A'}</span></div>
          <div class="info-row"><span>Customer:</span><span>${order.customer.name}</span></div>

          <div class="dashed"></div>

          <div class="items">
            ${order.items.map(item => `
              <div class="item">
                <div class="item-name">
                  ${item.product.name}
                  ${item.product.barcode ? `<div style="font-size: 11px; color: #000; font-weight: bold; font-family: monospace;">BC: ${item.product.barcode}</div>` : ''}
                </div>
                <div class="item-details">
                  <span>\${formatQuantity(item.quantity)} x ₱\${item.price.toFixed(2)}</span>
                  <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="dashed"></div>

          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>₱${subtotal.toFixed(2)}</span></div>
            ${shipping > 0 ? `<div class="total-row"><span>Shipping:</span><span>₱${shipping.toFixed(2)}</span></div>` : ''}
            <div class="total-row"><span>VAT Included:</span><span>₱0.00</span></div>
            <div class="total-row grand"><span>TOTAL:</span><span>₱${grandTotal.toFixed(2)}</span></div>
          </div>

          <div class="dashed"></div>

          <div class="footer">
            <p>Thank you for your order!</p>
            <p style="margin-top: 5px;">Printed: ${format(new Date(), 'MM/dd/yyyy hh:mm a')}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-none max-w-full w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none m-0 shadow-none">
        <DialogHeader className="flex flex-row items-center justify-between non-printable px-6 py-4 border-b shrink-0">
          <DialogTitle>{mode === 'delivery-note' ? 'Delivery Note' : 'Order Details'}</DialogTitle>
          <DialogDescription className="sr-only">{mode === 'delivery-note' ? 'View and print the delivery note for this order' : 'View and print the sales order details'}</DialogDescription>
        </DialogHeader>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50 non-printable flex justify-center">
          <div ref={printContentRef} className="printable-area space-y-6 p-[20mm] bg-white shadow-xl border w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0">
          {/* Page indicator */}
          <div className="text-xs text-muted-foreground non-printable">1 of 1</div>

          {/* Header Section */}
          <div className="flex justify-between items-start">
            {/* Company Logo & Name (Left side) */}
            <div className="flex flex-col items-start gap-1">
              <div className="h-20 w-20 flex items-center justify-center border-2 border-foreground/10 rounded-full overflow-hidden mb-1">
                {settings.logoPath ? (
                  <img 
                    src={settings.logoPath} 
                    alt="Company Logo" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary flex items-center justify-center">
                    <FileText className="h-10 w-10 text-primary-foreground" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">
                {settings.businessName || 'StockPilot'}
              </h2>
            </div>

            {/* Document Title & Info (Right side) */}
            <div className="text-right">
              <h1 className="text-3xl font-black text-foreground/80 mb-6 italic tracking-tighter">
                {documentTitle}
              </h1>
              <table className="text-xs ml-auto border-collapse">
                <tbody>
                  <tr>
                    <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left w-32">
                      {mode === 'delivery-note' ? 'Reference Number' : (documentTitle === 'SALES ORDER' ? 'Order Number' : 'Invoice Number')}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-200 text-right min-w-[120px]">{order.reference || order.id}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 bg-slate-100 border border-slate-200 font-semibold text-left">
                      {mode === 'delivery-note' ? 'Date' : (documentTitle === 'SALES ORDER' ? 'Order Date' : 'Invoice Date')}
                    </td>
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
                      {order.deliveryDate ? format(new Date(order.deliveryDate), 'MMMM d, yyyy') : (displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : '-')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill To / Ship To Section */}
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
                    <td className="py-3 uppercase font-medium">
                      {item.product.name}
                    </td>
                    <td className="py-3 text-center">
                      {formatQuantity(item.quantity)} {(item.product as any).unit || 'pc'}
                    </td>
                    <td className="py-2 text-right">{item.price.toFixed(2)}</td>
                    <td className="py-2 text-right">0.00</td>
                    <td className="py-2 text-right font-semibold">{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Footer: Terms & Totals */}
          <div className="grid grid-cols-2 gap-8 mt-4">
            {/* Terms and Conditions */}
            <div>
              <h3 className="font-bold text-sm mb-2">Terms and Conditions</h3>
              <p className="text-xs text-muted-foreground">{(order as any).notes || (order as any).note || '-'}</p>
            </div>

            {/* Totals */}
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

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 p-4 border-t non-printable bg-slate-50/50 shrink-0">
          <Button variant="outline" onClick={handlePrint} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handlePrintPOSInvoice} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
            <Printer className="mr-2 h-4 w-4" /> Print POS Invoice
          </Button>
          <Button variant="outline" onClick={handlePrint} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
            <Printer className="mr-2 h-4 w-4" /> Print to template
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-6 font-bold text-xs uppercase tracking-tight bg-white">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
