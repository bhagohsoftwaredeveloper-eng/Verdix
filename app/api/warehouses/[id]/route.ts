import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch a single warehouse
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const warehouseId = resolvedParams.id;

    const warehouse = await db.warehouse.findUnique({
      where: { id: warehouseId }
    });

    if (!warehouse) {
      return NextResponse.json(
        { success: false, error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: warehouse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouse' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const warehouseId = resolvedParams.id;
    const body = await request.json();
    const { name, location, isActive, isMain } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Warehouse name is required' },
        { status: 400 }
      );
    }

    const updatedWarehouse = await db.warehouse.update({
      where: { id: warehouseId },
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        isActive: isActive ?? true,
        // If isMain is needed, ensure it exists in schema. Currently it's not in the Warehouse model.
        // Checking schema again... Warehouse model: id, name, location, isActive, createdAt, updatedAt.
        // No isMain. I'll omit it for now or if I added it previously.
        // Wait, looking at schema.prisma I read earlier:
        /*
        model Warehouse {
          id        String   @id @default(uuid())
          name      String   @unique @db.VarChar(255)
          location  String?  @db.VarChar(255)
          isActive  Boolean  @default(true) @map("is_active")
          createdAt DateTime @default(now()) @map("created_at")
          updatedAt DateTime @updatedAt @map("updated_at")

          @@map("warehouses")
        }
        */
        // So no isMain and no contactNumber.
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: updatedWarehouse,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Warehouse name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update warehouse' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a warehouse
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const warehouseId = resolvedParams.id;

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, error: 'Invalid warehouse ID' },
        { status: 400 }
      );
    }

    // Set warehouse_id to NULL for all associated records manually since relations aren't explicitly defined for cascade
    await Promise.all([
      db.product.updateMany({
        where: { warehouseId: warehouseId },
        data: { warehouseId: null }
      }),
      db.salesTransaction.updateMany({
        where: { warehouseId: warehouseId },
        data: { warehouseId: null }
      }),
      db.purchaseOrder.updateMany({
        where: { warehouseId: warehouseId },
        data: { warehouseId: null }
      }),
      db.stockAdjustment.updateMany({
        where: { warehouseId: warehouseId },
        data: { warehouseId: null }
      }),
      db.stockCount.updateMany({
        where: { warehouseId: warehouseId },
        data: { warehouseId: null }
      })
    ]);

    await db.warehouse.delete({
      where: { id: warehouseId }
    });

    return NextResponse.json({
      success: true,
      message: 'Warehouse deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    return NextResponse.json(
      { success: false, error: `Failed to delete warehouse: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
