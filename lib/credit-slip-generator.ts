import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';

// 58mm thermal printer = 32 characters per line (monospace)
const COLS = 32;
const QTY_W  = 7;
const AMT_W  = 9;
const NAME_W = COLS - QTY_W - AMT_W; // 16

export interface CreditSlipData {
    creditSlipId: string;
    originalSoNumber: string;
    customerName: string;
    date: string;
    expiryDate: string;
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
        minNumber?: string;
        serialNumber?: string;
    };
}

export class CreditSlipGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson',
            width: COLS,
        });
    }

    public generate(data: CreditSlipData): Uint8Array {
        const { 
            creditSlipId,
            originalSoNumber, 
            customerName, 
            date, 
            cashierName, 
            items, 
            totalAmount,
            businessSettings 
        } = data;
        
        const dateStr = format(new Date(date), 'PP p');

        const enc = this.encoder.initialize().codepage('cp437');

        // Helper methods for centering and padding, stolen from ReceiptGenerator
        const centerRow = (text: string) => {
            if (!text) return '';
            const stripped = text.substring(0, COLS);
            const padLen = Math.max(0, Math.floor((COLS - stripped.length) / 2));
            return ' '.repeat(padLen) + stripped;
        };

        const bizName = businessSettings?.businessName?.trim() || 'STOCK PILOT';
        const address = businessSettings?.address?.trim() || 'General Merchandise';
        const minNumber = businessSettings?.minNumber || '1234567890';
        const serialNumber = businessSettings?.serialNumber || '0987654321-11';
        
        // ─── HEADER (centered) ───────────────────────────────────────────
        enc.bold(true).line(centerRow(bizName)).bold(false);
        enc.line(centerRow(address));
        if (businessSettings?.contactNumber) enc.line(centerRow(businessSettings.contactNumber));
        if (businessSettings?.tin)           enc.line(centerRow(`VAT REG TIN: ${businessSettings.tin}`));
        enc.line(centerRow(`MIN: ${minNumber}`));
        enc.line(centerRow(`S/N: ${serialNumber}`));
        enc.line(centerRow(dateStr));
        enc.newline();

        // ─── SLIP HEADER ───────────────────────────────────────────
        enc.align('center').bold(true).line('MERCHANDISE CREDIT SLIP').bold(false).align('left');
        enc.bold(true).line(`ID: ${creditSlipId}`).bold(false);
        enc.line(`Ref SO#: ${originalSoNumber}`);
        enc.line(`Cust: ${customerName}`);
        enc.line(`Cashier: ${cashierName}`);
        enc.line('-'.repeat(COLS)); // dashed border

        // ─── ITEM TABLE HEADER ────────────────────────────────────────────
        const pad = ' '; 
        const hdrQty  = 'Qty'.padEnd(QTY_W, pad);
        const hdrName = 'Item'.padEnd(NAME_W, pad);
        const hdrAmt  = 'Amt'.padStart(AMT_W, pad);
        enc.bold(true).line(`${hdrQty}${hdrName}${hdrAmt}`).bold(false);
        enc.rule({ style: 'single' });

        const marginLeftDots = QTY_W * 12; 
        const nl = marginLeftDots % 256;
        const nh = Math.floor(marginLeftDots / 256);
        const absoluteIndent = () => { enc.raw([0x1b, 0x24, nl, nh]); };

        // ─── ITEMS ────────────────────────────────────────────────────────
        items.forEach(item => {
            const uom     = item.unitOfMeasure ? ` ${item.unitOfMeasure}` : '';
            const qtyStr  = `${item.quantity}${uom}`;
            const qty     = qtyStr.length > QTY_W ? qtyStr.substring(0, QTY_W) : qtyStr.padEnd(QTY_W, pad);
            const amtStr  = this.fmt(item.total);
            const amt     = amtStr.length > AMT_W ? amtStr.substring(0, AMT_W) : amtStr.padStart(AMT_W, pad);

            const chunks  = this.wrap(item.name.trim(), NAME_W);
            const padName = (s: string) => s.length >= NAME_W ? s.substring(0, NAME_W) : s.padEnd(NAME_W, pad);

            enc.line(`${qty}${padName(chunks[0] || '')}${amt}`);
            for (let i = 1; i < chunks.length; i++) {
                absoluteIndent();
                enc.line(chunks[i]);
            }
            absoluteIndent();
            enc.line(`@ ${this.fmt(item.price)}`);
        });

        // ─── TOTALS ───────────────────────────────────
        enc.line('-'.repeat(COLS));
        enc.bold(true).line(this.row('TOTAL CREDIT:', `₱${this.fmt(totalAmount)}`)).bold(false);
        enc.line('-'.repeat(COLS));

        // ─── SIGNATURES ────────────────────────────────────────────
        enc.newline();
        enc.align('center');
        enc.line('_______________________');
        enc.line('Customer Signature');
        enc.newline();
        enc.line('_______________________');
        enc.line('Authorized Signature');
        enc.newline();

        // ─── FOOTER ────────────────────────────────────────────
        enc.line(`Printed: ${format(new Date(), 'PP p')}`);
        enc.line('Pos System by Bhagoh');
        enc.newline().newline().newline();
        enc.cut();

        return enc.encode();
    }

    private fmt(amount: number): string {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    private row(left: string, right: string, width: number = COLS): string {
        const spaces = width - left.length - right.length;
        if (spaces <= 0) return `${left} ${right}`.substring(0, width);
        return `${left}${' '.repeat(spaces)}${right}`;
    }

    private wrap(text: string, maxWidth: number): string[] {
        const words  = text.split(' ');
        const lines: string[] = [];
        let   current = '';
        for (const word of words) {
            if (word.length > maxWidth) {
                if (current) { lines.push(current); current = ''; }
                let rest = word;
                while (rest.length > maxWidth) {
                    lines.push(rest.substring(0, maxWidth));
                    rest = rest.substring(maxWidth);
                }
                current = rest;
                continue;
            }
            const candidate = current ? `${current} ${word}` : word;
            if (candidate.length > maxWidth) {
                lines.push(current);
                current = word;
            } else {
                current = candidate;
            }
        }
        if (current) lines.push(current);
        return lines.length ? lines : [''];
    }
}
