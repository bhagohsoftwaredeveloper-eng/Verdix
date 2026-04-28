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

type PrinterFormat = '58mm' | '80mm';

interface OverallReadingPreviewProps {
  data: OverallReadingData;
  printerFormat?: PrinterFormat;
}

export function OverallReadingPreview({ data, printerFormat = '58mm' }: OverallReadingPreviewProps) {
  const is58mm = printerFormat === '58mm';
  
  const DashedLine = () => (
    <div style={{ width: '100%', borderTop: '1px dashed black', margin: '5px 0' }} />
  );

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const styles = {
    container: {
        width: '100%',
        margin: '0', 
        backgroundColor: 'white',
        color: 'black',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px', 
        lineHeight: '1.2',
        padding: '4mm',
        fontWeight: 'bold',
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
    },
    sectionTitle: {
        textAlign: 'center' as const,
        marginTop: '5px',
        marginBottom: '2px',
        fontWeight: 'bold',
        fontSize: '12px',
        textTransform: 'uppercase' as const,
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '2px', 
    },
    section: {
        marginBottom: '2px',
    },
    bold: {
        fontWeight: 'bold',
    },
    footer: {
        marginTop: '10px',
        marginBottom: '10px',
        textAlign: 'center' as const,
        fontSize: '10px',
    },
    center: {
        textAlign: 'center' as const,
    }
  };

  return (
    <div style={styles.container} className="printable-area">
      
      {/* Business Header */}
      <div style={styles.headerDiv}>
        <div style={styles.headerTitle}>{data.businessSettings.businessName}</div>
        <div style={{ fontSize: '10px' }}>{data.businessSettings.address}</div>
        <div style={{ fontSize: '10px' }}>VAT REG TIN: {data.businessSettings.tin}</div>
        <div style={{ fontSize: '10px' }}>MIN: {data.terminalInfo.min}</div>
        <div style={{ fontSize: '10px' }}>S/N: {data.terminalInfo.sn}</div>
        <div style={{ fontSize: '10px' }}>Terminal: {data.terminalId}</div>
      </div>

      <div style={styles.sectionTitle}>
        <div>OVERALL TERMINAL READING</div>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span>Report Date:</span>
          <span>{format(new Date(data.endDate), 'MM/dd/yyyy h:mm a')}</span>
        </div>
        <div style={styles.row}>
          <span>From:</span>
          <span style={{textAlign: 'right'}}>{data.startDate ? format(new Date(data.startDate), 'MM/dd/yy h:mm a') : 'Creation'}</span>
        </div>
        <div style={styles.row}>
          <span>To:</span>
          <span style={{textAlign: 'right'}}>{format(new Date(data.endDate), 'MM/dd/yy h:mm a')}</span>
        </div>
      </div>

      <DashedLine />

      <div style={styles.sectionTitle}>
        <div>TERMINAL PERFORMANCE</div>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span>Gross Sales:</span>
          <span>{formatCurrency(data.grossSales)}</span>
        </div>
        <div style={styles.row}>
          <span>Total Discounts:</span>
          <span>{formatCurrency(data.totalDiscounts)}</span>
        </div>
        <div style={{ ...styles.row, ...styles.bold }}>
          <span>Net Sales:</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
        <div style={styles.row}>
          <span>Transactions:</span>
          <span>{data.transactionCount}</span>
        </div>
      </div>

      <div style={styles.sectionTitle}>
        <div>TERMINAL BREAKDOWN</div>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span style={{flex: 1}}>TERMINAL</span>
          <span style={{width: '40px', textAlign: 'right'}}>TXNS</span>
          <span style={{width: '80px', textAlign: 'right'}}>AMOUNT</span>
        </div>
        <DashedLine />
        {data.terminals.map((term, idx) => (
          <div key={idx} style={styles.row}>
            <span style={{flex: 1, textTransform: 'uppercase'}}>{term.terminalName}</span>
            <span style={{width: '40px', textAlign: 'right'}}>{term.transactionCount}</span>
            <span style={{width: '80px', textAlign: 'right'}}>{formatCurrency(term.netSales)}</span>
          </div>
        ))}
        {data.terminals.length === 0 && (
          <div style={{ ...styles.center, fontStyle: 'italic', fontSize: '10px' }}>No terminal data</div>
        )}
      </div>

      <DashedLine />

      <div style={styles.sectionTitle}>
        <div>CASHIER BREAKDOWN</div>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span style={{flex: 1}}>CASHIER</span>
          <span style={{width: '40px', textAlign: 'right'}}>TXNS</span>
          <span style={{width: '80px', textAlign: 'right'}}>AMOUNT</span>
        </div>
        <DashedLine />
        {data.cashiers.map((cashier, idx) => (
          <div key={idx} style={styles.row}>
            <span style={{flex: 1, textTransform: 'uppercase'}}>{cashier.cashierName}</span>
            <span style={{width: '40px', textAlign: 'right'}}>{cashier.transactionCount}</span>
            <span style={{width: '80px', textAlign: 'right'}}>{formatCurrency(cashier.netSales)}</span>
          </div>
        ))}
        {data.cashiers.length === 0 && (
          <div style={{ ...styles.center, fontStyle: 'italic', fontSize: '10px' }}>No cashier data</div>
        )}
      </div>

      <DashedLine />
      
      <div style={styles.footer}>
          <div style={{marginTop: '5px', fontStyle: 'italic'}}>End of Overall Reading Report</div>
      </div>
    
      <div style={{ ...styles.center, ...styles.bold }}>
         <div>THIS IS NOT AN OFFICIAL RECEIPT</div>
      </div>

    </div>
  );
}
