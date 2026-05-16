import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const terminals = await db.posTerminal.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: terminals,
    });
  } catch (error) {
    console.error('Error fetching terminals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch terminals' },
      { status: 500 }
    );
  }
}
