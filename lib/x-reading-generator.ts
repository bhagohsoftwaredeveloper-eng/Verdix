
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { format } from 'date-fns';
import { XReadingData } from './types';

export class XReadingGenerator {
    private encoder: any;

    constructor() {
        this.encoder = new ReceiptPrinterEncoder({
            language: 'esc-pos',
            codepageMapping: 'epson'
        });
    }

    public generate(data: XReadingData): Uint8Array {
        const {
            reportDate,
            grossSales,
            returns,
            discounts,
            netSales,
            vatAmount,
            paymentMethods,
            transactionCount,
            terminalId,
            cashierName,
            shiftStart,
            shiftEnd,
            startingCash,
            cashSales,
            cashDeposit,
            cashPickup,
            cashCountTotal,
            overShort
        } = data;

        const dateStr = format(new Date(reportDate), 'PP p');
        const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let encoder = this.encoder
            .initialize()
            .codepage('cp437')
            .align('center')
            .bold(true)
            .line('X-READING REPORT')
            .bold(false)
            .line('STOCK PILOT')
            .line(dateStr)
            .newline()
            .align('left')
            .line(`Shift Start: ${shiftStart ? format(new Date(shiftStart), 'PP p') : 'N/A'}`)
            .line(`Shift End: ${shiftEnd ? format(new Date(shiftEnd), 'PP p') : 'Active'}`)
            .line(`Register: ${terminalId}`)
            .line(`Staff: ${cashierName}`)
            .rule({ style: 'double' })
            
            // Financial Summary
            .bold(true).align('center').line('CURRENT FINANCIALS').bold(false).align('left')
            .rule()
            .table(
                [
                    { width: 20, align: 'left' },
                    { width: 12, align: 'right' }
                ],
                [
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
            .rule();

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

            // Cash Summary
            .bold(true).align('center').line('CASH SUMMARY').bold(false).align('left')
            .rule()
            .table(
                [
                    { width: 20, align: 'left' },
                    { width: 12, align: 'right' }
                ],
                [
                    ['Opening Fund', formatCurrency(startingCash)],
                    ['Cash Sales', formatCurrency(cashSales)],
                    ['Cash Deposit', formatCurrency(cashDeposit || 0)],
                    ['Cash Pickup', `-${formatCurrency(cashPickup || 0)}`],
                    ['Expected Cash', formatCurrency(startingCash + cashSales + (cashDeposit || 0) - (cashPickup || 0))],
                    ['Actual Count', formatCurrency(cashCountTotal || 0)],
                    ['Difference', formatCurrency(overShort || 0)]
                ]
            )
            .newline()

            // Trans Stats
            .line(`Trans. Count: ${transactionCount}`)
            
            .newline()
            .align('center')
            .line('--- END OF X-READING ---')
            .newline()
            .newline()
            .newline()
            .cut();

        return encoder.encode();
    }
}
