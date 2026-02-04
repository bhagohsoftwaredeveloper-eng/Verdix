'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import type { Sale } from '@/lib/types';
import { Printer, FileText, X } from 'lucide-react';
import { Logo } from '@/components/logo';

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
        const response = await fetch('/api/pos-settings');
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
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .company { display: flex; flex-direction: column; gap: 8px; }
        .company-logo { width: 64px; height: 64px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }
        .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
        .doc-title { font-size: 24px; font-weight: bold; color: #666; margin-bottom: 16px; }
        .info-table { margin-left: auto; font-size: 14px; }
        .info-table td { padding: 4px 12px; }
        .info-table td:first-child { background: #f0f0f0; font-weight: 500; }
        .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin: 24px 0; }
        .address-section h3 { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
        .address-section p { font-size: 14px; color: #666; margin: 2px 0; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 24px 0; }
        .items-table th { border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 8px 4px; text-align: left; font-weight: 600; }
        .items-table th:nth-child(2) { text-align: center; }
        .items-table th:nth-child(n+3) { text-align: right; }
        .items-table td { padding: 8px 4px; border-bottom: 1px solid #eee; }
        .items-table td:nth-child(2) { text-align: center; }
        .items-table td:nth-child(n+3) { text-align: right; }
        .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; }
        .terms h3 { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
        .terms p { font-size: 12px; color: #666; }
        .totals { font-size: 14px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .totals-row.grand { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
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
            <div class="company">
              <div class="company-logo">📄</div>
              <div class="company-name">${settings.businessName || 'StockPilot'}</div>
            </div>
            <div>
              <div class="doc-title">${documentTitle}</div>
              <table class="info-table">
                <tr><td>Order Number</td><td>${order.reference || order.id}</td></tr>
                <tr><td>Order Date</td><td>${displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : 'N/A'}</td></tr>
                <tr><td>Payment Terms</td><td>${order.paymentMethod || '-'}</td></tr>
                <tr><td>Delivery Date</td><td>${order.deliveryDate ? format(new Date(order.deliveryDate), 'MMMM d, yyyy') : '-'}</td></tr>
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
                <th>QUANTITY</th>
                <th>PRICE</th>
                <th>DISCOUNT</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>₱${item.price.toFixed(2)}</td>
                  <td>0.00</td>
                  <td>₱${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <div class="footer">
            <div class="terms">
              <h3>Terms and Conditions</h3>
              <p>${(order as any).notes || (order as any).note || '-'}</p>
            </div>
            <div class="totals">
              <div class="totals-row"><span>SUBTOTAL</span><span>₱${subtotal.toFixed(2)}</span></div>
              <div class="totals-row"><span>SHIPPING</span><span>₱${shipping.toFixed(2)}</span></div>
              <div class="totals-row"><span>VAT INCLUDED</span><span>₱0.00</span></div>
              <div class="totals-row grand"><span>GRAND TOTAL</span><span>₱${grandTotal.toFixed(2)}</span></div>
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
          <div class="info-row"><span>Customer:</span><span>${order.customer.name}</span></div>

          <div class="dashed"></div>

          <div class="items">
            ${order.items.map(item => `
              <div class="item">
                <div class="item-name">${item.product.name}</div>
                <div class="item-details">
                  <span>${item.quantity} x ₱${item.price.toFixed(2)}</span>
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
      <DialogContent className="max-w-3xl max-h-none overflow-visible print:max-w-none print:shadow-none">
        <DialogHeader className="flex flex-row items-center justify-between non-printable">
          <DialogTitle>{mode === 'delivery-note' ? 'Delivery Note' : 'Order Detail'}</DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div ref={printContentRef} className="printable-area space-y-6 p-2">
          {/* Page indicator */}
          <div className="text-xs text-muted-foreground non-printable">1 of 1</div>

          {/* Header Section */}
          <div className="flex justify-between items-start">
            {/* Company Logo & Name */}
            <div className="flex flex-col items-start gap-2">
              {settings.logoPath ? (
                <img 
                  src={settings.logoPath} 
                  alt="Company Logo" 
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary-foreground" />
                </div>
              )}
              <h2 className="text-lg font-bold uppercase tracking-wide">
                {settings.businessName || 'StockPilot'}
              </h2>
            </div>

            {/* Document Title & Info */}
            <div className="text-right">
              <h1 className="text-2xl font-bold text-muted-foreground mb-4">
                {documentTitle}
              </h1>
              <table className="text-sm ml-auto">
                <tbody>
                  <tr>
                    <td className="px-3 py-1 bg-muted font-medium text-left">Order Number</td>
                    <td className="px-3 py-1 text-right">{order.reference || order.id}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 bg-muted font-medium text-left">Order Date</td>
                    <td className="px-3 py-1 text-right">
                      {displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 bg-muted font-medium text-left">Payment Terms</td>
                    <td className="px-3 py-1 text-right">{order.paymentMethod || '-'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 bg-muted font-medium text-left">Delivery Date</td>
                    <td className="px-3 py-1 text-right">
                      {order.deliveryDate ? format(new Date(order.deliveryDate), 'MMMM d, yyyy') : '-'}
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
          <div className="mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-foreground/20">
                  <th className="py-2 text-left font-semibold">DESCRIPTION</th>
                  <th className="py-2 text-center font-semibold">QUANTITY</th>
                  <th className="py-2 text-right font-semibold">PRICE</th>
                  <th className="py-2 text-right font-semibold">DISCOUNT</th>
                  <th className="py-2 text-right font-semibold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b border-foreground/10">
                    <td className="py-2">{item.product.name}</td>
                    <td className="py-2 text-center">
                      {item.quantity} {(item.product as any).unit || 'pc'}
                    </td>
                    <td className="py-2 text-right">₱{item.price.toFixed(2)}</td>
                    <td className="py-2 text-right">0.00</td>
                    <td className="py-2 text-right">₱{(item.price * item.quantity).toFixed(2)}</td>
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
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">SUBTOTAL</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">SHIPPING</span>
                <span>₱{shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">VAT INCLUDED</span>
                <span>₱0.00</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>GRAND TOTAL</span>
                <span>₱{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 mt-6 pt-4 border-t non-printable">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handlePrintPOSInvoice}>
            <Printer className="mr-2 h-4 w-4" /> Print POS Invoice
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print to template
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
