
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    
    // Parse CSV
    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: 'Invalid CSV format', details: errors }, { status: 400 });
    }
    
    const customers: any[] = data;
    let successCount = 0;
    let conflictCount = 0;
    let exactMatchCount = 0;
    let errorCount = 0;

    for (const c of customers) {
      // Basic validation: name and id are required
      if (!c.id || !c.name) {
        errorCount++;
        continue;
      }

      try {
        // Check if exists
        const [existing] = await query('SELECT * FROM customers WHERE id = ?', [c.id]);

        if (existing) {
          // Normalization for Exact Match Validation
          const normalizeActive = (val: any) => {
            if (val === true || val === 1 || val === 'true' || val === '1') return 1;
            return 0;
          };

          const normalizeNumber = (val: any) => parseFloat(val) || 0;
          const normalizeString = (val: any) => val === undefined || val === null ? null : String(val).trim() || null;

          const isExactMatch = 
            normalizeString(existing.name) === normalizeString(c.name) &&
            normalizeString(existing.contact_number) === normalizeString(c.contact_number) &&
            normalizeActive(existing.active) === normalizeActive(c.active !== undefined ? (c.active === 'true' || c.active === '1' || c.active === true) : true) &&
            normalizeString(existing.sales_person) === normalizeString(c.sales_person) &&
            normalizeString(existing.sales_area) === normalizeString(c.sales_area) &&
            normalizeString(existing.sales_group) === normalizeString(c.sales_group) &&
            normalizeNumber(existing.loyalty_points) === normalizeNumber(c.loyalty_points) &&
            normalizeString(existing.payment_terms) === normalizeString(c.payment_terms) &&
            normalizeString(existing.address) === normalizeString(c.address) &&
            normalizeString(existing.billing_address) === normalizeString(c.billing_address) &&
            normalizeNumber(existing.discount) === normalizeNumber(c.discount) &&
            normalizeNumber(existing.credit_limit) === normalizeNumber(c.credit_limit) &&
            normalizeString(existing.price_level_id) === normalizeString(c.price_level_id);

          if (isExactMatch) {
            exactMatchCount++;
          } else {
            // It's a conflict (different data for same ID)
            // For now, let's update it to make it "Import Customers" functional
            await query(
              `UPDATE customers SET 
                name = ?, 
                contact_number = ?, 
                active = ?, 
                sales_person = ?, 
                sales_area = ?, 
                sales_group = ?, 
                loyalty_points = ?, 
                payment_terms = ?, 
                address = ?, 
                billing_address = ?, 
                discount = ?, 
                credit_limit = ?, 
                price_level_id = ?,
                updated_at = NOW()
              WHERE id = ?`,
              [
                c.name,
                c.contact_number || null,
                c.active !== undefined ? (c.active === 'true' || c.active === '1' || c.active === true) : true,
                c.sales_person || null,
                c.sales_area || null,
                c.sales_group || null,
                parseFloat(c.loyalty_points) || 0,
                c.payment_terms || null,
                c.address || null,
                c.billing_address || null,
                parseFloat(c.discount) || 0,
                parseFloat(c.credit_limit) || 0,
                c.price_level_id || null,
                c.id
              ]
            );
            conflictCount++;
          }
        } else {
          // New customer
          await query(
            `INSERT INTO customers (
              id, name, contact_number, active, sales_person, sales_area, sales_group,
              loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              c.id,
              c.name,
              c.contact_number || null,
              c.active !== undefined ? (c.active === 'true' || c.active === '1' || c.active === true) : true,
              c.sales_person || null,
              c.sales_area || null,
              c.sales_group || null,
              parseFloat(c.loyalty_points) || 0,
              c.payment_terms || null,
              c.address || null,
              c.billing_address || null,
              parseFloat(c.discount) || 0,
              parseFloat(c.credit_limit) || 0,
              c.price_level_id || null
            ]
          );
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to import customer ${c.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import processed. Added: ${successCount}, Updated: ${conflictCount}, Exact Matches: ${exactMatchCount}, Errors: ${errorCount}` 
    });

  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
