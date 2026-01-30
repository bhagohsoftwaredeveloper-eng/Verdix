import { NextRequest, NextResponse } from 'next/server';
// Force rebuild: Fixed import path
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // yyyy-MM-dd
    const endDate = searchParams.get('endDate');     // yyyy-MM-dd
    const terminalId = searchParams.get('terminalId');
    const productId = searchParams.get('productId'); // Filter by product content
    const status = searchParams.get('status');       // 'Paid', 'Void', 'Returned'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let baseSql = `
      SELECT 
        pt.id as pos_transaction_id,
        pt.sale_id,
        pt.order_number,
        pt.transaction_type,
        pt.subtotal,
        pt.discount_amount,
        pt.tax_amount,
        pt.total_amount,
        pt.payment_method,
        pt.transaction_time,
        pt.void_reason,
        pt.notes,
        pt.payment_status,
        pt.user_id,
        u.display_name as cashier_name,
        pt.terminal_id,
        term.name as terminal_name,
        st.customer_id,
        c.name as customer_name,
        c.contact_number as customer_contact,
        st.status as sale_status
      FROM pos_transactions pt
      LEFT JOIN users u ON pt.user_id = u.uid
      LEFT JOIN pos_terminals term ON pt.terminal_id = term.id
      LEFT JOIN sales_transactions st ON pt.sale_id = st.id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let whereClause = '';

    if (productId) {
      // If filtering by product, we need to join with pos_transaction_items to check existence
      whereClause += ` AND EXISTS (SELECT 1 FROM pos_transaction_items pti WHERE pti.pos_transaction_id = pt.id AND pti.product_id = ?)`;
      params.push(productId);
    }

    if (startDate) {
      whereClause += ' AND DATE(pt.transaction_time) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(pt.transaction_time) <= ?';
      params.push(endDate);
    }
    if (terminalId && terminalId !== 'all') {
      whereClause += ' AND pt.terminal_id = ?';
      params.push(terminalId);
    }
    
    // Status filter: tricky because pos_transactions has 'transaction_type' (sale, void, return)
    // while sales_transactions has 'status' (Paid, Returned, Void).
    // If user asks for 'Void', we look for transaction_type = 'void' OR sale_status = 'Void'
    if (status) {
      if (status === 'Voided') {
         whereClause += " AND (pt.transaction_type = 'void' OR st.status = 'Voided')";
      } else if (status === 'Returned') {
         whereClause += " AND (pt.transaction_type = 'return' OR st.status = 'Returned')";
      } else if (status === 'Paid') {
         whereClause += " AND (pt.transaction_type = 'sale' AND st.status = 'Paid')";
      } else {
         whereClause += ' AND st.status = ?';
         params.push(status);
      }
    }

    // 1. Get total count
    const countSql = `SELECT COUNT(*) as total FROM pos_transactions pt 
                      LEFT JOIN sales_transactions st ON pt.sale_id = st.id 
                      WHERE 1=1 ${whereClause}`;
    // Re-use params for count query, but we need to ensure joint tables are available if referenced in whereClause
    // The simplified count query above assumes we only need joins if they are used in filtering.
    // However, the WHERE clause uses 'st' alias, so we must include the JOINs in the count query too.
    const fullCountSql = `
      SELECT COUNT(*) as total
      FROM pos_transactions pt
      LEFT JOIN users u ON pt.user_id = u.uid
      LEFT JOIN pos_terminals term ON pt.terminal_id = term.id
      LEFT JOIN sales_transactions st ON pt.sale_id = st.id
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1 ${whereClause}
    `;

    const countResult = await query(fullCountSql, params);
    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // 2. Get paginated data
    const dataSql = baseSql + whereClause + ' ORDER BY pt.transaction_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = await query(dataSql, params);
    
    // Fetch items for these transactions
    let transactionItems: any[] = [];
    if (transactions.length > 0) {
        const transactionIds = transactions.map((t: any) => t.pos_transaction_id);
        const placeholders = transactionIds.map(() => '?').join(',');
        
        const itemsSql = `
            SELECT 
                pti.id,
                pti.pos_transaction_id,
                pti.product_id,
                pti.product_name,
                pti.quantity,
                pti.unit_price,
                pti.line_total,
                pti.discount_percentage,
                pti.discount_amount,
                COALESCE(p.cost, 0) as product_cost,
                p.description,
                p.unit_of_measure
            FROM pos_transaction_items pti
            LEFT JOIN products p ON pti.product_id = p.id
            WHERE pti.pos_transaction_id IN (${placeholders})
        `;
        
        transactionItems = await query(itemsSql, transactionIds);
    }

    // Group items by transaction ID
    const itemsByTransaction: Record<string, any[]> = {};
    transactionItems.forEach((item: any) => {
        if (!itemsByTransaction[item.pos_transaction_id]) {
            itemsByTransaction[item.pos_transaction_id] = [];
        }
        itemsByTransaction[item.pos_transaction_id].push({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            description: item.description, // Added description
            quantity: item.quantity,
            price: parseFloat(item.unit_price) || 0,
            total: parseFloat(item.line_total) || 0,
            cost: parseFloat(item.product_cost) || 0,
            discount: parseFloat(item.discount_amount) || 0,
            unitOfMeasure: item.unit_of_measure
        });
    });
    
    // Transform logic if needed
    const data = transactions.map((row: any) => {
      const totalAmount = parseFloat(row.total_amount) || 0;
      const taxAmount = parseFloat(row.tax_amount) || 0;
      const discountAmount = parseFloat(row.discount_amount) || 0;
      const subtotal = parseFloat(row.subtotal) || totalAmount;
      
      // Get items for this transaction
      const items = itemsByTransaction[row.pos_transaction_id] || [];
      
      // Calculate total cost and profit based on items
      const calculatedCost = items.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);
      const calculatedProfit = totalAmount - calculatedCost - taxAmount; // Profit = Revenue - Cost - Tax

      // Calculate vatable sales (total minus VAT)
      const vatableSales = totalAmount - taxAmount;
      // For now, non-vat sales is 0 (all sales are VAT-inclusive)
      const nonVatSales = 0;
      
      const balance = 0;
      const amountPaid = totalAmount; // Assuming full payment for now as logic for partial isn't fully clear
      
      return {
        id: row.sale_id,
        orderNumber: row.order_number,
        receiptNo: row.order_number, // Using order_number as receipt number
        posTransactionId: row.pos_transaction_id,
        date: row.transaction_time,
        total: totalAmount,
        subtotal: subtotal,
        discount: discountAmount,
        taxAmount: taxAmount,
        vatableSales: vatableSales,
        nonVatSales: nonVatSales,
        amountPaid: amountPaid,
        balance: balance,
        cost: calculatedCost,
        profit: calculatedProfit,
        notes: row.notes || '',
        paymentStatus: row.payment_status || 'completed',
        status: row.sale_status || (row.transaction_type === 'sale' ? 'Paid' : row.transaction_type === 'return' ? 'Returned' : 'Voided'),
        transactionType: row.transaction_type,
        paymentMethod: row.payment_method,
        customer: {
          id: row.customer_id,
          name: row.customer_name || 'Walk-in Customer',
          contactNumber: row.customer_contact
        },
        cashier: row.cashier_name || 'N/A',
        terminal: row.terminal_name || 'N/A',
        items: items // Attach items
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching POS transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
