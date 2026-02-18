import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { SaleItem } from './page';
import { Customer } from '@/lib/types';

import { SystemSettings } from '@/lib/types';

interface ReceiptViewProps {
    saleDetails: {
        items: SaleItem[];
        customer: Customer | null;
        totalDue: number;
        change: number;
        paymentMethod: string;
        orderNumber?: string;
        amountTendered?: number;
        transactionDate?: Date; // Add support for date if available
        cashierName?: string;
    };
    settings?: SystemSettings | null;
}

export const ReceiptView = forwardRef<HTMLDivElement, ReceiptViewProps>(({ saleDetails, settings }, ref) => {
    const { items, customer, totalDue, change, paymentMethod } = saleDetails;
    const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount || 0)) / 100, 0);
    const vatAmount = (totalDue / 1.12) * 0.12;
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const currentDate = saleDetails.transactionDate ? new Date(saleDetails.transactionDate) : new Date();

    return (
        <div ref={ref} className="printable-area bg-white text-black p-4 text-[10px] font-mono font-bold w-[58mm] mx-auto print:w-auto print:ml-1 print:mr-6 leading-tight">
             {/* Print specific styles can be added here or via global CSS if needed, 
                 but react-to-print usually handles current styles well. 
                 We enforce black text and white background. */}
            <div className="text-center mb-4">
                <div className="font-bold text-lg mb-1">{settings?.businessName || 'STOCK PILOT'}</div>
                <div>{settings?.address || 'General Merchandise'}</div>
                {settings?.contactNumber && <div>{settings.contactNumber}</div>}
                {settings?.tin && <div>VAT REG TIN: {settings.tin}</div>}
                <div className="text-[10px]">{format(currentDate, 'PP p')}</div>
            </div>

            <div className="mb-2 border-b border-dashed border-black pb-2">
                <div>Sale Details</div>
                <div className="font-bold">Order #: {saleDetails.orderNumber || 'N/A'}</div>
                <div>Cust: {customer?.name || 'Walk-in'}</div>
                <div>Cashier: {saleDetails.cashierName || 'Admin'}</div>
            </div>

            <div className="mb-2">
                <div className="flex justify-between font-bold border-b border-black mb-1 text-[10px]">
                    <span className="w-10 text-left">Qty</span>
                    <span className="flex-1 text-left px-1">Item</span>
                    <span className="w-12 text-right">Amt</span>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="flex justify-between mb-1 items-start text-[10px]">
                        <span className="w-10 text-left">{item.quantity} {item.unitOfMeasure}</span>
                        <span className="flex-1 text-left px-1">
                            <div>{item.name}</div>
                            {item.discount > 0 && <div className="text-[9px] italic">Disc: {item.discount}%</div>}
                            <div className="text-black">@ {formatCurrency(item.price)}</div>
                        </span>
                        <span className="w-12 text-right">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subTotal)}</span>
                </div>
                {totalDiscount > 0 && (
                    <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(totalDue)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span>VAT (12%):</span>
                    <span>{formatCurrency(vatAmount)}</span>
                </div>
            </div>

            <div className="border-t border-black my-2"></div>

            <div className="space-y-1">
                <div className="flex justify-between font-bold">
                    <span>{paymentMethod}:</span>
                    <span>{paymentMethod === 'CASH' ? formatCurrency(saleDetails.amountTendered || (totalDue + change)) : formatCurrency(totalDue)}</span>
                </div>
                {paymentMethod === 'CASH' && (
                        <div className="flex justify-between">
                        <span>Change:</span>
                        <span>{formatCurrency(change)}</span>
                    </div>
                )}
            </div>
                <div className="text-center mt-6">
                <div>Thank you for your purchase!</div>
                <div style={{fontSize: '9px'}}>Pos System by Bhagoh</div>
            </div>
        </div>
    );
});

ReceiptView.displayName = 'ReceiptView';
