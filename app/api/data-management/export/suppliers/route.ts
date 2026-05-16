
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const suppliers = await db.supplier.findMany({
      select: {
        id: true,
        name: true,
        contactNumber: true,
        address: true,
        paymentTerms: true,
        markupPercentage: true,
        tin: true,
      },
    });

    const formattedSuppliers = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      contact_number: supplier.contactNumber,
      address: supplier.address,
      payment_terms: supplier.paymentTerms,
      markup_percentage: supplier.markupPercentage?.toNumber() || 0,
      tin: supplier.tin,
    }));

    const csv = Papa.unparse(formattedSuppliers);
    
    // Add Byte Order Mark (BOM) for Excel compatibility
    const csvWithBOM = '\uFEFF' + csv;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="suppliers.csv"',
      },
    });

  } catch (error: any) {
    console.error('Error exporting suppliers:', error);
    return NextResponse.json({ success: false, error: 'Failed to export suppliers' }, { status: 500 });
  }
}
