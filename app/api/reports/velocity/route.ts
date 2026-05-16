import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // 'fast', 'slow', or 'none'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let totalItems = 0;

    if (type === 'none') {
      // Get products with no sales
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateObj;
      }

      const productIdsWithSales = await db.saleItem.findMany({
        distinct: ['productId'],
        where: Object.keys(dateFilter).length > 0 ? {
          sale: {
            status: { notIn: ['Voided', 'Returned'] },
            createdAt: dateFilter
          }
        } : {
          sale: {
            status: { notIn: ['Voided', 'Returned'] }
          }
        },
        select: { productId: true }
      });

      const idsSet = new Set(productIdsWithSales.map(p => p.productId));

      // Get all products except those with sales
      const allProducts = await db.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          category: true,
          stock: true
        }
      });

      const noSalesProducts = allProducts.filter(p => !idsSet.has(p.id));
      totalItems = noSalesProducts.length;

      const products = noSalesProducts
        .slice(offset, offset + limit)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category: p.category,
          stock: p.stock.toNumber ? p.stock.toNumber() : Number(p.stock),
          totalSold: 0,
          totalRevenue: 0
        }));

      const totalPages = Math.ceil(totalItems / limit);

      return NextResponse.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    } else {
      // Get products with sales, aggregated
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateObj;
      }

      const salesData = await db.saleItem.groupBy({
        by: ['productId'],
        where: Object.keys(dateFilter).length > 0 ? {
          sale: {
            status: { notIn: ['Voided', 'Returned'] },
            createdAt: dateFilter
          }
        } : {
          sale: {
            status: { notIn: ['Voided', 'Returned'] }
          }
        },
        _sum: {
          quantity: true,
          price: true
        },
        orderBy: type === 'slow' ? { _sum: { quantity: 'asc' } } : { _sum: { quantity: 'desc' } }
      });

      totalItems = salesData.length;
      const totalPages = Math.ceil(totalItems / limit);

      const paginatedData = salesData.slice(offset, offset + limit);
      const productIds = paginatedData.map(d => d.productId);

      const products = await db.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          category: true,
          stock: true
        }
      });

      const productMap = new Map(products.map(p => [p.id, p]));

      const enrichedData = paginatedData.map(d => {
        const product = productMap.get(d.productId);
        const totalSold = d._sum.quantity?.toNumber ? d._sum.quantity.toNumber() : Number(d._sum.quantity || 0);
        const totalRevenue = d._sum.price?.toNumber ? d._sum.price.toNumber() : Number(d._sum.price || 0);

        return {
          id: d.productId,
          name: product?.name,
          sku: product?.sku,
          barcode: product?.barcode,
          category: product?.category,
          stock: product ? (product.stock.toNumber ? product.stock.toNumber() : Number(product.stock)) : 0,
          totalSold,
          totalRevenue
        };
      });

      return NextResponse.json({
        success: true,
        data: enrichedData,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    }

  } catch (error: any) {
    console.error('Error fetching velocity report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch velocity report' },
      { status: 500 }
    );
  }
}
