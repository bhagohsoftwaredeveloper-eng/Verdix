import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch a single supplier by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplier = await db.supplier.findUnique({
      where: { id }
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: supplier,
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

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        contactNumber: contactNumber !== undefined ? contactNumber : undefined,
        address: address !== undefined ? address : undefined,
        email: email !== undefined ? email : undefined,
        telephone: telephone !== undefined ? telephone : undefined,
        mobilePhone: mobilePhone !== undefined ? mobilePhone : undefined,
        company: company !== undefined ? company : undefined,
        tin: tin !== undefined ? tin : undefined,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
        markupPercentage: markupPercentage !== undefined ? markupPercentage : undefined,
        orderSchedule: orderSchedule !== undefined ? orderSchedule : undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating supplier:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

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

    await db.supplier.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
