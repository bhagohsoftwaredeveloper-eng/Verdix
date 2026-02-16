
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';
import { ZReadingData } from './types';

export class ZReadingGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson'
        });
    }

    public generate(data: ZReadingData): Uint8Array {
        const {
            reportDate,
            startingCash,
            grossSales,
            cashSales,
            returns,
            discounts,
            netSales,
            vatAmount,
            vatExempt,
            vatSales,
            zeroRated,
            paymentMethods,
            terminalId,
            cashierName,
            id
        } = data;

        const dateStr = format(new Date(reportDate), 'PP p');
        const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let encoder = this.encoder
            .initialize()
            .codepage('cp437')
            .align('center')
            .bold(true)
            .line('Z-READING REPORT')
            .bold(false)
            .line('STOCK PILOT')
            .line(dateStr)
            .newline()
            .align('left')
            .line(`Z-Reading #: ${id.substring(0, 8).toUpperCase()}`)
            .line(`Register: ${terminalId || 'N/A'}`)
            .line(`Staff: ${cashierName || 'N/A'}`)
            .rule({ style: 'double' })
            
            // Financial Summary
            .bold(true).align('center').line('FINANCIAL REPORT').bold(false).align('left')
            .rule()
            .table(
                [
                    { width: 20, align: 'left' },
                    { width: 12, align: 'right' }
                ],
                [
                    ['Opening Balance', formatCurrency(startingCash)],
                    ['Gross Sales', formatCurrency(grossSales)],
                    ['Returns', `-${formatCurrency(returns)}`],
                    ['Discounts', `-${formatCurrency(discounts)}`]
                ]
            )
            .rule()
            .bold(true)
            .table(
                 [
                    { width: 20, align: 'left' },
                    { width: 12, align: 'right' }
                ],
                [['NET SALES', formatCurrency(netSales)]]
            )
            .bold(false)
            .newline()

            // Tax Summary
            .bold(true).align('center').line('TAX SUMMARY').bold(false).align('left')
            .rule()
             .table(
                [
                    { width: 20, align: 'left' },
                    { width: 12, align: 'right' }
                ],
                [
                    ['VAT Amount', formatCurrency(vatAmount)],
                    ['Vatable Sales', formatCurrency(vatSales)],
                    ['VAT Exempt', formatCurrency(vatExempt)],
                    ['Zero Rated', formatCurrency(zeroRated)]
                ]
            )
            .newline()

            // Payment Methods
            .bold(true).align('center').line('PAYMENT METHODS').bold(false).align('left')
            .rule()
             .table(
                [
                    { width: 16, align: 'left' },
                    { width: 6, align: 'right' },
                    { width: 10, align: 'right' }
                ],
                [
                    ['Method', 'Cnt', 'Amount']
                ]
            )
            .rule({ style: 'single', width: 32 });

         const paymentRows = paymentMethods.map(pm => [
             pm.name,
             (pm.count || 0).toString(),
             formatCurrency(pm.amount)
         ]);

         encoder.table(
                [
                    { width: 16, align: 'left' },
                    { width: 6, align: 'right' },
                    { width: 10, align: 'right' }
                ],
                paymentRows
            )
            .newline()

            // Trans Stats
            .line(`Trans. Count: ${data.transactionCount}`)
            
            .newline()
            .align('center')
            .line('--- END OF Z-READING ---')
            .newline()
            .newline()
            .newline()
            .cut();

        return encoder.encode();
    }
}
