import { format } from 'date-fns';

export type OverallReadingData = {
  terminalId: string;
  terminalName: string;
  startDate: string | null;
  endDate: string;
  grossSales: number;
  netSales: number;
  totalDiscounts: number;
  transactionCount: number;
  vatSales: number;
  vatAmount: number;
  vatExempt: number;
  zeroRated: number;
  nonVat: number;
  voidAmount: number;
  voidCount: number;
  returnAmount: number;
  returnCount: number;
  vatAdjustment: number;
  startingCash: number;
  cashSales: number;
  cashInDrawer: number;
  actualCash: number;
  variance: number;
  paymentMethods: Array<{ name: string; amount: number }>;
  discountSummary: Array<{ type: string; amount: number; count: number; itemCount: number }>;
  salesAdjustment: {
    void: { count: number; amount: number };
    return: { count: number; amount: number };
  };
  terminals: Array<{
    terminalId: string;
    terminalName: string;
    netSales: number;
    transactionCount: number;
  }>;
  cashiers: Array<{
    cashierName: string;
    cashierId: string;
    netSales: number;
    transactionCount: number;
  }>;
  businessSettings: {
    businessName: string;
    address: string;
    tin: string;
    contactNumber: string;
  };
  terminalInfo: {
    min: string;
    sn: string;
  };
};

type PrinterFormat = '58mm' | '80mm' | 'A4';

interface OverallReadingPreviewProps {
  data: OverallReadingData;
  printerFormat?: PrinterFormat;
}

