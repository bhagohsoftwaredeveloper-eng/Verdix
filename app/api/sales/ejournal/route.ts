import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // Format: yyyy-MM-dd
    const terminalId = searchParams.get('terminalId');

    if (!dateParam) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 });
    }

    const start = startOfDay(date);
    const end = endOfDay(date);

    // Fetch transactions with items for the specific date
    const salesTransactions = await db.salesTransaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        isTraining: false,
        posTransaction: terminalId && terminalId !== 'all' ? {
          terminalId: terminalId
        } : undefined
      },
      include: {
        posTransaction: {
          include: {
            user: true
          }
        },
        items: true,
        customer: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const transactions: any[] = [];
    salesTransactions.forEach(st => {
      // Create a flat array of items mirroring the SQL JOIN structure
      st.items.forEach(si => {
        transactions.push({
          invoice_date: st.invoiceDate,
          si_number: st.reference,
          or_number: st.receiptNumber,
          cashier: st.posTransaction?.user?.displayName || '',
          product_name: si.productName,
          quantity: si.quantity,
          price: Number(si.price),
          total_discount: Number(st.posTransaction?.discountAmount || 0),
          total_vat: Number(st.posTransaction?.taxAmount || 0),
          total_amount: Number(st.total),
          status: st.status,
          created_at: st.createdAt,
          customer_name: st.customer?.name || ''
        });
      });
    });

    if (transactions.length === 0) {
      // Still return an empty file with a header rather than an error
    }

    // Format into text
    // Header for BIR E-Journal
    let content = `E-JOURNAL EXPORT - ${dateParam}\n`;
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
       await db.posSettings.updateMany({
           data: {
               lastEjournalExport: new Date()
           }
       });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="ejournal_${dateParam}_${terminalId || 'all'}.txt"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating e-journal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
