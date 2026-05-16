import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isLoyaltyCardExpired } from '../../../../lib/loyalty-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfid = searchParams.get('rfid');

    if (!rfid) {
      return NextResponse.json(
        { success: false, error: 'RFID code is required' },
        { status: 400 }
      );
    }

    // Lookup using Prisma
    const loyaltyRecord = await db.customerLoyalty.findUnique({
      where: { rfidCode: rfid },
      include: {
        customer: true,
      },
    });

    if (loyaltyRecord) {
      const customer = {
        id: loyaltyRecord.customer.id,
        name: loyaltyRecord.customer.name,
        contactNumber: loyaltyRecord.customer.contactNumber,
        active: loyaltyRecord.customer.active,
        salesPerson: loyaltyRecord.customer.salesPerson,
        salesArea: loyaltyRecord.customer.salesArea,
        salesGroup: loyaltyRecord.customer.salesGroup,
        paymentTerms: loyaltyRecord.customer.paymentTerms,
        address: loyaltyRecord.customer.address,
        billingAddress: loyaltyRecord.customer.billingAddress,
        discount: Number(loyaltyRecord.customer.discount || 0),
        creditLimit: Number(loyaltyRecord.customer.creditLimit || 0),
        priceLevelId: loyaltyRecord.customer.priceLevelId,
        createdAt: loyaltyRecord.customer.createdAt,
        updatedAt: loyaltyRecord.customer.updatedAt,
        loyaltyPoints: Number(loyaltyRecord.currentPoints || 0),
        rfidCode: loyaltyRecord.rfidCode,
        expiryDate: loyaltyRecord.expiryDate,
        pointSetting: loyaltyRecord.pointSetting,
        isExpired: isLoyaltyCardExpired(loyaltyRecord.expiryDate)
      };

      return NextResponse.json({
        success: true,
        data: customer,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in RFID lookup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to look up customer' },
      { status: 500 }
    );
  }
}
