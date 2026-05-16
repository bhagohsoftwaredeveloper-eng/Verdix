
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

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

    const suppliersData: any[] = data;
    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (const s of suppliersData) {
      if (!s.name) {
        errorCount++;
        continue;
      }

      try {
        // Check if exists by name (suppliers usually unique by name)
        const [existing]: any = await query('SELECT id FROM suppliers WHERE name = ?', [s.name]);

        if (existing) {
          // Update existing supplier
          await query(
            `UPDATE suppliers SET 
              contact_number = ?, 
              address = ?, 
              payment_terms = ?, 
              markup_percentage = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [
              s.contact_number || null,
              s.address || null,
              s.payment_terms || null,
              parseFloat(s.markup_percentage) || null,
              existing.id
            ]
          );
          updateCount++;
        } else {
          // Insert new supplier
          await query(
            `INSERT INTO suppliers (
              id, name, contact_number, address, payment_terms, markup_percentage,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              uuidv4(),
              s.name,
              s.contact_number || null,
              s.address || null,
              s.payment_terms || null,
              parseFloat(s.markup_percentage) || null
            ]
          );
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to import supplier ${s.name}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import processed. Added: ${successCount}, Updated: ${updateCount}, Errors: ${errorCount}` 
    });

  } catch (error: any) {
    console.error('Error importing suppliers:', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
