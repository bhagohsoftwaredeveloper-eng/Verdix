import { format } from 'date-fns';
import type { OverallReadingData } from './overall-reading-types';
import { formatCurrency } from './overall-reading-types';

const receiptStyles = {
  container: {
    width: '100%',
    margin: '0',
    backgroundColor: 'white',
    color: 'black',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '11px',
    lineHeight: '1.3',
    padding: '4mm',
  },
  headerDiv: {
    textAlign: 'center' as const,
    marginBottom: '5px',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: '14px',
    textTransform: 'uppercase' as const,
    marginBottom: '2px',
    fontWeight: 'bold',
  },
  sectionTitle: {
    textAlign: 'center' as const,
    marginTop: '5px',
    marginBottom: '2px',
    fontWeight: 'bold',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  footer: {
    marginTop: '10px',
    marginBottom: '10px',
    textAlign: 'center' as const,
    fontSize: '10px',
  },
};

const DashedLine = () => (
  <div style={{ width: '100%', borderTop: '1px dashed black', margin: '5px 0' }} />
);

const SolidLine = () => (
  <div style={{ width: '100%', borderTop: '1px solid black', margin: '3px 0' }} />
);

interface Props {
  data: OverallReadingData;
}

export function OverallReadingReceipt({ data }: Props) {
  return (
    <div style={receiptStyles.container} className="printable-area">

      {/* Business Header */}
      <div style={receiptStyles.headerDiv}>
        <div style={receiptStyles.headerTitle}>{data.businessSettings.businessName}</div>
        {data.businessSettings.address && <div style={{ fontSize: '10px' }}>{data.businessSettings.address}</div>}
        {data.businessSettings.tin && <div style={{ fontSize: '10px' }}>VAT REG TIN: {data.businessSettings.tin}</div>}
        {data.terminalInfo?.min && <div style={{ fontSize: '10px' }}>MIN: {data.terminalInfo.min}</div>}
        {data.terminalInfo?.sn  && <div style={{ fontSize: '10px' }}>S/N: {data.terminalInfo.sn}</div>}
        <div style={{ fontSize: '10px' }}>
          Terminal: {data.terminalId}{data.terminalName ? ` (${data.terminalName})` : ''}
        </div>
      </div>

      <DashedLine />
      <div style={{ ...receiptStyles.sectionTitle, fontSize: '13px' }}>OVERALL TERMINAL READING</div>
      <DashedLine />

      {/* Date range */}
      <div style={{ fontSize: '10px', marginBottom: '3px' }}>
        <div style={receiptStyles.row}>
          <span>From:</span>
          <span>{data.startDate ? format(new Date(data.startDate), 'MM/dd/yy hh:mm a') : '-'}</span>
        </div>
        <div style={receiptStyles.row}>
          <span>To:</span>
          <span>{format(new Date(data.endDate), 'MM/dd/yy hh:mm a')}</span>
        </div>
      </div>
      <DashedLine />

      {/* Summary */}
      <div style={receiptStyles.sectionTitle}>SUMMARY</div>
      <DashedLine />
      <div style={receiptStyles.row}>
        <span>GROSS SALES:</span>
        <span>{formatCurrency(data.grossSales)}</span>
      </div>
      {(data.returnAmount || 0) > 0 && (
        <div style={receiptStyles.row}>
          <span>RETURNS ({data.returnCount || 0}):</span>
          <span>({formatCurrency(data.returnAmount)})</span>
        </div>
      )}
      {(data.voidAmount || 0) > 0 && (
        <div style={receiptStyles.row}>
          <span>VOIDS ({data.voidCount || 0}):</span>
          <span>({formatCurrency(data.voidAmount)})</span>
        </div>
      )}
      {(data.totalDiscounts || 0) > 0 && (
        <div style={receiptStyles.row}>
          <span>DISCOUNTS:</span>
          <span>({formatCurrency(data.totalDiscounts)})</span>
        </div>
      )}
      <SolidLine />
      <div style={{ ...receiptStyles.row, fontWeight: 'bold' }}>
        <span>NET SALES:</span>
        <span>{formatCurrency(data.netSales)}</span>
      </div>
      <div style={receiptStyles.row}>
        <span>TRANSACTIONS:</span>
        <span>{data.transactionCount}</span>
      </div>
      <DashedLine />

      {/* Payment Methods */}
      {data.paymentMethods && data.paymentMethods.length > 0 && (
        <>
          <div style={receiptStyles.sectionTitle}>PAYMENT METHODS</div>
          <DashedLine />
          {data.paymentMethods.map((pm, idx) => (
            <div key={idx} style={receiptStyles.row}>
              <span>{pm.name.toUpperCase()}:</span>
              <span>{formatCurrency(pm.amount)}</span>
            </div>
          ))}
          <DashedLine />
        </>
      )}

      {/* VAT Breakdown */}
      <div style={receiptStyles.sectionTitle}>VAT BREAKDOWN</div>
      <DashedLine />
      <div style={receiptStyles.row}>
        <span>VATable Sales:</span>
        <span>{formatCurrency(data.vatSales || 0)}</span>
      </div>
      <div style={receiptStyles.row}>
        <span>VAT (12%):</span>
        <span>{formatCurrency(data.vatAmount || 0)}</span>
      </div>
      {(data.vatExempt || 0) > 0 && (
        <div style={receiptStyles.row}>
          <span>VAT Exempt:</span>
          <span>{formatCurrency(data.vatExempt)}</span>
        </div>
      )}
      {(data.zeroRated || 0) > 0 && (
        <div style={receiptStyles.row}>
          <span>Zero Rated:</span>
          <span>{formatCurrency(data.zeroRated)}</span>
        </div>
      )}
      {(data.nonVat || 0) > 0 && (
        <div style={receiptStyles.row}>
          <span>Non-VAT:</span>
          <span>{formatCurrency(data.nonVat)}</span>
        </div>
      )}
      <DashedLine />

      {/* Cash Summary */}
      {((data.startingCash || 0) > 0 || (data.cashSales || 0) > 0) && (
        <>
          <div style={receiptStyles.sectionTitle}>CASH SUMMARY</div>
          <DashedLine />
          <div style={receiptStyles.row}>
            <span>Starting Cash:</span>
            <span>{formatCurrency(data.startingCash || 0)}</span>
          </div>
          <div style={receiptStyles.row}>
            <span>Cash Sales:</span>
            <span>{formatCurrency(data.cashSales || 0)}</span>
          </div>
          <div style={receiptStyles.row}>
            <span>Expected in Drawer:</span>
            <span>{formatCurrency(data.cashInDrawer || 0)}</span>
          </div>
          {(data.actualCash || 0) > 0 && (
            <div style={receiptStyles.row}>
              <span>Actual Cash:</span>
              <span>{formatCurrency(data.actualCash)}</span>
            </div>
          )}
          {(data.variance || 0) !== 0 && (
            <div style={{ ...receiptStyles.row, color: (data.variance || 0) < 0 ? 'red' : 'green' }}>
              <span>Variance:</span>
              <span>{formatCurrency(data.variance || 0)}</span>
            </div>
          )}
          <DashedLine />
        </>
      )}

      {/* Terminal Breakdown */}
      {data.terminals?.some(t => t.netSales > 0 || t.transactionCount > 0) && (
        <>
          <div style={receiptStyles.sectionTitle}>TERMINAL BREAKDOWN</div>
          <div style={{ marginBottom: '2px' }}>
            <div style={receiptStyles.row}>
              <span style={{ flex: 1 }}>TERMINAL</span>
              <span style={{ width: '40px', textAlign: 'right' }}>TXNS</span>
              <span style={{ width: '80px', textAlign: 'right' }}>AMOUNT</span>
            </div>
            <DashedLine />
            {data.terminals.filter(t => t.netSales > 0 || t.transactionCount > 0).map((term, idx) => (
              <div key={idx} style={receiptStyles.row}>
                <span style={{ flex: 1, textTransform: 'uppercase' }}>{term.terminalName}</span>
                <span style={{ width: '40px', textAlign: 'right' }}>{term.transactionCount}</span>
                <span style={{ width: '80px', textAlign: 'right' }}>{formatCurrency(term.netSales)}</span>
              </div>
            ))}
          </div>
          <DashedLine />
        </>
      )}

      {/* Cashier Breakdown */}
      {data.cashiers?.some(c => c.netSales > 0 || c.transactionCount > 0) && (
        <>
          <div style={receiptStyles.sectionTitle}>CASHIER BREAKDOWN</div>
          <div style={{ marginBottom: '2px' }}>
            <div style={receiptStyles.row}>
              <span style={{ flex: 1 }}>CASHIER</span>
              <span style={{ width: '40px', textAlign: 'right' }}>TXNS</span>
              <span style={{ width: '80px', textAlign: 'right' }}>AMOUNT</span>
            </div>
            <DashedLine />
            {data.cashiers.filter(c => c.netSales > 0 || c.transactionCount > 0).map((cashier, idx) => (
              <div key={idx} style={receiptStyles.row}>
                <span style={{ flex: 1, textTransform: 'uppercase' }}>{cashier.cashierName}</span>
                <span style={{ width: '40px', textAlign: 'right' }}>{cashier.transactionCount}</span>
                <span style={{ width: '80px', textAlign: 'right' }}>{formatCurrency(cashier.netSales)}</span>
              </div>
            ))}
          </div>
          <DashedLine />
        </>
      )}

      <div style={receiptStyles.footer}>
        <div style={{ fontStyle: 'italic' }}>End of Overall Reading Report</div>
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
        <div>THIS IS NOT AN OFFICIAL RECEIPT</div>
      </div>

    </div>
  );
}
