import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { completedBy } = body;

    // 1. Verify stock count is in_progress
    const countResult: any = await query(`SELECT * FROM stock_counts WHERE id = ?`, [id]);
    if (!countResult || countResult.length === 0) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }
    const count = countResult[0];

    if (count.status !== 'in_progress') {
       return NextResponse.json({ error: 'Stock count is already completed or cancelled' }, { status: 400 });
    }

    // 2. Fetch all items with a variance (where counted_quantity is not null and variance != 0)
    const itemsSql = `
      SELECT sci.*, p.name as product_name, p.stock as current_live_stock 
      FROM stock_count_items sci
      JOIN products p ON sci.product_id = p.id
      WHERE sci.stock_count_id = ? 
        AND sci.counted_quantity IS NOT NULL 
        AND sci.variance != 0
    `;
    const itemsWithVariance: any[] = await query(itemsSql, [id]);

    await withTransaction(async (connection) => {
      for (const item of itemsWithVariance) {
        // Find if this product belongs to a family
        const [prodInfoResult]: any = await connection.query(
          'SELECT parent_id, unit_of_measure FROM products WHERE id = ?',
          [item.product_id]
        );
        const prodInfo = prodInfoResult[0];
        const rootId = prodInfo?.parent_id || item.product_id;

        // Fetch family members
        const [familyMembers]: any = await connection.query(
          'SELECT id, name, unit_of_measure, stock FROM products WHERE id = ? OR parent_id = ?',
          [rootId, rootId]
        );

        // Fetch conversion factors
        const [convFactors]: any = await connection.query(
          'SELECT unit, factor FROM conversion_factors WHERE product_id = ?',
          [rootId]
        );

        const getFactorToRoot = (unit: string) => {
           const rootMember = familyMembers.find((m: any) => m.id === rootId);
           if (rootMember && rootMember.unit_of_measure === unit) return 1;
           const factor = convFactors.find((cf: any) => cf.unit === unit);
           if (factor) return parseFloat(factor.factor);
           return undefined;
        };

        const itemFactor = getFactorToRoot(prodInfo.unit_of_measure);
        const varianceInRoot = itemFactor ? item.variance / itemFactor : 0;

        // Process family members
        for (const member of familyMembers) {
          const memberFactor = getFactorToRoot(member.unit_of_measure);
          let memberVariance = 0;

          if (member.id === item.product_id) {
            memberVariance = item.variance; // Exact variance for the counted item
          } else if (varianceInRoot !== 0 && memberFactor) {
            memberVariance = varianceInRoot * memberFactor; // Synced variance for relatives
          }

          if (memberVariance !== 0) {
            const newLiveStock = member.stock + memberVariance;
            const adjustmentReason = member.id === item.product_id 
                ? `Stock Count [${count.name || id}]`
                : `Stock Count Auto-Sync [${count.name || id}]`;
            const adjustmentId = uuidv4();
            const movementId = uuidv4();

            // 1. Insert into stock_adjustments
            await connection.query(
              `INSERT INTO stock_adjustments (id, product_id, quantity, reason, new_stock) 
               VALUES (?, ?, ?, ?, ?)`,
              [adjustmentId, member.id, memberVariance, adjustmentReason, newLiveStock]
            );

            // 2. Insert into stock_movements
            await connection.query(
              `INSERT INTO stock_movements 
                (id, product_id, product_name, movement_type, quantity_change, previous_stock, new_stock, reference_id, reference_type, notes)
               VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?, 'adjustment', ?)`,
              [
                 movementId, 
                 member.id, 
                 member.name, 
                 memberVariance, 
                 member.stock, 
                 newLiveStock, 
                 adjustmentId, 
                 adjustmentReason
              ]
            );

            // 3. Update products.stock
            await connection.query(
               `UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?`,
               [newLiveStock, member.id]
            );
          }
        }
      }

      // 4. Mark stock count as completed
      await connection.query(
         `UPDATE stock_counts 
          SET status = 'completed', completed_by = ?, completed_at = CURRENT_TIMESTAMP 
          WHERE id = ?`,
         [completedBy || 'System', id]
      );
    });

    return NextResponse.json({ message: 'Stock count completed and inventory adjusted successfully' });

  } catch (error: any) {
    console.error('Error completing stock count:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete stock count' }, { status: 500 });
  }
}
