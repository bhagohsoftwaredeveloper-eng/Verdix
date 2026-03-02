
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';
import { ZReadingData } from './types';

// 58mm thermal paper = 32 characters per line
const W = 32;

type BusinessSettings = {
    businessName?: string;
    address?: string;
    tin?: string;
    operatedBy?: string;
    minNumber?: string;
    serialNumber?: string;
    [key: string]: any;
};

export class ZReadingGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson',
            width: W,
        });
    }

    public generate(data: ZReadingData, settings?: BusinessSettings | null): Uint8Array {
        const enc = this.encoder.initialize().codepage('cp437');

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

        const bizName = settings?.businessName || "NICOLE'S SUPERMARKET";
        const address = settings?.address || 'Paniqui, Tarlac';
        const tin = settings?.tin || '123-456-789-00000';
        const operatedBy = settings?.operatedBy || 'Facunla Enterprise Inc.';
        const minNumber = settings?.minNumber || '1234567890';
        const serialNumber = settings?.serialNumber || '0987654321-11';

        // ── HEADER ──────────────────────────────────────────────────────────
        enc.bold(true).line(center(bizName)).bold(false);
        enc.line(center(`Operated by: ${operatedBy}`));
        enc.line(center(address));
        enc.line(center(`VAT REG TIN: ${tin}`));
        enc.line(center(`MIN: ${minNumber}`));
        enc.line(center(`S/N: ${serialNumber}`));

        // ── TITLE ────────────────────────────────────────────────────────────
        enc.align('center').bold(true).line('Z-READING REPORT').bold(false).align('left');

        // ── DATE SECTION ─────────────────────────────────────────────────────
        const reportDate = data.reportDate ? new Date(data.reportDate) : new Date();
        const startTime  = new Date(reportDate);
        startTime.setHours(9, 0, 0, 0);

        enc.line(row('Report Date:', format(reportDate, 'MMMM d, yyyy')));
        enc.line(row('Report Time:', format(reportDate, 'h:mm a')));
        enc.line(row('Start:', format(startTime, 'MM/dd/yy h:mm a')));
        enc.line(row('End:',   format(reportDate, 'MM/dd/yy h:mm a')));

        // ── COUNTER SECTION ──────────────────────────────────────────────────
        enc.line(row('Beg. SI #:',        stripLead(data.minSaleId)));
        enc.line(row('End. SI #:',        stripLead(data.maxSaleId)));
        enc.line(row('Beg. VOID #:',      stripLead(data.minVoidId)));
        enc.line(row('End. VOID #:',      stripLead(data.maxVoidId)));
        enc.line(row('Beg. RETURN #:',    stripLead(data.minReturnId || '0')));
        enc.line(row('End. RETURN #:',    stripLead(data.maxReturnId || '0')));
        enc.line(row('Reset Counter No.', '0'));
        enc.line(row('Z Counter No. :',   '1'));

        // ── SALES TOTALS ─────────────────────────────────────────────────────
        enc.line(dash);
        enc.line(row('Present Sales:',     fmt(data.netSales || 0)));
        enc.line(row('Previous Sales:',    fmt(data.previousReading || 0)));
        enc.bold(true).line(row('Sales for the Day:', fmt(data.netSales || 0))).bold(false);

        // ── BREAKDOWN OF SALES ───────────────────────────────────────────────
        enc.line(dash);
        enc.align('center').bold(true).line('BREAKDOWN OF SALES').bold(false).align('left');
        enc.line(row('VATABLE SALES :',   fmt(data.vatSales  || 0)));
        enc.line(row('VAT AMOUNT:',       fmt(data.vatAmount || 0)));
        enc.line(row('VAT EXEMPT SALES:', fmt(data.vatExempt || 0)));
        enc.line(row('ZERO RATED SALES:', fmt(data.zeroRated || 0)));

        // ── GROSS → NET ──────────────────────────────────────────────────────
        enc.line(dash);
        enc.line(row('Gross Amount:',        fmt(data.grossSales    || 0)));
        enc.line(row('Less Discount:',       fmt(data.discounts     || 0)));
        enc.line(row('Less Return:',         fmt(data.returns       || 0)));
        enc.line(row('Less Void:',           fmt(data.voidAmount    || 0)));
        enc.line(row('Less VAT Adjustment:', fmt(data.vatAdjustment || 0)));
        enc.bold(true).line(row('Net Amount:', fmt(data.netSales || 0))).bold(false);

        // ── DISCOUNT SUMMARY ─────────────────────────────────────────────────
        enc.line(dash);
        enc.align('center').bold(true).line('DISCOUNT SUMMARY').bold(false).align('left');
        enc.line(row('SC Disc. :',          '0.00'));
        enc.line(row('PWD Disc. :',         '0.00'));
        enc.line(row('NAAC Disc. :',        '0.00'));
        enc.line(row('Solo Parent Disc. :', '0.00'));
        enc.line(row('Other Disc. :',       fmt(data.discounts || 0)));

        // ── SALES ADJUSTMENT ─────────────────────────────────────────────────
        enc.line(dash);
        enc.align('center').bold(true).line('SALES ADJUSTMENT').bold(false).align('left');
        enc.line(row('VOID :',   '0.00'));
        enc.line(row('RETURN :', fmt(data.returns || 0)));

        // ── VAT ADJUSTMENT ───────────────────────────────────────────────────
        enc.line(dash);
        enc.align('center').bold(true).line('VAT ADJUSTMENT').bold(false).align('left');
        enc.line(row('SC TRANS. :',           '0.00'));
        enc.line(row('PWD TRANS :',           '0.00'));
        enc.line(row('REG.Disc. TRANS :',     '0.00'));
        enc.line(row('ZERO-RATED TRANS.:',    '0.00'));
        enc.line(row('VAT on Return:',        '0.00'));
        enc.line(row('Other VAT Adjustments', '0.00'));

        // ── TRANSACTION SUMMARY ──────────────────────────────────────────────
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
        enc.line(dash);
        enc.line(row('SHORT/OVER:', '0.00'));
        enc.line(dash);

        // ── FOOTER ───────────────────────────────────────────────────────────
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
}
