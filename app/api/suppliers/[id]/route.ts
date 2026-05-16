import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

// GET endpoint to fetch a single supplier by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sql = `
      SELECT
        id,
        name,
        contact_number AS contactNumber,
        address,
        email,
        telephone,
        mobile_phone AS mobilePhone,
        company,
        tin,
        payment_terms AS paymentTerms,
        markup_percentage AS markupPercentage,
        order_schedule AS orderSchedule,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM suppliers
      WHERE id = ?
    `;

    const suppliers = await query(sql, [id]);

    if (!suppliers || suppliers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: suppliers[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      contactNumber,
      address,
      email,
      telephone,
      mobilePhone,
      company,
      tin,
      paymentTerms,
      markupPercentage,
      orderSchedule
    } = body;

    // Check if supplier exists
    const existingSupplier = await query('SELECT id FROM suppliers WHERE id = ?', [id]);
    if (!existingSupplier || existingSupplier.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const sql = `
      UPDATE suppliers SET
        name = COALESCE(?, name),
        contact_number = COALESCE(?, contact_number),
        address = COALESCE(?, address),
        email = COALESCE(?, email),
        telephone = COALESCE(?, telephone),
        mobile_phone = COALESCE(?, mobile_phone),
        company = COALESCE(?, company),
        tin = COALESCE(?, tin),
        payment_terms = COALESCE(?, payment_terms),
        markup_percentage = COALESCE(?, markup_percentage),
        order_schedule = COALESCE(?, order_schedule),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await query(sql, [name, contactNumber, address, email, telephone, mobilePhone, company, tin, paymentTerms, markupPercentage, orderSchedule, id]);

    return NextResponse.json({
      success: true,
      message: 'Supplier updated successfully',
      data: { id },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if supplier exists
    const existingSupplier = await query('SELECT id FROM suppliers WHERE id = ?', [id]);
    if (!existingSupplier || existingSupplier.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM suppliers WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
