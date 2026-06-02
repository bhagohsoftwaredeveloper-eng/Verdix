import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { SaleItem, mapVatStatusToTaxType } from './page';
import { Customer } from '@/lib/types';

import { SystemSettings } from '@/lib/types';
import { formatQuantity } from '@/lib/utils';

interface ReceiptViewProps {
    saleDetails: {
        items: SaleItem[];
        customer: Customer | null;
        totalDue: number;
        change: number;
        paymentMethod: string;
        payments?: { method: string; amount: number; reference?: string }[];
        orderNumber?: string;
        amountTendered?: number;
        transactionDate?: Date; // Add support for date if available
        pointsUsedCount?: number;
        pointsUsedValue?: number;
        pointsBalance?: number;
        cashierName?: string;
        pointsEarned?: number;
        pointsUsed?: number;
        terminalMin?: string;
        terminalSerialNumber?: string;
        terminalName?: string;
        isTrainingMode?: boolean;
        paymentReference?: string;
        taxBreakdown?: {
            vatableSales: number;
            vatAmount: number;
            vatExemptSales: number;
            zeroRatedSales: number;
            nonVatSales: number;
        };
    };
    settings?: SystemSettings | null;
}

export const ReceiptView = forwardRef<HTMLDivElement, ReceiptViewProps>(({ saleDetails, settings }, ref) => {
    const { items, customer, totalDue, change, paymentMethod } = saleDetails;
    const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount || 0)) / 100, 0);
    
    // Robust tax calculation for fallback if taxBreakdown is missing
    const computedTax = React.useMemo(() => {
        const vatableGross = items.reduce((acc, item) => {
            const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
            const taxType = item.taxType || mapVatStatusToTaxType(item.vatStatus);
            return taxType === 'VAT' ? acc + netItemTotal : acc;
        }, 0);

        const vatableSales = vatableGross / 1.12;
        const vatAmount = vatableGross - vatableSales;

        const vatExemptSales = items.reduce((acc, item) => {
            const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
            const taxType = item.taxType || mapVatStatusToTaxType(item.vatStatus);
            return taxType === 'VAT_EXEMPT' ? acc + netItemTotal : acc;
        }, 0);

        return { vatableSales, vatAmount, vatExemptSales };
    }, [items]);

    const vatAmount = computedTax.vatAmount;
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const currentDate = saleDetails.transactionDate ? new Date(saleDetails.transactionDate) : new Date();

    // Statutory discount (SC/PWD/NAAC/Solo Parent) cardholder details — required on the OR for BIR compliance.
    const statutoryLabels: Record<string, string> = {
        senior: 'SENIOR CITIZEN',
        pwd: 'PWD',
        naac: 'NAAC',
        solo_parent: 'SOLO PARENT',
    };
    const discountHolderItem = items.find(item => item.discountIdNumber || item.discountHolderName);
    const discountHolderName = discountHolderItem?.discountHolderName;
    const discountIdNumber = discountHolderItem?.discountIdNumber;
    const discountTypeLabel = discountHolderItem?.discountType ? statutoryLabels[discountHolderItem.discountType] : undefined;

    const paperWidth = settings?.paperSize === '80mm' ? 'w-[80mm]' : 'w-[58mm]';

    return (
        <div 
            ref={ref} 
            className={`printable-area bg-white text-black px-2 py-4 text-[10px] font-mono font-bold ${paperWidth} mx-auto leading-tight`}
            style={{ 
                wordBreak: 'break-word',
                // Force size during print to match what's on screen
                minWidth: settings?.paperSize === '80mm' ? '80mm' : '58mm',
                maxWidth: settings?.paperSize === '80mm' ? '80mm' : '58mm'
            }}
        >
             {/* Print specific styles can be added here or via global CSS if needed, 
                 but react-to-print usually handles current styles well. 
                 We enforce black text and white background. */}
            <div className="text-center mb-4">
                <div className="font-bold text-lg mb-1">{settings?.businessName?.trim() || 'verdix'}</div>
                <div>{settings?.address?.trim() || 'General Merchandise'}</div>
                {settings?.contactNumber && <div>{settings.contactNumber}</div>}
                {settings?.tin && <div>VAT REG TIN: {settings.tin}</div>}
                <div>MIN: {saleDetails.terminalMin || settings?.minNumber || '1234567890'}</div>
                <div>S/N: {saleDetails.terminalSerialNumber || settings?.serialNumber || '0987654321-11'}</div>
                <div className="text-[10px]">{format(currentDate, 'PP p')}</div>
            </div>

            <div className="mb-2 border-b border-dashed border-black pb-2">
                <div className="font-bold text-center border-y border-black py-1 mb-1 uppercase">
                    {paymentMethod?.toUpperCase() === 'CHARGE' ? 'CHARGE SLIP' : 'CASH SALE'}
                </div>
                <div className="font-bold">SI NO.: {(saleDetails.orderNumber || '000000').padStart(6, '0')}</div>
                <div>Cust: {customer?.name || 'Walk-in'}</div>
                <div>Cashier: {saleDetails.cashierName || 'Admin'}</div>
                {saleDetails.terminalName && <div>Terminal: {saleDetails.terminalName}</div>}
            </div>

            <div className="mb-2">
                <div className="flex justify-between font-bold border-b border-black mb-1 text-[10px]">
                    <span className="w-10 text-left">Qty</span>
                    <span className="flex-1 text-left px-1">Item</span>
                    <span className="w-12 text-right">Amt</span>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="flex justify-between mb-1 items-start text-[10px]">
                        <span className="w-10 text-left">{formatQuantity(item.quantity)} {item.unitOfMeasure}</span>
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
                    <span>SUBTOTAL:</span>
                    <span>{formatCurrency(subTotal)}</span>
                </div>
                {totalDiscount > 0 && (
                    <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2">
                    <span>AMOUNT DUE:</span>
                    <span>{formatCurrency(totalDue)}</span>
                </div>
                {!saleDetails.taxBreakdown && (
                    <div className="flex justify-between text-[10px]">
                        <span>VAT (12%):</span>
                        <span>{formatCurrency(vatAmount)}</span>
                    </div>
                )}
            </div>

            <div className="border-t border-black my-2"></div>

            <div className="space-y-1">
                {saleDetails.pointsUsedValue && saleDetails.pointsUsedValue > 0 ? (
                    <>
                        <div className="flex justify-between font-bold">
                            <span>Points Value to Redeem:</span>
                            <span>-{formatCurrency(saleDetails.pointsUsedValue)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Net Balance Due:</span>
                            <span>{formatCurrency(totalDue - saleDetails.pointsUsedValue)}</span>
                        </div>
                    </>
                ) : null}

                {saleDetails.payments && saleDetails.payments.length > 0 ? (
                    saleDetails.payments.map((p, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between font-bold">
                                <span>{p.method.toUpperCase() === 'CASH' ? 'CASH:' : p.method + ':'}</span>
                                <span>{formatCurrency(p.amount)}</span>
                            </div>
                            {p.reference && (
                                <div className="flex justify-between font-bold text-[9px]">
                                    <span>REF NO:</span>
                                    <span>{p.reference}</span>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <>
                        <div className="flex justify-between font-bold">
                            <span>{saleDetails.pointsUsedValue && saleDetails.pointsUsedValue > 0 ? 'CASH Tendered:' : (paymentMethod?.toUpperCase() === 'CASH' ? 'CASH:' : paymentMethod + ':')}</span>
                            <span>{formatCurrency(saleDetails.amountTendered || (totalDue + change))}</span>
                        </div>

                        {saleDetails.paymentReference && (
                            <div className="flex justify-between font-bold text-[9px]">
                                <span>REF NO:</span>
                                <span>{saleDetails.paymentReference}</span>
                            </div>
                        )}
                    </>
                )}

                {change > 0 && (
                    <div className="flex justify-between font-bold">
                        <span>CHANGE:</span>
                        <span>{formatCurrency(change)}</span>
                    </div>
                )}
            </div>

            {(discountHolderName || discountIdNumber) && (
                <div className="border-t border-dashed border-black mt-2 pt-2 space-y-1">
                    <div className="text-center font-bold">
                        {discountTypeLabel ? `${discountTypeLabel} DISCOUNT` : 'DISCOUNT DETAILS'}
                    </div>
                    <div className="flex justify-between">
                        <span>NAME:</span>
                        <span className="text-right break-all">{discountHolderName || '____________'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>ID NO.:</span>
                        <span className="text-right break-all">{discountIdNumber || '____________'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SIGNATURE:</span>
                        <span>____________</span>
                    </div>
                </div>
            )}

            {saleDetails.taxBreakdown ? (
                <div className="border-t border-dashed border-black mt-2 pt-2 space-y-1">
                    <div className="flex justify-between">
                        <span>VAT SALES</span>
                        <span>{formatCurrency(saleDetails.taxBreakdown.vatableSales)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>12% VAT</span>
                        <span>{formatCurrency(saleDetails.taxBreakdown.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>VAT-EXEMPT SALES</span>
                        <span>{formatCurrency(saleDetails.taxBreakdown.vatExemptSales)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>ZERO-RATED SALES</span>
                        <span>{formatCurrency(saleDetails.taxBreakdown.zeroRatedSales)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>NON-VAT SALES</span>
                        <span>{formatCurrency(saleDetails.taxBreakdown.nonVatSales)}</span>
                    </div>
                </div>
            ) : (
                <div className="border-t border-dashed border-black mt-2 pt-2">
                    <div className="flex justify-between text-[10px]">
                        <span>VAT (12%):</span>
                        <span>{formatCurrency(vatAmount)}</span>
                    </div>
                </div>
            )}

                {(saleDetails.pointsEarned && saleDetails.pointsEarned > 0) || (saleDetails.pointsUsedCount && saleDetails.pointsUsedCount > 0) || (saleDetails.pointsBalance !== undefined) ? (
                    <div className="mt-2 pt-2 border-t border-dashed border-black">
                        <div className="text-center font-bold mb-1">LOYALTY STATEMENT</div>
                        {saleDetails.pointsUsedCount && saleDetails.pointsUsedCount > 0 && (
                            <div className="flex justify-between">
                                <span>Used Points:</span>
                                <span>{formatQuantity(saleDetails.pointsUsedCount)} pts</span>
                            </div>
                        )}
                        {saleDetails.pointsEarned && saleDetails.pointsEarned > 0 && (
                            <div className="flex justify-between">
                                <span>Earned Points:</span>
                                <span>{formatQuantity(saleDetails.pointsEarned)} pts</span>
                            </div>
                        )}
                        {saleDetails.pointsBalance !== undefined && (
                            <div className="flex justify-between font-bold">
                                <span>New Balance:</span>
                                <span>{formatQuantity(Number(saleDetails.pointsBalance))} pts</span>
                            </div>
                        )}
                    </div>
                ) : null}
                <div className="text-center mt-6">
                <div>Shop smart, save more! Thank you for visiting verdix.</div>
                {saleDetails.isTrainingMode && (
                    <div className="mt-4 border-2 border-black p-2 bg-gray-100 text-center font-bold text-[10px] leading-tight flex flex-col gap-1">
                        <div>THIS IS NOT A CASH SALE/OFFICIAL RECEIPT.</div>
                        <div>PLEASE REQUEST FROM SELLER YOUR CASH SALE/OFFICIAL RECEIPT</div>
                    </div>
                )}
            </div>
        </div>
    );
});

ReceiptView.displayName = 'ReceiptView';
