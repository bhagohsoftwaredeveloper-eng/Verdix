
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
        const existing = await db.customer.findUnique({
          where: { id: c.id }
        });

        const activeValue = c.active !== undefined ? (c.active === 'true' || c.active === '1' || c.active === true) : true;
        const loyaltyPoints = new Decimal(parseFloat(c.loyalty_points) || 0);
        const discount = new Decimal(parseFloat(c.discount) || 0);
        const creditLimit = new Decimal(parseFloat(c.credit_limit) || 0);

        if (existing) {
          // Normalization for Exact Match Validation
          const normalizeActive = (val: any) => {
            if (val === true || val === 1 || val === 'true' || val === '1') return true;
            return false;
          };

          const normalizeDecimal = (val: any) => new Decimal(val || 0).toNumber();
          const normalizeString = (val: any) => val === undefined || val === null ? null : String(val).trim() || null;

          const isExactMatch = 
            normalizeString(existing.name) === normalizeString(c.name) &&
            normalizeString(existing.contactNumber) === normalizeString(c.contact_number) &&
            normalizeActive(existing.active) === normalizeActive(activeValue) &&
            normalizeString(existing.salesPerson) === normalizeString(c.sales_person) &&
            normalizeString(existing.salesArea) === normalizeString(c.sales_area) &&
            normalizeString(existing.salesGroup) === normalizeString(c.sales_group) &&
            normalizeDecimal(existing.loyaltyPoints) === normalizeDecimal(loyaltyPoints) &&
            normalizeString(existing.paymentTerms) === normalizeString(c.payment_terms) &&
            normalizeString(existing.address) === normalizeString(c.address) &&
            normalizeString(existing.billingAddress) === normalizeString(c.billing_address) &&
            normalizeDecimal(existing.discount) === normalizeDecimal(discount) &&
            normalizeDecimal(existing.creditLimit) === normalizeDecimal(creditLimit) &&
            normalizeString(existing.priceLevelId) === normalizeString(c.price_level_id);

          if (isExactMatch) {
            exactMatchCount++;
          } else {
            await db.customer.update({
              where: { id: c.id },
              data: {
                name: c.name,
                contactNumber: c.contact_number || null,
                active: activeValue,
                salesPerson: c.sales_person || null,
                salesArea: c.sales_area || null,
                salesGroup: c.sales_group || null,
                loyaltyPoints: loyaltyPoints,
                paymentTerms: c.payment_terms || null,
                address: c.address || null,
                billingAddress: c.billing_address || null,
                discount: discount,
                creditLimit: creditLimit,
                priceLevelId: c.price_level_id || null,
                tin: c.tin || null,
              }
            });
            conflictCount++;
          }
        } else {
          // New customer
          await db.customer.create({
            data: {
              id: c.id,
              name: c.name,
              contactNumber: c.contact_number || null,
              active: activeValue,
              salesPerson: c.sales_person || null,
              salesArea: c.sales_area || null,
              salesGroup: c.sales_group || null,
              loyaltyPoints: loyaltyPoints,
              paymentTerms: c.payment_terms || null,
              address: c.address || null,
              billingAddress: c.billing_address || null,
              discount: discount,
              creditLimit: creditLimit,
              priceLevelId: c.price_level_id || null,
              tin: c.tin || null,
            }
          });
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
