import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const taxRates = await db.taxRate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(taxRates);
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return NextResponse.json({ error: 'Failed to fetch tax rates' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, rate, description, isDefault } = body;

    // Validation
    if (!name || rate === undefined) {
      return NextResponse.json({ error: 'Name and rate are required' }, { status: 400 });
    }

    if (isDefault) {
      // If this is set as default, unset others
      await db.taxRate.updateMany({
        data: { isDefault: false }
      });
    }

    const id = uuidv4();
    const taxRate = await db.taxRate.create({
      data: {
        id,
        name,
        rate,
        description,
        isDefault: !!isDefault
      }
    });

    return NextResponse.json(taxRate, { status: 201 });
  } catch (error) {
    console.error('Error creating tax rate:', error);
    return NextResponse.json({ error: 'Failed to create tax rate' }, { status: 500 });
  }
}
