
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Papa from 'papaparse';
import { Decimal } from '@prisma/client/runtime/library';

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
        // Check if exists by name (name is unique in schema)
        const existing = await db.supplier.findUnique({
          where: { name: s.name }
        });

        const supplierData = {
          contactNumber: s.contact_number || null,
          address: s.address || null,
          paymentTerms: s.payment_terms || null,
          markupPercentage: new Decimal(parseFloat(s.markup_percentage) || 0),
          tin: s.tin || null,
        };

        if (existing) {
          // Update existing supplier
          await db.supplier.update({
            where: { name: s.name },
            data: supplierData,
          });
          updateCount++;
        } else {
          // Insert new supplier
          await db.supplier.create({
            data: {
              ...supplierData,
              name: s.name,
            },
          });
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
