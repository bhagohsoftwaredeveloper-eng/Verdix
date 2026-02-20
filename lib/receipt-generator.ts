
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';
import type { POSSaleItem, Customer } from './types';

export class ReceiptGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson'
        });
    }

    public generateReceipt(sale: {
        items: POSSaleItem[];
        customer: Customer | null;
        totalDue: number;
        change: number;
        paymentMethod: string;
        orderNumber?: string;
        amountTendered?: number;
        pointsEarned?: number;
    }): Uint8Array {
        const { items, customer, totalDue, change, paymentMethod, orderNumber, amountTendered, pointsEarned } = sale;
        const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const totalDiscount = items.reduce((acc, item) => acc + (item.price * item.quantity * item.discount) / 100, 0);
        const vatAmount = (totalDue / 1.12) * 0.12;
        const dateStr = format(new Date(), 'PP p');

        let encoder = this.encoder
            .initialize()
            .codepage('cp437')
            .align('center')
            .bold(true)
            .line('STOCK PILOT')
            .bold(false)
            .line('General Merchandise')
            .line(dateStr)
            .newline()
            .align('left')
            .line('Sale Details')
            .line(`Order #: ${orderNumber || 'N/A'}`)
            .line(`Cust: ${customer?.name || 'Walk-in'}`)
            .line('Cashier: Admin')
            .rule({ style: 'double' })
            .bold(true)
            .table(
                [
                    { width: 4, align: 'left' }, // Qty
                    { width: 18, align: 'left' }, // Item (flex)
                    { width: 10, align: 'right' } // Amt
                ],
                [
                    ['Qty', 'Item', 'Amt']
                ]
            )
            .bold(false)
            .rule();

        // Items
        const tableData = items.map(item => {
            const qtyStr = `${item.quantity}`;
            const priceStr = this.formatCurrency(item.price * item.quantity);
            // Name + Unit Price on next line if needed, but for now just name
            // construct name with @ price
            const nameWithPrice = `${item.name}\n@ ${this.formatCurrency(item.price)}`;
            return [qtyStr, nameWithPrice, priceStr];
        });

        encoder.table(
            [
                { width: 4, align: 'left', verticalAlign: 'top' },
                { width: 18, align: 'left' },
                { width: 10, align: 'right', verticalAlign: 'bottom' }
            ],
            tableData
        );

        encoder
            .rule()
            .align('right')
            .line(`Subtotal: ${this.formatCurrency(subTotal)}`);
        
        if (totalDiscount > 0) {
            encoder.line(`Discount: -${this.formatCurrency(totalDiscount)}`);
        }

        encoder
            .bold(true)
            .line(`TOTAL: ${this.formatCurrency(totalDue)}`)
            .bold(false)
            .line(`VAT (12%): ${this.formatCurrency(vatAmount)}`)
            .newline()
            .bold(true)
            .line(`${paymentMethod}: ${this.formatCurrency(paymentMethod === 'CASH' ? (amountTendered || 0) : totalDue)}`)
            .bold(false);

        if (paymentMethod === 'CASH') {
            encoder.line(`Change: ${this.formatCurrency(change)}`);
        }

        if (pointsEarned && pointsEarned > 0) {
            encoder
                .rule()
                .bold(true)
                .line(`Points Earned: ${pointsEarned} pts`)
                .bold(false);
        }

        encoder
            .newline()
            .align('center')
            .line('Thank you for your purchase!')
            .line('Pos System by Bhagoh')
            .newline()
            .newline()
            .newline() 
            .cut();

        return encoder.encode();
    }

    private formatCurrency(amount: number): string {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}
