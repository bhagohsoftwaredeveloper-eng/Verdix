import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { SaleItem } from '@/lib/types';
import { SystemSettings } from '@/lib/types';

interface CreditSlipViewProps {
    creditDetails: {
        originalSoNumber: string;
        customerName: string;
        date: string;
        cashierName: string;
        items: SaleItem[];
        totalAmount: number;
    };
    settings?: SystemSettings | null;
}

export const CreditSlipView = forwardRef<HTMLDivElement, CreditSlipViewProps>(({ creditDetails, settings }, ref) => {
    const { items, customerName, totalAmount, originalSoNumber, date, cashierName } = creditDetails;
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const currentDate = date ? new Date(date) : new Date();

    return (
        <div ref={ref} className="printable-area bg-white text-black p-4 text-[10px] font-mono font-bold w-[58mm] mx-auto print:w-auto print:ml-1 print:mr-6 leading-tight">
            <div className="text-center mb-4">
                <div className="font-bold text-lg mb-1">{settings?.businessName || 'STOCK PILOT'}</div>
                <div>{settings?.address || 'General Merchandise'}</div>
                {settings?.contactNumber && <div>{settings.contactNumber}</div>}
                {settings?.tin && <div>VAT REG TIN: {settings.tin}</div>}
                <div className="text-[10px]">{format(new Date(), 'PP p')}</div>
            </div>

            <div className="text-center mb-2 font-bold border-t border-b border-black py-1">
                MERCHANDISE CREDIT SLIP
            </div>

            <div className="mb-2 border-b border-dashed border-black pb-2">
                <div>Date: {format(currentDate, 'PP p')}</div>
                <div className="font-bold">Ref SO#: {originalSoNumber}</div>
                <div>Customer: {customerName}</div>
                <div>Issued By: {cashierName}</div>
            </div>

            <div className="mb-2">
                <div className="text-center font-bold mb-1">ITEMS RETURNED</div>
                <div className="flex justify-between font-bold border-b border-black mb-1 text-[10px]">
                    <span className="w-10 text-left">Qty</span>
                    <span className="flex-1 text-left px-1">Item</span>
                    <span className="w-12 text-right">Amt</span>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="flex justify-between mb-1 items-start text-[10px]">
                        <span className="w-10 text-left">{item.quantity} {item.product.unitOfMeasure}</span>
                        <span className="flex-1 text-left px-1">
                            <div>{item.product.name}</div>
                            <div className="text-black">@ {formatCurrency(item.price)}</div>
                        </span>
                        <span className="w-12 text-right">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between font-bold text-sm mt-2 border-b border-black pb-1">
                    <span>TOTAL CREDIT:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                </div>
            </div>

            <div className="text-center mt-6 text-[9px] space-y-1">
                <div>This credit slip can be used</div>
                <div>for future purchases.</div>
                <div>Non-transferable.</div>
            </div>

            <div className="mt-8 space-y-6">
                <div className="text-center">
                    <div className="border-t border-black w-3/4 mx-auto pt-1">
                        Customer Signature
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t border-black w-3/4 mx-auto pt-1">
                        Authorized Signature
                    </div>
                </div>
            </div>

            <div className="text-center mt-6 text-[8px]">
                <div>Printed: {format(new Date(), 'PP p')}</div>
                <div>Pos System by Bhagoh</div>
            </div>
        </div>
    );
});

CreditSlipView.displayName = 'CreditSlipView';
