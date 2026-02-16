import React from 'react';
import { format } from 'date-fns';

export type ZReadingData = {
  id: string;
  date: string;
  reportDate: Date;
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  vatSales: number;
  vatAmount: number;
  vatExempt: number;
  zeroRated: number;
  nonVat: number;
  paymentMethods: Array<{ name: string; amount: number }>;
  transactionCount: number;
  startingCash: number;
  cashSales: number;
  cashInDrawer: number;
  cashierName?: string;
  terminalId?: string;
  minSaleId?: string;
  maxSaleId?: string;
  previousReading?: number;
  runningTotal?: number;
};

type PrinterFormat = '58mm' | '80mm';


export type BusinessSettings = {
  businessName: string;
  address: string;
  contactNumber: string;
  tin: string;
  logoPath?: string;
};

interface ZReadingPreviewProps {
  data: ZReadingData;
  printerFormat: PrinterFormat;
  businessSettings: BusinessSettings | null;
}

export const ZReadingPreview = React.forwardRef<HTMLDivElement, ZReadingPreviewProps>(({ data, printerFormat, businessSettings }, ref) => {
  const is58mm = printerFormat === '58mm';
  // Helper for dashed line
  const DashedLine = () => (
    <div style={{ width: '100%', borderTop: '1px dashed black', margin: '5px 0' }} />
  );

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reportDate = new Date(data.reportDate);
  const startTime = new Date(data.reportDate); 
  startTime.setHours(9, 0, 0, 0); // Mock 9 AM start
  
  const minSi = data.minSaleId || '0000000000001';
  const maxSi = data.maxSaleId || '0000000000001';

  const styles = {
    container: {
        width: '100%',
        margin: '0',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px', // Standard receipt font size
        lineHeight: '1.2',
        padding: '2mm', 
    },
    headerDiv: {
        textAlign: 'center' as const,
        marginBottom: '10px',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: '14px',
        textTransform: 'uppercase' as const,
        marginBottom: '4px',
    },
    sectionTitle: {
        textAlign: 'center' as const,
        marginTop: '5px',
        marginBottom: '5px',
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
        marginBottom: '5px',
    },
    bold: {
        fontWeight: 'bold',
    },
    footer: {
        marginTop: '20px',
        marginBottom: '20px',
        textAlign: 'center' as const,
        fontSize: '10px',
    },
    center: {
        textAlign: 'center' as const,
    }
  };

  return (
    <div style={styles.container} ref={ref}>
      {/* Business Header */}
      <div style={styles.headerDiv}>
        <div style={styles.headerTitle}>{businessSettings?.businessName || 'NICOLE\'S SUPERMARKET'}</div>
        <div style={{ fontSize: '10px' }}>Operated by: Facunla Enterprise Inc.</div>
        <div style={{ fontSize: '10px' }}>{businessSettings?.address || 'Paniqui, Tarlac'}</div>
        <div style={{ fontSize: '10px' }}>VAT REG TIN: {businessSettings?.tin || '123-456-789-00000'}</div>
        <div style={{ fontSize: '10px' }}>MIN: 1234567890</div>
        <div style={{ fontSize: '10px' }}>S/N: 0987654321-11</div>
      </div>

      <div style={styles.sectionTitle}>
        <div>Z-READING REPORT</div>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span>Report Date:</span>
          <span>{format(reportDate, 'MMMM d, yyyy')}</span>
        </div>
        <div style={styles.row}>
          <span>Report Time:</span>
          <span>{format(reportDate, 'h:mm a')}</span>
        </div>
        <div style={styles.row}>
          <span>Start:</span>
          <span>{format(startTime, 'MM/dd/yy h:mm a')}</span>
        </div>
        <div style={styles.row}>
          <span>End:</span>
          <span>{format(reportDate, 'MM/dd/yy h:mm a')}</span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span>Beg. SI #:</span>
          <span>{minSi}</span>
        </div>
        <div style={styles.row}>
          <span>End. SI #:</span>
          <span>{maxSi}</span>
        </div>
        <div style={styles.row}>
          <span>Beg. VOID #:</span>
          <span>0000000000001</span>
        </div>
         <div style={styles.row}>
          <span>End. VOID #:</span>
          <span>0000000000001</span>
        </div>
         <div style={styles.row}>
          <span>Beg. RETURN #:</span>
          <span>0000000000000</span>
        </div>
         <div style={styles.row}>
          <span>End. RETURN #:</span>
          <span>0000000000000</span>
        </div>
         <div style={styles.row}>
          <span>Reset Counter No.</span>
          <span>0</span>
        </div>
         <div style={styles.row}>
          <span>Z Counter No. :</span>
          <span>1</span>
        </div>
      </div>

      <DashedLine />

      <div style={styles.section}>
        <div style={styles.row}>
          <span>Present Sales:</span>
          <span>{formatCurrency(data.netSales)}</span> 
        </div>
         <div style={styles.row}>
          <span>Previous Sales:</span>
          <span>{formatCurrency(data.previousReading || 0)}</span>
        </div>
         <div style={{ ...styles.row, ...styles.bold }}>
          <span>Sales for the Day:</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
      </div>

      <DashedLine />

      <div style={styles.sectionTitle}>
        <div>BREAKDOWN OF SALES</div>
      </div>

      <div style={styles.section}>
         <div style={styles.row}>
          <span>VATABLE SALES :</span>
          <span>{formatCurrency(data.vatSales)}</span>
        </div>
         <div style={styles.row}>
          <span>VAT AMOUNT:</span>
          <span>{formatCurrency(data.vatAmount)}</span>
        </div>
         <div style={styles.row}>
          <span>VAT EXEMPT SALES:</span>
          <span>{formatCurrency(data.vatExempt)}</span>
        </div>
         <div style={styles.row}>
          <span>ZERO RATED SALES:</span>
          <span>{formatCurrency(data.zeroRated)}</span>
        </div>
      </div>

      <DashedLine />

      <div style={styles.section}>
         <div style={styles.row}>
          <span>Gross Amount:</span>
          <span>{formatCurrency(data.grossSales)}</span>
        </div>
         <div style={styles.row}>
          <span>Less Discount:</span>
          <span>{formatCurrency(data.discounts)}</span>
        </div>
         <div style={styles.row}>
          <span>Less Return:</span>
          <span>{formatCurrency(data.returns)}</span>
        </div>
         <div style={styles.row}>
          <span>Less Void:</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>Less VAT Adjustment:</span>
          <span>0.00</span>
        </div>
         <div style={{ ...styles.row, ...styles.bold, marginTop: '4px' }}>
          <span>Net Amount:</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
      </div>

       <DashedLine />

       <div style={styles.sectionTitle}>
        <div>DISCOUNT SUMMARY</div>
      </div>
      
       <div style={styles.section}>
         <div style={styles.row}>
          <span>SC Disc. :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>PWD Disc. :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>NAAC Disc. :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>Solo Parent Disc. :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>Other Disc. :</span>
          <span>{formatCurrency(data.discounts)}</span>
        </div>
      </div>

      <DashedLine />

       <div style={styles.sectionTitle}>
        <div>SALES ADJUSTMENT</div>
      </div>

       <div style={styles.section}>
         <div style={styles.row}>
          <span>VOID :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>RETURN :</span>
          <span>{formatCurrency(data.returns)}</span>
        </div>
      </div>

      <DashedLine />

      <div style={styles.sectionTitle}>
        <div>VAT ADJUSTMENT</div>
      </div>

      <div style={styles.section}>
         <div style={styles.row}>
          <span>SC TRANS. :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>PWD TRANS :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>REG.Disc. TRANS :</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>ZERO-RATED TRANS.:</span>
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>VAT on Return:</span>
          {/* Approximate VAT on Return if known, otherwise placeholders */}
          <span>0.00</span>
        </div>
         <div style={styles.row}>
          <span>Other VAT Adjustments</span>
          <span>0.00</span>
        </div>
      </div>

      <DashedLine />

      <div style={styles.sectionTitle}>
        <div>TRANSACTION SUMMARY</div>
      </div>
      
       <div style={styles.section}>
         {(data.paymentMethods || []).map(method => (
             <div key={method.name} style={styles.row}>
              <span style={{ textTransform: 'uppercase' }}>{method.name}:</span>
              <span>{formatCurrency(method.amount)}</span>
            </div>
         ))}
         
         <div style={styles.row}>
            <span>Opening Fund:</span>
            <span>{formatCurrency(data.startingCash)}</span>
         </div>
          <div style={styles.row}>
            <span>Less Withdrawal:</span>
            <span>0.00</span>
         </div>
          <div style={{ ...styles.row, ...styles.bold, marginTop: '4px' }}>
             <span>Payments Received:</span>
             {/* Total Payments */}
            <span>{formatCurrency((data.paymentMethods || []).reduce((acc, m) => acc + m.amount, 0))}</span>
         </div>
      </div>

      <DashedLine />
      
       <div style={styles.section}>
         <div style={styles.row}>
          <span>SHORT/OVER:</span>
          <span>0.00</span>
        </div>
      </div>

      <DashedLine />
      
      <div style={styles.footer}>
        <div>This Receipt shall be valid for</div>
        <div>five (5) years from the date of</div>
        <div>the permit to use.</div>
      </div>
    
      <div style={{ ...styles.center, ...styles.bold }}>
         <div>THIS IS NOT AN OFFICIAL RECEIPT</div>
      </div>

    </div>
  );
});

ZReadingPreview.displayName = 'ZReadingPreview';
