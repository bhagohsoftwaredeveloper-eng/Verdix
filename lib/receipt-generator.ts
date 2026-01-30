
import EscPosEncoder from 'esc-pos-encoder';
import { format } from 'date-fns';
import type { SaleItem, Customer } from './types';

export class ReceiptGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new EscPosEncoder();
    }

    public generateReceipt(sale: {
        items: SaleItem[];
        customer: Customer | null;
        totalDue: number;
        change: number;
        paymentMethod: string;
        orderNumber?: string;
        amountTendered?: number;
    }): Uint8Array {
        const { items, customer, totalDue, change, paymentMethod, orderNumber, amountTendered } = sale;
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
            .line('-'.repeat(32)) // 32 chars is safe for 58mm (usually 32-42 cols)
            
            // Header
            .bold(true)
            .text(this.padRow('Qty', 'Item', 'Amt'))
            .newline()
            .bold(false)
            .line('-'.repeat(32));

        // Items
        items.forEach(item => {
            const qtyStr = item.quantity.toString();
            const priceStr = this.formatCurrency(item.price * item.quantity);
            
            // Basic wrapping logic for item name
            // Column widths: Qty (4), Space (1), Name (Variable), Space (1), Price (8)
            // Total 32 chars -> Name approx 18 chars
            const maxNameLen = 16; 
            const name = item.name;
            
             // If name is short, just print one line
            if (name.length <= maxNameLen) {
                 encoder.line(this.padThreeCol(qtyStr, name, priceStr));
            } else {
                // Split name
                let remainingName = name;
                let firstLine = true;
                
                while (remainingName.length > 0) {
                    const chunk = remainingName.substring(0, maxNameLen);
                    remainingName = remainingName.substring(maxNameLen);
                    
                    if (firstLine) {
                         encoder.line(this.padThreeCol(qtyStr, chunk, priceStr));
                         firstLine = false;
                    } else {
                         // Print subsequent lines of name with empty qty and price
                         encoder.line(this.padThreeCol('', chunk, ''));
                    }
                }
            }
            // Add Unit Price line
            const unitPriceStr = `@ ${this.formatCurrency(item.price)}`;
            encoder.line(this.padThreeCol('', unitPriceStr, ''));
        });

        encoder
            .line('-'.repeat(32))
            .align('right')
            .line(`Subtotal: ${this.formatCurrency(subTotal)}`)
        
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

        encoder
            .newline()
            .align('center')
            .line('Thank you for your purchase!')
            .line('Pos System by Bhagoh')
            .newline()
            .newline()
            .newline() // Feed
            .cut();

        return encoder.encode();
    }

    // Helper to format currency
    private formatCurrency(amount: number): string {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Helper to pad columns for 32-char width (common 58mm)
    // Layout: Qty (4)  Name (18)  Price (10)
    private padThreeCol(col1: string, col2: string, col3: string): string {
        const w1 = 4;
        const w3 = 9; // reduced slightly to ensure fit
        // w2 fills the rest
        // Total = 32
        const w2 = 32 - w1 - w3 - 2; // -2 for spaces
        
        const c1 = col1.padEnd(w1).substring(0, w1);
        const c3 = col3.padStart(w3).substring(0, w3);
        // c2 is not strictly padded here because we handle wrapping in the loop, 
        // but for safety in the single line case:
        const c2 = col2.padEnd(w2).substring(0, w2);
        
        return `${c1} ${c2} ${c3}`;
    }

    private padRow(c1: string, c2: string, c3: string): string {
         return this.padThreeCol(c1, c2, c3);
    }
}
