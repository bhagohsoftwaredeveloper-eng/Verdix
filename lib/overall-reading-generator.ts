
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';
import { OverallReadingData } from '@/app/(app)/sales/overall-reading/overall-reading-preview';

const W = 32;

export class OverallReadingGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson',
            width: W
        });
    }

    public generate(data: OverallReadingData): Uint8Array {
        const {
            terminalId,
            terminalName,
            startDate,
            endDate,
            grossSales,
            netSales,
            totalDiscounts,
            transactionCount,
            cashiers,
            businessSettings,
            terminalInfo
        } = data;

        const center = (text: any) => {
            const str = String(text || '').substring(0, W);
            const pad = Math.max(0, Math.floor((W - str.length) / 2));
            return ' '.repeat(pad) + str;
        };

        const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const enc = this.encoder
            .initialize()
            .codepage('cp437');
        
        enc.bold(true).line(center(businessSettings.businessName.toUpperCase())).bold(false);
        if (businessSettings.address) enc.line(center(businessSettings.address));
        if (businessSettings.tin) enc.line(center(`VAT REG TIN: ${businessSettings.tin}`));
        if (terminalInfo.min) enc.line(center(`MIN: ${terminalInfo.min}`));
        if (terminalInfo.sn) enc.line(center(`S/N: ${terminalInfo.sn}`));
        enc.line(center(`Terminal: ${terminalId}`));
        
        enc.newline()
           .bold(true)
           .line(center('OVERALL TERMINAL READING'))
           .bold(false)
           .newline()
           .align('left')
           .table(
                [
                    { width: 12, align: 'left' },
                    { width: 20, align: 'right' }
                ],
                [
                    ['Report Date:', format(new Date(endDate), 'MM/dd/yy h:mm a')],
                    ['From:', startDate ? format(new Date(startDate), 'MM/dd/yy h:mm a') : 'Creation'],
                    ['To:', format(new Date(endDate), 'MM/dd/yy h:mm a')]
                ]
            )
            .line('--------------------------------')
            .bold(true).line(center('TERMINAL PERFORMANCE')).bold(false)
            .table(
                [
                    { width: 20, align: 'left' },
                    { width: 12, align: 'right' }
                ],
                [
                    ['Gross Sales:', formatCurrency(grossSales)],
                    ['Total Discounts:', formatCurrency(totalDiscounts)],
                    ['NET SALES:', formatCurrency(netSales)],
                    ['Transactions:', String(transactionCount)]
                ]
            )
            .line('--------------------------------')
            .bold(true).line(center('TERMINAL BREAKDOWN')).bold(false)
            .table(
                [
                    { width: 12, align: 'left' },
                    { width: 8, align: 'right' },
                    { width: 12, align: 'right' }
                ],
                [
                    ['TERMINAL', 'TXNS', 'AMOUNT'],
                    ['------------', '----', '----------']
                ]
            );

        data.terminals.forEach(t => {
            enc.table(
                [
                    { width: 12, align: 'left' },
                    { width: 8, align: 'right' },
                    { width: 12, align: 'right' }
                ],
                [[t.terminalName.toUpperCase(), String(t.transactionCount), formatCurrency(t.netSales)]]
            );
        });

        if (data.terminals.length === 0) {
            enc.line(center('No terminal data'));
        }

        enc
            .line('--------------------------------')
            .bold(true).line(center('CASHIER BREAKDOWN')).bold(false)
            .table(
                [
                    { width: 12, align: 'left' },
                    { width: 8, align: 'right' },
                    { width: 12, align: 'right' }
                ],
                [
                    ['CASHIER', 'TXNS', 'AMOUNT'],
                    ['------------', '----', '----------']
                ]
            );

        cashiers.forEach(c => {
            enc.table(
                [
                    { width: 12, align: 'left' },
                    { width: 8, align: 'right' },
                    { width: 12, align: 'right' }
                ],
                [[c.cashierName.toUpperCase(), String(c.transactionCount), formatCurrency(c.netSales)]]
            );
        });

        if (cashiers.length === 0) {
            enc.line(center('No cashier data'));
        }

        enc
            .line('--------------------------------')
            .newline()
            .align('center')
            .line('End of Overall Reading')
            .newline()
            .bold(true)
            .line('THIS IS NOT AN OFFICIAL RECEIPT')
            .bold(false)
            .newline()
            .cut();

        return enc.encode();
    }
}
