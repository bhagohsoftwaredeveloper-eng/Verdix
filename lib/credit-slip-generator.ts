
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';

export interface CreditSlipData {
    originalSoNumber: string;
    customerName: string;
    date: string;
    cashierName: string;
    items: {
        name: string;
        quantity: number;
        unitOfMeasure?: string;
        price: number;
        total: number;
    }[];
    totalAmount: number;
    businessSettings?: {
        businessName?: string;
        address?: string;
        contactNumber?: string;
        tin?: string;
    };
}

export class CreditSlipGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson'
        });
    }

    public generate(data: CreditSlipData): Uint8Array {
        const { 
            originalSoNumber, 
            customerName, 
            date, 
            cashierName, 
            items, 
            totalAmount,
            businessSettings 
        } = data;
        
        const dateStr = format(new Date(date), 'PP p');
        const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let encoder = this.encoder
            .initialize()
            .codepage('cp437')
            .align('center')
            .bold(true)
            .line(businessSettings?.businessName || 'STOCK PILOT')
            .bold(false)
            .line(businessSettings?.address || 'General Merchandise')
            {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
            if (businessSettings?.contactNumber) {
                encoder.line(businessSettings.contactNumber);
            }
            
        encoder.newline()
            .bold(true)
            .line('MERCHANDISE CREDIT SLIP')
            .bold(false)
            .rule()
            .align('left')
            .line(`Date: ${dateStr}`)
            .line(`Ref SO#: ${originalSoNumber}`)
            .line(`Customer: ${customerName}`)
            .line(`Issued By: ${cashierName}`)
            .rule()
            .bold(true)
            .line('ITEMS RETURNED')
            .rule();

        items.forEach(item => {
            encoder.bold(true).line(item.name).bold(false)
                .table(
                    [
                        { width: 20, align: 'left' },
                        { width: 12, align: 'right' }
                    ],
                    [
                        [`${item.quantity} ${item.unitOfMeasure || ''} x ${formatCurrency(item.price)}`, formatCurrency(item.total)]
                    ]
                );
        });

        encoder.rule()
            .align('right')
            .bold(true)
            .line(`TOTAL CREDIT: ${formatCurrency(totalAmount)}`)
            .bold(false)
            .rule()
            .newline()
            .align('center')
            .line('This credit slip can be used')
            .line('for future purchases.')
            .line('Non-transferable.')
            .newline()
            .newline()
            .line('_______________________')
            .line('Customer Signature')
            .newline()
            .line('_______________________')
            .line('Authorized Signature')
            .newline()
            .line(`Printed: ${format(new Date(), 'PP p')}`)
            .newline()
            .newline()
            .newline()
            .cut();

        return encoder.encode();
    }
}
