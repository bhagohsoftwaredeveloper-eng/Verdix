import { format } from 'date-fns';
import type { OverallReadingData } from './overall-reading-types';
import { formatCurrency } from './overall-reading-types';

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
  },
};

interface Props {
  data: OverallReadingData;
}

export function OverallReadingA4({ data }: Props) {
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
