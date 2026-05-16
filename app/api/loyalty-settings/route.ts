import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch loyalty settings
export async function GET(request: NextRequest) {
  try {
    const settings = await db.loyaltyPointsSetting.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loyalty settings' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new loyalty setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      description,
      base,
      amount,
      equivalent
    } = body;

    if (!id || !description) {
      return NextResponse.json(
        { success: false, error: 'ID and description are required' },
        { status: 400 }
      );
    }

    const newSetting = await db.loyaltyPointsSetting.create({
      data: {
        id,
        description,
        base: base || 0,
        amount: amount || 0,
        equivalent: equivalent || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Loyalty setting created successfully',
      data: newSetting,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating loyalty setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create loyalty setting' },
      { status: 500 }
    );
  }
}
