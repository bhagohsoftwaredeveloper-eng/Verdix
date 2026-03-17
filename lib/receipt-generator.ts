
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';
import type { POSSaleItem, Customer } from './types';
import { SystemSettings } from './types';

// 58mm thermal printer = 32 characters per line (monospace)
const COLS = 32;

// Column widths matching receipt-view.tsx:
//   <span className="w-10">  => Qty  : 7 chars
//   <span className="flex-1"> => Item : 16 chars  (32 - 7 - 9)
//   <span className="w-12">  => Amt  : 9 chars
const QTY_W  = 7;
const AMT_W  = 9;
const NAME_W = COLS - QTY_W - AMT_W; // 16

export class ReceiptGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson',
            width: COLS,
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
        pointsUsedCount?: number;
        transactionDate?: Date;
        cashierName?: string;
        terminalMin?: string;
        terminalSerialNumber?: string;
        pointsUsedValue?: number;
        pointsBalance?: number;
    }, settings?: SystemSettings | null): Uint8Array {

        const { items, customer, totalDue, change, paymentMethod, orderNumber, amountTendered, pointsEarned, pointsUsedCount } = sale;
        const subTotal      = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const totalDiscount = items.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount || 0)) / 100, 0);
        const vatAmount     = (totalDue / 1.12) * 0.12;
        const currentDate   = sale.transactionDate ? new Date(sale.transactionDate) : new Date();
        const dateStr       = format(currentDate, 'PP p');

        const enc = this.encoder.initialize().codepage('cp437');

        // ─── HEADER (centered) ───────────────────────────────────────────
        // Use software centerRow to ensure perfect centering within 32 columns
        const centerRow = (text: string) => {
            if (!text) return '';
            const stripped = text.substring(0, COLS);
            const padLen = Math.max(0, Math.floor((COLS - stripped.length) / 2));
            return ' '.repeat(padLen) + stripped;
        };

        const bizName = settings?.businessName?.trim() || 'STOCK PILOT';
        const address = settings?.address?.trim() || 'General Merchandise';
        const minNumber = sale.terminalMin || settings?.minNumber || '1234567890';
        const serialNumber = sale.terminalSerialNumber || settings?.serialNumber || '0987654321-11';
        
        enc.bold(true).line(centerRow(bizName)).bold(false);
        enc.line(centerRow(address));
        
        if (settings?.contactNumber) enc.line(centerRow(settings.contactNumber));
        if (settings?.tin)           enc.line(centerRow(`VAT REG TIN: ${settings.tin}`));
        enc.line(centerRow(`MIN: ${minNumber}`));
        enc.line(centerRow(`S/N: ${serialNumber}`));
        enc.line(centerRow(dateStr));
        enc.newline();

        // ─── SALE DETAILS (left-aligned, dashed border below) ────────────
        // Matches: mb-2 border-b border-dashed pb-2
        enc.align('left');
        enc.line('Sale Details');
        enc.bold(true).line(`Order #: ${orderNumber || 'N/A'}`).bold(false);
        enc.line(`Cust: ${customer?.name || 'Walk-in'}`);
        enc.line(`Cashier: ${sale.cashierName || 'Admin'}`);
        enc.line('-'.repeat(COLS)); // dashed border (border-b border-dashed)

        // ─── ITEM TABLE HEADER ────────────────────────────────────────────
        const pad = ' '; 
        const hdrQty  = 'Qty'.padEnd(QTY_W, pad);
        const hdrName = 'Item'.padEnd(NAME_W, pad);
        const hdrAmt  = 'Amt'.padStart(AMT_W, pad);
        enc.bold(true).line(`${hdrQty}${hdrName}${hdrAmt}`).bold(false);
        enc.rule({ style: 'single' });

        // Calculate absolute position dots: QTY_W characters * 12 dots per character width = 84 dots
        // For ESC/POS absolute position (ESC $ nL nH), distance is (nL + nH * 256) dots.
        // 84 dots = 84 % 256 = 84 for nL, 0 for nH
        const marginLeftDots = QTY_W * 12; 
        const nl = marginLeftDots % 256;
        const nh = Math.floor(marginLeftDots / 256);

        // Define a helper method for left padding an indented line using explicit raw bytes
        // ESC $ nL nH
        // 0x1B, 0x24, nL, nH
        const absoluteIndent = () => {
             enc.raw([0x1b, 0x24, nl, nh]);
        };

        // ─── ITEMS ────────────────────────────────────────────────────────
        items.forEach(item => {
            const uom     = (item as any).unitOfMeasure ? ` ${(item as any).unitOfMeasure}` : '';
            const qtyText = `${item.quantity}${uom}`;
            
            const qty     = qtyText.length > QTY_W ? qtyText.substring(0, QTY_W) : qtyText.padEnd(QTY_W, pad);

            const amtText = this.fmt(item.price * item.quantity);
            const amt     = amtText.length > AMT_W ? amtText.substring(0, AMT_W) : amtText.padStart(AMT_W, pad);

            // Word-wrap item name into NAME_W-char chunks
            const chunks  = this.wrap(item.name.trim(), NAME_W);
            
            const padName = (s: string) => s.length >= NAME_W ? s.substring(0, NAME_W) : s.padEnd(NAME_W, pad);

            // First line: qty | name[0] | amt -> Length guaranteed to be EXACTLY 32.
            enc.line(`${qty}${padName(chunks[0] || '')}${amt}`);

            // Remaining name lines (NO RIGHT PADDING AT ALL! Just left coords and text)
            for (let i = 1; i < chunks.length; i++) {
                absoluteIndent();
                enc.line(chunks[i]);
            }

            // Discount line
            if (item.discount && item.discount > 0) {
                const discText = `Disc: ${item.discount}%`;
                absoluteIndent();
                enc.line(discText);
            }

            // Unit price line
            const unitPriceText = `@ ${this.fmt(item.price)}`;
            absoluteIndent();
            enc.line(unitPriceText);
        });

        // ─── TOTALS (dashed top border) ───────────────────────────────────
        enc.line('-'.repeat(COLS));

        const padRow = (left: string, right: string, width: number = COLS) => {
            const spaces = width - left.length - right.length;
            if (spaces <= 0) return `${left} ${right}`.substring(0, width);
            return `${left}${pad.repeat(spaces)}${right}`;
        };

        enc.line(padRow('Subtotal:', this.fmt(subTotal)));

        if (totalDiscount > 0) {
            enc.line(padRow('Discount:', `-${this.fmt(totalDiscount)}`));
        }

        enc.bold(true).line(padRow('TOTAL:', this.fmt(totalDue))).bold(false);
        enc.line(padRow('VAT (12%):', this.fmt(vatAmount)));

        // ─── PAYMENT (solid border above) ────────────────────────────────
        enc.rule({ style: 'single' });

        if (sale.pointsUsedValue && sale.pointsUsedValue > 0) {
            enc.bold(true).line(this.row('Points Redeemed:', `-${this.fmt(sale.pointsUsedValue)}`)).bold(false);
            enc.bold(true).line(this.row('Net Balance Due:', this.fmt(totalDue - sale.pointsUsedValue))).bold(false);
            enc.bold(true).line(this.row('Cash Tendered:', this.fmt(amountTendered || (totalDue + change)))).bold(false);
        } else {
            const cashLabel = paymentMethod === 'POINTS' ? 'Cash Tendered:' : `${paymentMethod}:`;
            enc.bold(true).line(this.row(cashLabel, this.fmt(amountTendered || (totalDue + change)))).bold(false);
        }

        if (change > 0) {
            enc.bold(true).line(this.row('Change:', this.fmt(change))).bold(false);
        }

        // ─── POINTS (dashed border above, if any) ────────────────────────
        if ((pointsEarned && pointsEarned > 0) || (sale.pointsUsedCount && sale.pointsUsedCount > 0) || (sale.pointsBalance !== undefined)) {
            enc.line('-'.repeat(COLS));
            enc.align('center').bold(true).line('LOYALTY STATEMENT').bold(false).align('left');
            
            if (sale.pointsUsedCount && sale.pointsUsedCount > 0) {
                enc.line(this.row('Points Used:', `${sale.pointsUsedCount.toLocaleString()} pts`));
            }
            if (pointsEarned && pointsEarned > 0) {
                enc.line(this.row('Points Earned:', `${pointsEarned.toLocaleString()} pts`));
            }
            if (sale.pointsBalance !== undefined) {
                enc.bold(true).line(this.row('New Balance:', `${Number(sale.pointsBalance).toLocaleString()} pts`)).bold(false);
            } else if (customer) {
                const balance = (customer as any).current_points || (customer as any).loyaltyPoints || 0;
                enc.bold(true).line(this.row('New Balance:', `${Number(balance).toLocaleString()} pts`)).bold(false);
            }
        }

        // ─── FOOTER (centered) ────────────────────────────────────────────
        // Matches: text-center mt-6
        enc.newline();
        enc.align('center');
        enc.line('Thank you for your purchase!');
        enc.line('Pos System by Bhagoh');
        enc.newline().newline().newline();
        enc.cut();

        return enc.encode();
    }

    public generateZReadingReceipt(data: any, settings?: any): Uint8Array {
        // 58mm thermal paper = 32 characters per line
        const W = 32;

        const enc = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson',
            width: W,
        }).initialize().codepage('cp437');

        const center = (text: string) => {
            const t = text.substring(0, W);
            const pad = Math.max(0, Math.floor((W - t.length) / 2));
            return ' '.repeat(pad) + t;
        };

        const row = (left: string, right: string) => {
            const spaces = W - left.length - right.length;
            if (spaces <= 0) return (left + ' ' + right).substring(0, W);
            return left + ' '.repeat(spaces) + right;
        };

        const fmt = (n: number) =>
            n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const dash = '-'.repeat(W);

        const stripLead = (val: string | number | undefined) => {
            const str = String(val || '0');
            if (/^0+$/.test(str)) return '0';
            return str.replace(/^0+/, '') || '0';
        };

        // Use settings from API exactly as-is (no forced uppercase)
        const bizName = settings?.businessName || "NICOLE'S SUPERMARKET";
        const address = settings?.address || 'Paniqui, Tarlac';
        const tin = settings?.tin || '123-456-789-00000';
        const minNumber = data.terminalMin || settings?.minNumber || '1234567890';
        const serialNumber = data.terminalSerialNumber || settings?.serialNumber || '0987654321-11';

        // ── HEADER ──────────────────────────────────────────────────────────
        // Mirrors: headerDiv > headerTitle (center, bold)
        enc.bold(true).line(center(bizName)).bold(false);
        enc.line(center('Operated by: Facunla Enterprise Inc.'));
        enc.line(center(address));
        enc.line(center(`VAT REG TIN: ${tin}`));
        enc.line(center(`MIN: ${minNumber}`));
        enc.line(center(`S/N: ${serialNumber}`));

        // ── TITLE ────────────────────────────────────────────────────────────
        // Mirrors: sectionTitle (center, bold, marginTop:5px)
        enc.align('center').bold(true).line('Z-READING REPORT').bold(false).align('left');

        // ── DATE SECTION ─────────────────────────────────────────────────────
        // Mirrors: section { marginBottom: 2px } with rows
        const reportDate = data.reportDate ? new Date(data.reportDate) : new Date();
        const startTime  = new Date(reportDate);
        startTime.setHours(9, 0, 0, 0);

        enc.line(row('Report Date:', format(reportDate, 'MMMM d, yyyy')));
        enc.line(row('Report Time:', format(reportDate, 'h:mm a')));
        enc.line(row('Start:', format(startTime, 'MM/dd/yy h:mm a')));
        enc.line(row('End:',   format(reportDate, 'MM/dd/yy h:mm a')));

        // ── COUNTER SECTION ──────────────────────────────────────────────────
        // Mirrors: second section block (no separator from date section, just margin)
        enc.line(row('Beg. SI #:',        stripLead(data.minSaleId)));
        enc.line(row('End. SI #:',        stripLead(data.maxSaleId)));
        enc.line(row('Beg. VOID #:',      stripLead(data.minVoidId)));
        enc.line(row('End. VOID #:',      stripLead(data.maxVoidId)));
        enc.line(row('Beg. RETURN #:',    stripLead(data.minReturnId || '0')));
        enc.line(row('End. RETURN #:',    stripLead(data.maxReturnId || '0')));
        enc.line(row('Reset Counter No.', '0'));
        enc.line(row('Z Counter No. :',   '1'));

        // ── SALES TOTALS ─────────────────────────────────────────────────────
        // Mirrors: DashedLine + section
        enc.line(dash);
        enc.line(row('Present Sales:',     fmt(data.netSales || 0)));
        enc.line(row('Previous Sales:',    fmt(data.previousReading || 0)));
        enc.bold(true).line(row('Sales for the Day:', fmt(data.netSales || 0))).bold(false);

        // ── BREAKDOWN OF SALES ───────────────────────────────────────────────
        // Mirrors: DashedLine + sectionTitle + section
        enc.line(dash);
        enc.align('center').bold(true).line('BREAKDOWN OF SALES').bold(false).align('left');
        enc.line(row('VATABLE SALES :',   fmt(data.vatSales  || 0)));
        enc.line(row('VAT AMOUNT:',       fmt(data.vatAmount || 0)));
        enc.line(row('VAT EXEMPT SALES:', fmt(data.vatExempt || 0)));
        enc.line(row('ZERO RATED SALES:', fmt(data.zeroRated || 0)));

        // ── GROSS → NET ──────────────────────────────────────────────────────
        // Mirrors: DashedLine + section
        enc.line(dash);
        enc.line(row('Gross Amount:',        fmt(data.grossSales    || 0)));
        enc.line(row('Less Discount:',       fmt(data.discounts     || 0)));
        enc.line(row('Less Return:',         fmt(data.returns       || 0)));
        enc.line(row('Less Void:',           fmt(data.voidAmount    || 0)));
        enc.line(row('Less VAT Adjustment:', fmt(data.vatAdjustment || 0)));
        enc.bold(true).line(row('Net Amount:', fmt(data.netSales || 0))).bold(false);

        // ── DISCOUNT SUMMARY ─────────────────────────────────────────────────
        // Mirrors: DashedLine + sectionTitle + section
        enc.line(dash);
        enc.align('center').bold(true).line('DISCOUNT SUMMARY').bold(false).align('left');
        enc.line(row('SC Disc. :',          '0.00'));
        enc.line(row('PWD Disc. :',         '0.00'));
        enc.line(row('NAAC Disc. :',        '0.00'));
        enc.line(row('Solo Parent Disc. :', '0.00'));
        enc.line(row('Other Disc. :',       fmt(data.discounts || 0)));

        // ── SALES ADJUSTMENT ─────────────────────────────────────────────────
        // Mirrors: DashedLine + sectionTitle + section
        enc.line(dash);
        enc.align('center').bold(true).line('SALES ADJUSTMENT').bold(false).align('left');
        enc.line(row('VOID :',   '0.00'));
        enc.line(row('RETURN :', fmt(data.returns || 0)));

        // ── VAT ADJUSTMENT ───────────────────────────────────────────────────
        // Mirrors: DashedLine + sectionTitle + section
        enc.line(dash);
        enc.align('center').bold(true).line('VAT ADJUSTMENT').bold(false).align('left');
        enc.line(row('SC TRANS. :',           '0.00'));
        enc.line(row('PWD TRANS :',           '0.00'));
        enc.line(row('REG.Disc. TRANS :',     '0.00'));
        enc.line(row('ZERO-RATED TRANS.:',    '0.00'));
        enc.line(row('VAT on Return:',        '0.00'));
        enc.line(row('Other VAT Adjustments', '0.00'));

        // ── TRANSACTION SUMMARY ──────────────────────────────────────────────
        // Mirrors: DashedLine + sectionTitle + section
        enc.line(dash);
        enc.align('center').bold(true).line('TRANSACTION SUMMARY').bold(false).align('left');
        (data.paymentMethods || []).forEach((method: any) => {
            enc.line(row(`${method.name.toUpperCase()}:`, fmt(method.amount || 0)));
        });
        enc.line(row('Opening Fund:',    fmt(data.startingCash || 0)));
        enc.line(row('Less Withdrawal:', '0.00'));
        const totalPayments = (data.paymentMethods || [])
            .reduce((acc: number, m: any) => acc + (m.amount || 0), 0);
        enc.bold(true).line(row('Payments Received:', fmt(totalPayments))).bold(false);

        // ── SHORT/OVER ───────────────────────────────────────────────────────
        // Mirrors: DashedLine + section + DashedLine
        enc.line(dash);
        enc.line(row('SHORT/OVER:', '0.00'));
        enc.line(dash);

        // ── FOOTER ───────────────────────────────────────────────────────────
        // Mirrors: footer (center, 10px text) + THIS IS NOT...
        enc.newline();
        enc.align('center');
        enc.line('This Receipt shall be valid for');
        enc.line('five (5) years from the date of');
        enc.line('the permit to use.');
        enc.newline();
        enc.bold(true).line('THIS IS NOT AN OFFICIAL RECEIPT').bold(false);

        enc.newline().newline().newline();
        enc.cut();

        return enc.encode();
    }

    /** Format number as currency string */
    private fmt(amount: number): string {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /** Create a left+right padded row that fills `width` characters */
    private row(left: string, right: string, width: number = COLS): string {
        const spaces = width - left.length - right.length;
        if (spaces <= 0) return `${left} ${right}`.substring(0, width);
        return `${left}${' '.repeat(spaces)}${right}`;
    }

    /** Word-wrap `text` into lines of at most `maxWidth` characters */
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
