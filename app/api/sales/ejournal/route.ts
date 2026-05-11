import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format: yyyy-MM-dd
    const terminalId = searchParams.get('terminalId');

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    // Fetch transactions with items for the specific date
    let sql = `
      SELECT 
        st.invoice_date,
        st.reference as si_number,
        st.receipt_number as or_number,
        u.display_name as cashier,
        si.product_name,
        si.quantity,
        si.price,
        pt.discount_amount as total_discount,
        pt.tax_amount as total_vat,
        st.total as total_amount,
        st.status,
        st.created_at,
        c.name as customer_name
      FROM sales_transactions st
      JOIN pos_transactions pt ON st.id = pt.sale_id
      JOIN sale_items si ON st.id = si.sale_id
      JOIN users u ON pt.user_id = u.uid
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE DATE(st.created_at) = ? AND st.is_training = 0
    `;

    const params: any[] = [date];
    if (terminalId && terminalId !== 'all') {
      sql += ` AND pt.terminal_id = ?`;
      params.push(terminalId);
    }

    sql += ` ORDER BY st.created_at ASC, si.id ASC`;

    const transactions = await query(sql, params) as any[];

    if (transactions.length === 0) {
      // Still return an empty file with a header rather than an error
    }

    // Format into text
    // Header for BIR E-Journal
    let content = `E-JOURNAL EXPORT - ${date}\n`;
    content += `Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    content += `Terminal: ${terminalId || 'All'}\n`;
    content += `------------------------------------------------------------------------------------------------------------------------------------\n`;
    content += `${'DATE'.padEnd(12)} | ${'TIME'.padEnd(8)} | ${'SI#'.padEnd(15)} | ${'OR#'.padEnd(15)} | ${'CASHIER'.padEnd(15)} | ${'ITEM'.padEnd(30)} | ${'QTY'.padEnd(6)} | ${'PRICE'.padEnd(10)} | ${'VAT'.padEnd(8)} | ${'TOTAL'.padEnd(10)} | ${'STATUS'}\n`;
    content += `------------------------------------------------------------------------------------------------------------------------------------\n`;

    transactions.forEach(t => {
      const tDate = format(new Date(t.created_at), 'yyyy-MM-dd');
      const tTime = format(new Date(t.created_at), 'HH:mm:ss');
      const line = [
        tDate.padEnd(12),
        tTime.padEnd(8),
        (t.si_number || '').padEnd(15),
        (t.or_number || '').padEnd(15),
        (t.cashier || '').substring(0, 15).padEnd(15),
        (t.product_name || '').substring(0, 30).padEnd(30),
        String(t.quantity || 0).padEnd(6),
        String(t.price || 0).padEnd(10),
        String(t.total_vat || 0).padEnd(8),
        String(t.total_amount || 0).padEnd(10),
        t.status
      ].join(' | ');
      content += line + '\n';
    });

    content += `------------------------------------------------------------------------------------------------------------------------------------\n`;
    content += `END OF REPORT - TOTAL TRANSACTIONS: ${new Set(transactions.map(t => t.si_number)).size}\n`;

    // Update last_ejournal_export in pos_settings if it's for today or past
    if (transactions.length > 0) {
       await query('UPDATE pos_settings SET last_ejournal_export = NOW() WHERE 1=1');
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="ejournal_${date}_${terminalId || 'all'}.txt"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating e-journal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
