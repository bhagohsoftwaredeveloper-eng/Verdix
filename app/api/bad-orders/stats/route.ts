import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // 1. Total Open Cases (Not Resolved, Replaced, or Credited)
    const openCasesQuery = `
      SELECT COUNT(*) as count 
      FROM bad_orders 
      WHERE status NOT IN ('Resolved', 'Replaced', 'Credited')
    `;
    const openCasesResult = await query(openCasesQuery);
    const totalOpenCases = openCasesResult[0]?.count || 0;

    // 2. Total Value at Risk (Sum of cost for open cases)
    const valueAtRiskQuery = `
      SELECT SUM(total_affected_value) as total 
      FROM bad_orders 
      WHERE status NOT IN ('Resolved', 'Replaced', 'Credited')
    `;
    const valueAtRiskResult = await query(valueAtRiskQuery);
    const totalValueAtRisk = parseFloat(valueAtRiskResult[0]?.total || 0);

    // 3. Action Required (Pending for > 7 days or specifically marked as 'Reported' or 'Return Requested')
    // For simplicity, we'll count 'Reported' and 'Return Requested' as action required
    const actionRequiredQuery = `
      SELECT COUNT(*) as count 
      FROM bad_orders 
      WHERE status IN ('Reported', 'Return Requested')
    `;
    const actionRequiredResult = await query(actionRequiredQuery);
    const actionRequired = actionRequiredResult[0]?.count || 0;

    // 4. Top Suppliers with Issues (High Risk)
    // Get suppliers with the most open bad orders
    const topSuppliersQuery = `
      SELECT 
        supplier_id, 
        supplier_name, 
        COUNT(*) as open_count,
        SUM(total_affected_value) as total_value
      FROM bad_orders 
      WHERE status NOT IN ('Resolved', 'Replaced', 'Credited')
      GROUP BY supplier_id, supplier_name
      ORDER BY open_count DESC
      LIMIT 5
    `;
    const topSuppliersResult = await query(topSuppliersQuery);
    
    const topSuppliers = topSuppliersResult.map((row: any) => ({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      openCount: row.open_count,
      totalValue: parseFloat(row.total_value),
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalOpenCases,
        totalValueAtRisk,
        actionRequired,
        topSuppliers,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bad order stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bad order stats' },
      { status: 500 }
    );
  }
}
