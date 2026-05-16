
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const customers = await db.customer.findMany({
      select: {
        id: true,
        name: true,
        contactNumber: true,
        active: true,
        salesPerson: true,
        salesArea: true,
        salesGroup: true,
        loyaltyPoints: true,
        paymentTerms: true,
        address: true,
        billingAddress: true,
        discount: true,
        creditLimit: true,
        priceLevelId: true,
        tin: true,
      },
    });

    // Convert to plain objects and handle Decimal conversion to ensure PapaParse handles them correctly
    const formattedCustomers = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      contact_number: customer.contactNumber,
      active: customer.active,
      sales_person: customer.salesPerson,
      sales_area: customer.salesArea,
      sales_group: customer.salesGroup,
      loyalty_points: customer.loyaltyPoints?.toNumber() || 0,
      payment_terms: customer.paymentTerms,
      address: customer.address,
      billing_address: customer.billingAddress,
      discount: customer.discount?.toNumber() || 0,
      credit_limit: customer.creditLimit?.toNumber() || 0,
      price_level_id: customer.priceLevelId,
      tin: customer.tin,
    }));

    const csv = Papa.unparse(formattedCustomers);
    
    // Add Byte Order Mark (BOM) for Excel compatibility
    const csvWithBOM = '\uFEFF' + csv;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="customers.csv"',
      },
    });

  } catch (error: any) {
    console.error('Error exporting customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to export customers' }, { status: 500 });
  }
}
