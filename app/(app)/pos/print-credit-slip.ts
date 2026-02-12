import { format } from 'date-fns';

export interface CreditSlipItem {
  name: string;
  quantity: number;
  unitOfMeasure?: string;
  price: number;
  total: number;
}

export interface CreditSlipData {
  returnId?: string;
  originalSoNumber: string;
  customerName: string;
  date: string;
  cashierName: string;
  items: CreditSlipItem[];
  totalAmount: number;
}

export interface BusinessSettings {
  businessName?: string;
  address?: string;
  contactNumber?: string;
  tin?: string;
}

export const printCreditSlip = (data: CreditSlipData, settings: BusinessSettings | null) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Standard receipt width (80mm)
    const pageSize = '80mm';
    const containerWidth = '58mm'; // matching x-reading style for margin safety
    const fontSize = '10px';

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const receiptContent = `
        <html>
        <head>
            <title>Credit Slip</title>
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
                }
                .receipt-container {
                    width: 100%;
                    max-width: ${containerWidth};
                    margin: 10px;
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
                .border-b { border-bottom: 1px dashed black; }
                .border-t { border-top: 1px dashed black; }
                
                .flex { display: flex; justify-content: space-between; align-items: flex-start; }
                
                .item-row {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    gap: 4px;
                    margin-bottom: 2px;
                }
                .item-name {
                    grid-column: 1 / -1;
                    font-weight: bold;
                }
                .item-details {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.9em;
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="text-center mb-4">
                    <div class="font-bold uppercase" style="font-size: 1.2em;">${settings?.businessName || 'MY BUSINESS'}</div>
                    <div style="white-space: pre-wrap;">${settings?.address || ''}</div>
                    ${settings?.contactNumber ? `<div>${settings.contactNumber}</div>` : ''}
                </div>

                <div class="text-center font-bold uppercase mb-2" style="font-size: 1.1em;">
                    MERCHANDISE CREDIT SLIP
                </div>

                <div class="border-b mb-2"></div>

                <div class="space-y-1 mb-2">
                    <div class="flex">
                        <span>Date:</span>
                        <span>${format(new Date(data.date), 'MM/dd/yyyy hh:mm a')}</span>
                    </div>
                    ${data.returnId ? `
                    <div class="flex">
                        <span>Return ID:</span>
                        <span>${data.returnId}</span>
                    </div>` : ''}
                    <div class="flex">
                        <span>Ref SO#:</span>
                        <span>${data.originalSoNumber}</span>
                    </div>
                    <div class="flex">
                        <span>Customer:</span>
                        <span>${data.customerName}</span>
                    </div>
                    <div class="flex">
                        <span>Issued By:</span>
                        <span>${data.cashierName}</span>
                    </div>
                </div>

                <div class="border-b mb-2"></div>

                <div class="mb-2">
                    <div class="font-bold mb-1">ITEMS RETURNED</div>
                    ${data.items.map(item => `
                        <div class="mb-1">
                            <div class="font-bold">${item.name}</div>
                            <div class="flex text-xs">
                                <span>${item.quantity} ${item.unitOfMeasure || ''} x ${formatCurrency(item.price)}</span>
                                <span>${formatCurrency(item.total)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="border-t mb-2"></div>

                <div class="flex font-bold" style="font-size: 1.1em;">
                    <span>TOTAL CREDIT</span>
                    <span>${formatCurrency(data.totalAmount)}</span>
                </div>

                <div class="border-b mb-4"></div>

                <div class="text-xs text-center mb-6">
                    This credit slip can be used for future purchases.
                    <br/>Non-transferable and non-convertible to cash.
                </div>

                <div class="mt-8 space-y-4 text-center">
                    <div>
                        _______________________<br/>
                        Customer Signature
                    </div>
                    <div class="mt-4">
                        _______________________<br/>
                        Authorized Signature
                    </div>
                </div>
                
                <div class="text-center mt-4 text-xs">
                    Printed: ${format(new Date(), 'MM/dd/yyyy hh:mm a')}
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
