import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET endpoint to fetch POS terminals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const getNextOR = searchParams.get('getNextOR') === 'true';

    if (getNextOR) {
      // For PostgreSQL, we use queryRaw for regex-based ordering if needed, 
      // or just fetch and process in JS for a small number of terminals
      const terminals = await db.posTerminal.findMany({
        select: { orNextReference: true },
      });
      
      let maxVal = 0;
      for (const t of terminals) {
        const val = parseInt(t.orNextReference);
        if (!isNaN(val) && val > maxVal) {
          maxVal = val;
        }
      }
      
      const nextRef = (maxVal + 1).toString().padStart(8, '0');

      return NextResponse.json({
        success: true,
        data: nextRef,
        timestamp: new Date().toISOString()
      });
    }

    const where: Prisma.PosTerminalWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [terminals, total] = await Promise.all([
      db.posTerminal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.posTerminal.count({ where }),
    ]);

    // Map to the format expected by the frontend if necessary
    const formattedTerminals = terminals.map(t => ({
      ...t,
      terminalDescription: t.name,
      inventoryLocation: t.location,
      min: t.terminalMin,
    }));

    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     request.headers.get('x-real-ip') || 
                     (request as any).ip || 
                     '127.0.0.1';

    return NextResponse.json({
      success: true,
      data: formattedTerminals,
      clientIp,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching POS terminals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch POS terminals' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new POS terminal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ipAddress,
      terminalDescription,
      serialNumber,
      min,
      permitNo,
      printOfficialReceipt,
      orNextReference,
      inventoryLocation,
      isActive = true,
      zCounter = 0,
      resetCounter = 0
    } = body;

    const newTerminal = await db.posTerminal.create({
      data: {
        ipAddress: ipAddress?.trim() || null,
        name: terminalDescription?.trim() || 'Terminal',
        serialNumber: serialNumber?.trim() || null,
        terminalMin: min?.trim() || null,
        permitNo: permitNo?.trim() || null,
        printOfficialReceipt: printOfficialReceipt || 'No',
        orNextReference: orNextReference?.trim() || '00000001',
        location: inventoryLocation || 'Store',
        isActive,
        zCounter,
        resetCounter
      }
    });

    return NextResponse.json({
      success: true,
      message: 'POS terminal created successfully',
      data: {
        ...newTerminal,
        terminalDescription: newTerminal.name,
        inventoryLocation: newTerminal.location,
        min: newTerminal.terminalMin,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating POS terminal:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create POS terminal' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a POS terminal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Terminal ID is required' },
        { status: 400 }
      );
    }

    const data: Prisma.PosTerminalUpdateInput = {
      lastActive: new Date()
    };

    if (body.ipAddress !== undefined) data.ipAddress = body.ipAddress?.trim() || null;
    if (body.terminalDescription !== undefined) data.name = body.terminalDescription?.trim() || null;
    if (body.serialNumber !== undefined) data.serialNumber = body.serialNumber?.trim() || null;
    if (body.min !== undefined) data.terminalMin = body.min?.trim() || null;
    if (body.permitNo !== undefined) data.permitNo = body.permitNo?.trim() || null;
    if (body.printOfficialReceipt !== undefined) data.printOfficialReceipt = body.printOfficialReceipt;
    if (body.orNextReference !== undefined) data.orNextReference = body.orNextReference?.trim() || '00000001';
    if (body.inventoryLocation !== undefined) data.location = body.inventoryLocation;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.zCounter !== undefined) data.zCounter = body.zCounter;
    if (body.resetCounter !== undefined) data.resetCounter = body.resetCounter;

    const updatedTerminal = await db.posTerminal.update({
      where: { id },
      data
    });

    return NextResponse.json({
      success: true,
      message: 'POS terminal updated successfully',
      data: {
        ...updatedTerminal,
        terminalDescription: updatedTerminal.name,
        inventoryLocation: updatedTerminal.location,
        min: updatedTerminal.terminalMin,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating POS terminal:', error);
    if (error.code === 'P2025') {
       return NextResponse.json(
        { success: false, error: 'POS terminal not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update POS terminal' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a POS terminal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Terminal ID is required' },
        { status: 400 }
      );
    }

    await db.posTerminal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'POS terminal deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting POS terminal:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'POS terminal not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete POS terminal' },
      { status: 500 }
    );
  }
}
