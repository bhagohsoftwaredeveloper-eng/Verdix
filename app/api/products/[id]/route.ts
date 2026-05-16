import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      description,
      category,
      brand,
      stock,
      price,
      cost,
      sku,
      barcode,
      stockIncrement
    } = body;

    // Handle atomic stock increment if provided
    if (stockIncrement !== undefined) {
      const updatedProduct = await db.product.update({
        where: { id },
        data: {
          stock: {
            increment: Number(stockIncrement),
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedProduct,
        message: 'Product stock updated successfully'
      });
    }

    // Handle general updates
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (brand !== undefined) updateData.brand = brand;
    if (stock !== undefined) updateData.stock = Number(stock);
    if (price !== undefined) updateData.price = Number(price);
    if (cost !== undefined) updateData.cost = cost ? Number(cost) : null;
    if (sku !== undefined) updateData.sku = sku;
    if (barcode !== undefined) updateData.barcode = barcode;

    if (Object.keys(updateData).length > 0) {
      await db.product.update({
        where: { id },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