export function OverallReadingPreview({ data, printerFormat = '58mm' }: OverallReadingPreviewProps) {
  const formatCurrency = (amount: number) =>
    (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isA4 = printerFormat === 'A4';

  const DashedLine = () => (
    <div style={{ width: '100%', borderTop: '1px dashed black', margin: '5px 0' }} />
  );

  const SolidLine = () => (
    <div style={{ width: '100%', borderTop: '1px solid black', margin: '3px 0' }} />
  );

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
    }
  };

  const a4Styles = {
    container: {
        width: '210mm',
        margin: '0 auto',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.5',
        padding: '15mm',
        boxSizing: 'border-box' as const,
    },
    header: {
        textAlign: 'center' as const,
        marginBottom: '20px',
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '5px',
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '15px',
    },
    section: {
        marginBottom: '20px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '10px',
        borderBottom: '2px solid #333',
        paddingBottom: '5px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        marginBottom: '15px',
    },
    th: {
        borderBottom: '1px solid #ddd',
        padding: '8px',
        textAlign: 'left' as const,
        backgroundColor: '#f9f9f9',
        fontWeight: 'bold',
    },
    td: {
        borderBottom: '1px solid #ddd',
        padding: '8px',
        textAlign: 'left' as const,
    },
    textRight: {
        textAlign: 'right' as const,
    },
    totalsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px',
        marginBottom: '20px',
    },
    totalCard: {
        border: '1px solid #ddd',
        padding: '15px',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9',
    },
    totalLabel: {
        fontSize: '12px',
        color: '#666',
        textTransform: 'uppercase' as const,
    },
    totalValue: {
        fontSize: '20px',
        fontWeight: 'bold',
        marginTop: '5px',
    }
  };

  if (isA4) {
    return (
      <div style={a4Styles.container} className="printable-area">
        <div style={a4Styles.header}>
            <div style={a4Styles.title}>{data.businessSettings.businessName}</div>
            <div>{data.businessSettings.address}</div>
            <div>VAT REG TIN: {data.businessSettings.tin}</div>
            <div style={a4Styles.subtitle}>OVERALL READING REPORT</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '12px' }}>
                <div>
                    <strong>Terminal:</strong> {data.terminalId} {data.terminalName ? `(${data.terminalName})` : ''}
                </div>
                <div>
                    <strong>Date:</strong> {format(new Date(), 'PPpp')}
                </div>
            </div>
        </div>

        <div style={a4Styles.section}>
            <div style={a4Styles.sectionTitle}>Summary Totals</div>
            <div style={a4Styles.totalsGrid}>
                <div style={a4Styles.totalCard}>
                    <div style={a4Styles.totalLabel}>Net Sales</div>
                    <div style={a4Styles.totalValue}>₱{formatCurrency(data.netSales)}</div>
                </div>
                <div style={a4Styles.totalCard}>
                    <div style={a4Styles.totalLabel}>Gross Sales</div>
                    <div style={a4Styles.totalValue}>₱{formatCurrency(data.grossSales)}</div>
                </div>
                <div style={a4Styles.totalCard}>
                    <div style={a4Styles.totalLabel}>Transactions</div>
                    <div style={a4Styles.totalValue}>{data.transactionCount}</div>
                </div>
                <div style={a4Styles.totalCard}>
                    <div style={a4Styles.totalLabel}>Total Discounts</div>
                    <div style={a4Styles.totalValue}>₱{formatCurrency(data.totalDiscounts)}</div>
                </div>
            </div>
        </div>

        {data.paymentMethods?.length > 0 && (
            <div style={a4Styles.section}>
                <div style={a4Styles.sectionTitle}>Payment Methods</div>
                <table style={a4Styles.table}>
                    <thead>
                        <tr>
                            <th style={a4Styles.th}>Method</th>
                            <th style={{ ...a4Styles.th, ...a4Styles.textRight }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.paymentMethods.map((pm, idx) => (
                            <tr key={idx}>
                                <td style={a4Styles.td}>{pm.name}</td>
                                <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(pm.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        <div style={a4Styles.section}>
            <div style={a4Styles.sectionTitle}>VAT Breakdown</div>
            <table style={a4Styles.table}>
                <tbody>
                    <tr>
                        <td style={a4Styles.td}>VATable Sales</td>
                        <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(data.vatSales)}</td>
                    </tr>
                    <tr>
                        <td style={a4Styles.td}>VAT Amount (12%)</td>
                        <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(data.vatAmount)}</td>
                    </tr>
                    {data.vatExempt > 0 && (
                        <tr>
                            <td style={a4Styles.td}>VAT Exempt</td>
                            <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(data.vatExempt)}</td>
                        </tr>
                    )}
                    {data.zeroRated > 0 && (
                        <tr>
                            <td style={a4Styles.td}>Zero Rated</td>
                            <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(data.zeroRated)}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {data.terminals?.some(t => t.netSales > 0 || t.transactionCount > 0) && (
            <div style={a4Styles.section}>
                <div style={a4Styles.sectionTitle}>Terminal Breakdown</div>
                <table style={a4Styles.table}>
                    <thead>
                        <tr>
                            <th style={a4Styles.th}>Terminal</th>
                            <th style={{ ...a4Styles.th, ...a4Styles.textRight }}>Transactions</th>
                            <th style={{ ...a4Styles.th, ...a4Styles.textRight }}>Net Sales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.terminals.filter(t => t.netSales > 0 || t.transactionCount > 0).map((term, idx) => (
                            <tr key={idx}>
                                <td style={a4Styles.td}>{term.terminalName}</td>
                                <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>{term.transactionCount}</td>
                                <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(term.netSales)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {data.cashiers?.some(c => c.netSales > 0 || c.transactionCount > 0) && (
            <div style={a4Styles.section}>
                <div style={a4Styles.sectionTitle}>Cashier Breakdown</div>
                <table style={a4Styles.table}>
                    <thead>
                        <tr>
                            <th style={a4Styles.th}>Cashier</th>
                            <th style={{ ...a4Styles.th, ...a4Styles.textRight }}>Transactions</th>
                            <th style={{ ...a4Styles.th, ...a4Styles.textRight }}>Net Sales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.cashiers.filter(c => c.netSales > 0 || c.transactionCount > 0).map((cashier, idx) => (
                            <tr key={idx}>
                                <td style={a4Styles.td}>{cashier.cashierName}</td>
                                <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>{cashier.transactionCount}</td>
                                <td style={{ ...a4Styles.td, ...a4Styles.textRight }}>₱{formatCurrency(cashier.netSales)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '10px', color: '#aaa' }}>
            End of Overall Reading Report • THIS IS NOT AN OFFICIAL RECEIPT
        </div>
      </div>
    );
  }

  // ── Receipt Layout (58mm/80mm) ──────────────────────────────────────────────
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
