import { format } from 'date-fns';
import { XReadingData, BusinessSettings } from '../sales/x-reading/x-reading-preview';

export const printXReading = (data: XReadingData, businessSettings: BusinessSettings | null, paperSize: '58mm' | '80mm' = '80mm') => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Dynamic width based on settings
    const pageSize = paperSize === '80mm' ? '80mm' : '58mm';
    // Use conservative printable widths to ensure no physical cutoff and tighter spacing
    const containerWidth = paperSize === '80mm' ? '58mm' : '38mm'; 
    const fontSize = paperSize === '80mm' ? '10px' : '9px';

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const receiptContent = `
        <html>
        <head>
            <title>X-Reading Report</title>
            <style>
                @page {
                    margin: 0;
                    size: ${pageSize} auto;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                }
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: ${fontSize};
                    color: #000000 !important;
                    font-weight: 600;
                    -webkit-font-smoothing: antialiased;
                    -webkit-print-color-adjust: exact;
                    overflow: hidden;
                }
                .receipt-container {
                    width: 100%;
                    max-width: ${containerWidth};
                    margin: 0; /* Left align */
                    padding: 0;
                    box-sizing: border-box;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                .mb-1 { margin-bottom: 2px; }
                .mb-2 { margin-bottom: 4px; }
                .mb-4 { margin-bottom: 8px; }
                .mt-2 { margin-top: 4px; }
                .mt-4 { margin-top: 8px; }
                .border-b { border-bottom: 1px dashed black; }
                .border-t { border-top: 1px dashed black; }
                
                .flex { display: flex; justify-content: space-between; align-items: flex-start; }
                .flex > span:first-child { 
                    margin-right: 2px;
                    word-wrap: break-word; /* Allow wrapping */
                }
                .flex > span:last-child { 
                    white-space: nowrap; 
                    flex-shrink: 0; 
                }
                
                .space-y-1 > div { margin-bottom: 2px; }
                .text-xs { font-size: 0.85em; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="text-center mb-4">
                    <div class="font-bold uppercase" style="font-size: 1.2em;">${businessSettings?.businessName || 'MY BUSINESS'}</div>
                    <div style="white-space: pre-wrap;">${businessSettings?.address || ''}</div>
                </div>

                <div class="text-center font-bold uppercase mb-2" style="font-size: 1.1em;">
                    X-READING REPORT
                </div>

                <div class="border-b mb-2"></div>

                <div class="space-y-1 mb-2">
                    <div class="flex">
                        <span>Cashier:</span>
                        <span>${data.cashierName}</span>
                    </div>
                    <div class="flex">
                        <span>Terminal:</span>
                        <span>${data.terminalId}</span>
                    </div>
                    <div class="flex">
                        <span>Reading #:</span>
                        <span>${data.readingNumber || data.id?.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div class="flex">
                        <span>Start Shift:</span>
                        <span>${data.shiftStart ? format(new Date(data.shiftStart), 'MM/dd/yyyy hh:mm a') : '-'}</span>
                    </div>
                    <div class="flex">
                        <span>End Shift:</span>
                        <span>${data.shiftEnd ? format(new Date(data.shiftEnd), 'MM/dd/yyyy hh:mm a') : '-'}</span>
                    </div>
                </div>

                <div class="border-b mb-2"></div>

                <div class="space-y-1 mb-4">
                    <div class="flex">
                        <span>GROSS SALES</span>
                        <span>${formatCurrency(data.grossSales)}</span>
                    </div>
                    <div class="flex">
                        <span>LESS: RETURNS</span>
                        <span>${formatCurrency(data.returns)}</span>
                    </div>
                    <div class="flex">
                        <span>LESS: DISCOUNTS</span>
                        <span>${formatCurrency(data.discounts)}</span>
                    </div>
                    
                    <div class="border-t border-dashed border-black my-1"></div>

                    <div class="flex font-bold">
                        <span>NET SALES</span>
                        <span>${formatCurrency(data.netSales)}</span>
                    </div>
                </div>

                <div class="space-y-1 mb-2">
                    <div class="flex">
                        <span>VAT AMOUNT</span>
                        <span>${formatCurrency(data.vatAmount)}</span>
                    </div>
                </div>

                <div class="border-b mb-2"></div>

                <div class="mb-1 font-bold">PAYMENTS</div>
                <div class="space-y-1 mb-2">
                    ${data.paymentMethods.map(pm => `
                        <div class="flex">
                            <span>${pm.name}</span>
                            <span>${formatCurrency(pm.amount)}</span>
                        </div>
                    `).join('')}
                     <div class="border-t border-dashed border-black my-1"></div>
                     <div class="flex font-bold">
                        <span>TOTAL TENDERED</span>
                        <span>${formatCurrency(data.paymentMethods.reduce((a, b) => a + b.amount, 0))}</span>
                    </div>
                </div>

                <div class="border-b mb-2"></div>

                <div class="text-center mb-1 font-bold">CASH COUNT DETAILS</div>
                <div class="space-y-1 mb-2">
                    <div class="flex text-xs font-bold border-b border-black pb-1">
                        <span style="width:33%">DENOM</span>
                        <span style="width:33%; text-align:center">QTY</span>
                        <span style="width:33%; text-align:right">TOTAL</span>
                    </div>
                    ${(data.cashDenominations || []).map(d => `
                        <div class="flex text-xs">
                            <span style="width:33%">${d.amount >= 1 ? d.amount : d.amount.toFixed(2)}</span>
                            <span style="width:33%; text-align:center">${d.qty}</span>
                            <span style="width:33%; text-align:right">${formatCurrency(d.total)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="border-b mb-2"></div>

                <div class="text-center mb-1 font-bold">CASH SUMMARY</div>
                <div class="space-y-1 mb-2">
                    <div class="flex">
                        <span>OPENING FUND</span>
                        <span>${formatCurrency(data.startingCash)}</span>
                    </div>
                    <div class="flex">
                        <span>+ CASH SALES</span>
                        <span>${formatCurrency(data.cashSales)}</span>
                    </div>
                    <div class="flex">
                        <span>+ CASH DEPOSIT</span>
                        <span>${formatCurrency(data.cashDeposit || 0)}</span>
                    </div>
                     <div class="flex">
                        <span>- CASH PICKUP</span>
                        <span>${formatCurrency(data.cashPickup || 0)}</span>
                    </div>
                    
                    <div class="border-t border-dashed border-black my-1"></div>
                    
                    <div class="flex font-bold">
                        <span>EXPECTED CASH</span>
                        <span>${formatCurrency(data.startingCash + data.cashSales + (data.cashDeposit || 0) - (data.cashPickup || 0))}</span>
                    </div>
                     <div class="flex font-bold">
                        <span>ACTUAL COUNT</span>
                        <span>${formatCurrency(data.cashCountTotal || 0)}</span>
                    </div>

                    <div class="border-t border-dashed border-black my-1"></div>

                     <div class="flex font-bold">
                        <span>${(data.overShort || 0) >= 0 ? 'OVERAGE' : 'SHORTAGE'}</span>
                        <span>${formatCurrency(Math.abs(data.overShort || 0))}</span>
                    </div>
                </div>

                <div class="mt-8 text-center space-y-4">
                    <div>
                         _______________________<br/>
                         Cashier Signature
                    </div>
                    <div>
                         _______________________<br/>
                         Manager Signature
                    </div>
                    <div class="text-xs">
                         Printed: ${format(new Date(), 'MM/dd/yyyy hh:mm a')}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    doc.open();
    doc.write(receiptContent);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
};
