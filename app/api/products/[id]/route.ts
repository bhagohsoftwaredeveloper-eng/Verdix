import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/mysql';

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
      await query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [Number(stockIncrement), id]
      );
      
      // Fetch updated product to return
      const updatedProduct = await query('SELECT * FROM products WHERE id = ?', [id]);
      
      return NextResponse.json({
        success: true,
        data: updatedProduct[0],
        message: 'Product stock updated successfully'
      });
    }

    // Handle general updates
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (brand !== undefined) { updates.push('brand = ?'); values.push(brand); }
    if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (cost !== undefined) { updates.push('cost = ?'); values.push(cost); }
    if (sku !== undefined) { updates.push('sku = ?'); values.push(sku); }
    if (barcode !== undefined) { updates.push('barcode = ?'); values.push(barcode); }

    if (updates.length > 0) {
      values.push(id);
      await query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
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
