require('dotenv').config();
const { query } = require('./src/lib/mysql');

async function fetchSalesTransactions() {
  try {
    console.log('Fetching data from sales_transactions table...');

    // Query to fetch all data from sales_transactions table
    const salesTransactionsQuery = `
      SELECT
        st.id,
        st.customer_id,
        c.name as customer_name,
        st.invoice_date,
        st.date,
        st.due_date,
        st.total,
        st.payment_method,
        st.status,
        st.notes,
        st.created_at,
        st.updated_at
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      ORDER BY st.created_at DESC
    `;

    const salesTransactions = await query(salesTransactionsQuery);

    if (salesTransactions.length === 0) {
      console.log('No sales transactions found in the database.');
      return;
    }

    console.log(`Found ${salesTransactions.length} sales transaction(s):\n`);

    // Display the results
    salesTransactions.forEach((transaction, index) => {
      console.log(`--- Transaction ${index + 1} ---`);
      console.log(`ID: ${transaction.id}`);
      console.log(`Customer: ${transaction.customer_name || 'N/A'} (${transaction.customer_id || 'N/A'})`);
      console.log(`Invoice Date: ${transaction.invoice_date}`);
      console.log(`Date: ${transaction.date}`);
      console.log(`Due Date: ${transaction.due_date}`);
      console.log(`Total: ₱${transaction.total}`);
      console.log(`Payment Method: ${transaction.payment_method}`);
      console.log(`Status: ${transaction.status}`);
      console.log(`Notes: ${transaction.notes || 'N/A'}`);
      console.log(`Created: ${transaction.created_at}`);
      console.log(`Updated: ${transaction.updated_at}`);
      console.log('');
    });

    // Also fetch sale items for each transaction
    console.log('Fetching sale items for each transaction...\n');

    for (const transaction of salesTransactions) {
      const saleItemsQuery = `
        SELECT
          si.id,
          si.product_id,
          si.product_name,
          si.quantity,
          si.price,
          (si.quantity * si.price) as line_total,
          si.created_at
        FROM sale_items si
        WHERE si.sale_id = ?
        ORDER BY si.created_at ASC
      `;

      const saleItems = await query(saleItemsQuery, [transaction.id]);

      if (saleItems.length > 0) {
        console.log(`Items for Transaction ${transaction.id}:`);
        saleItems.forEach((item, itemIndex) => {
          console.log(`  ${itemIndex + 1}. ${item.product_name} (${item.product_id})`);
          console.log(`     Quantity: ${item.quantity}`);
          console.log(`     Price: ₱${item.price}`);
          console.log(`     Line Total: ₱${item.line_total}`);
        });
        console.log('');
      }
    }

  } catch (error) {
    console.error('Database query error:', error);
  }
}

fetchSalesTransactions();
