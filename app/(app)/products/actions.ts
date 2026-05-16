'use server';

import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { generateBatchId } from '@/lib/batch-utils';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';
import { PriceLevel, Category, Brand, Supplier, Warehouse, Department, UnitOfMeasure, ShelfLocation, Account, TaxRate } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { findUltimateRoot, deductFamilyStock, addFamilyStock } from '@/lib/family-sync';


export type ProductFormData = {
  name: string;
  brand: string;
  sku: string;
  barcode?: string;
  description: string;
  additionalDescription?: string;
  category: string;
  department?: string;
  subcategory?: string;
  supplier?: string;
  warehouse?: string;
  shelfLocationIds?: string[];
  image?: string;
  imageFile?: File;
  unitOfMeasure: string;
  stock?: number;
  reorderPoint: number;
  price: number;
  cost?: number;
  incomeAccount?: string;
  expenseAccount?: string;
  parentId?: string;
  conversionFactor?: number;
  conversionFactors?: { unit: string; factor: number }[];
  priceLevels?: { levelId: string; price: number; minQuantity?: number }[];
  supplierMappings?: {
    supplierId: string;
    leadTime: number;
    rop: number;
    cost?: number;
    supplierSku?: string;
    isPrimary: boolean;
  }[];
  vatStatus?: string;
  availability?: string;
  earnsPoints?: boolean;
};

export type ProductFilters = {
  search?: string;
  brand?: string;
  category?: string;
  department?: string;
  supplier?: string;
  warehouse?: string;
  shelfLocation?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'all' | string;
};

export async function getProducts(limit?: number, offset?: number, filters?: ProductFilters) {
  try {
    // Build filter conditions
    const whereConditions: any[] = [];

    if (filters?.search) {
      whereConditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { barcode: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    if (filters?.brand && filters.brand !== 'all') {
      whereConditions.push({ brand: filters.brand });
    }

    if (filters?.category && filters.category !== 'all') {
      whereConditions.push({ category: filters.category });
    }

    if (filters?.department && filters.department !== 'all') {
      whereConditions.push({ department: filters.department });
    }

    if (filters?.supplier && filters.supplier !== 'all') {
      whereConditions.push({
        OR: [
          { supplierId: filters.supplier },
          { supplierMappings: { some: { supplierId: filters.supplier } } }
        ]
      });
    }

    if (filters?.warehouse && filters.warehouse !== 'all') {
      whereConditions.push({ warehouseId: filters.warehouse });
    }

    if (filters?.shelfLocation && filters.shelfLocation !== 'all') {
      whereConditions.push({
        productShelves: { some: { shelfId: filters.shelfLocation } }
      });
    }

    // Get low stock threshold (default to 10)
    const lowStockThreshold = 10;

    // Note: Complex status filters (low-stock, in-stock) require raw query
    // For basic filtering, we only support out-of-stock
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'out-of-stock') {
        whereConditions.push({ stock: { lte: 0 } });
      }
      // low-stock and in-stock require field comparison with reorderPoint
      // This should be handled at the application level after fetching
    }

    const hasActiveFilters = filters && (
      (filters.brand && filters.brand !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.department && filters.department !== 'all') ||
      (filters.supplier && filters.supplier !== 'all') ||
      (filters.warehouse && filters.warehouse !== 'all') ||
      (filters.shelfLocation && filters.shelfLocation !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.search
    );

    // If no active filters and pagination is requested, only show root products
    if (!hasActiveFilters && limit !== undefined && offset !== undefined) {
      whereConditions.push({ parentId: null });
    }

    // Fetch products with pagination
    const products = await db.product.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : undefined,
      include: {
        productShelves: {
          include: { shelf: true }
        },
        conversionFactors: true,
        supplierMappings: {
          include: { supplier: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    let finalProducts = products;

    // If no active filters and pagination, fetch family trees
    if (!hasActiveFilters && limit !== undefined && offset !== undefined && products.length > 0) {
      try {
        const rootIds = products.map(p => p.id);

        // Use raw query for recursive CTE (Prisma doesn't have native recursive support)
        const recursiveResults = await db.$queryRaw`
          WITH RECURSIVE product_tree AS (
            SELECT p.*,
                   COALESCE(w.name, '') as warehouse_name,
                   COALESCE(s_primary.id, '') as primary_supplier_id,
                   COALESCE(s_primary.name, '') as primary_supplier_name,
                   COALESCE(spm.supplier_specific_rop, 0)::text as primary_supplier_rop,
                   CAST(p.warehouse_id AS text) as inherited_warehouse_id,
                   CAST(p.department AS text) as inherited_department,
                   CAST(p.vat_status AS text) as inherited_vat_status
            FROM products p
            LEFT JOIN warehouses w ON p.warehouse_id = w.id
            LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = true
            LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
            WHERE p.id = ANY($1::text[])

            UNION ALL

            SELECT p.*,
                   COALESCE(w.name, pt.warehouse_name) as warehouse_name,
                   COALESCE(spm.supplier_id, pt.primary_supplier_id) as primary_supplier_id,
                   COALESCE(s_primary.name, pt.primary_supplier_name) as primary_supplier_name,
                   COALESCE(spm.supplier_specific_rop, CAST(pt.primary_supplier_rop AS integer))::text as primary_supplier_rop,
                   COALESCE(p.warehouse_id, pt.inherited_warehouse_id) as inherited_warehouse_id,
                   COALESCE(p.department, pt.inherited_department) as inherited_department,
                   COALESCE(p.vat_status, pt.inherited_vat_status) as inherited_vat_status
            FROM products p
            INNER JOIN product_tree pt ON p.parent_id = pt.id
            LEFT JOIN warehouses w ON p.warehouse_id = w.id
            LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = true
            LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
          )
          SELECT * FROM product_tree ORDER BY created_at DESC
        ` as any[];

        // Merge recursive results with shelf and other relations
        finalProducts = await Promise.all(recursiveResults.map(async (p: any) => {
          const fullProduct = await db.product.findUnique({
            where: { id: p.id },
            include: {
              productShelves: { include: { shelf: true } },
              conversionFactors: true,
              supplierMappings: { include: { supplier: true } }
            }
          });
          return fullProduct || p;
        }));
      } catch (err) {
        console.warn('Recursive CTE failed, falling back to flat list:', err);
        // Use flat list from initial query
      }
    }

    // Fetch all conversion factors for the final products
    const allConversionFactors = await db.conversionFactor.findMany({
      orderBy: [{ productId: 'asc' }, { createdAt: 'asc' }]
    });

    const cfMap = new Map();
    allConversionFactors.forEach(cf => {
      if (!cfMap.has(cf.productId)) {
        cfMap.set(cf.productId, []);
      }
      cfMap.get(cf.productId).push({
        unit: cf.unit,
        factor: cf.factor.toNumber()
      });
    });

    // Fetch default price level
    const defaultPriceLevel = await db.priceLevel.findFirst({
      where: { isDefault: true }
    });
    const defaultLevelId = defaultPriceLevel?.id || 'retail-level';

    // Build warehouse name map
    const warehouseMap = new Map();
    const uniqueWarehouseIds = [...new Set(finalProducts.filter(p => p.warehouseId).map(p => p.warehouseId))];
    if (uniqueWarehouseIds.length > 0) {
      const warehouses = await db.warehouse.findMany({
        where: { id: { in: uniqueWarehouseIds as string[] } }
      });
      warehouses.forEach(w => warehouseMap.set(w.id, w.name));
    }

    // Format response
    return finalProducts.map(product => {
      const shelves = product.productShelves || [];
      const shelfLocationIds = shelves.map(ps => ps.shelfId);
      const shelfLocationNames = shelves.map(ps => ps.shelf?.name || ps.shelfId);
      const shelfQuantities = Object.fromEntries(
        shelves.map(ps => [ps.shelfId, ps.quantity.toNumber()])
      );

      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        additionalDescription: product.additionalDescription,
        sku: product.sku,
        barcode: product.barcode,
        stock: product.stock.toNumber(),
        reorderPoint: product.reorderPoint.toNumber(),
        avgDailySales: product.avgDailySales.toNumber(),
        price: product.price.toNumber(),
        cost: product.cost ? product.cost.toNumber() : undefined,
        imageUrl: product.imageUrl,
        imageHint: product.imageHint,
        unitOfMeasure: product.unitOfMeasure,
        parentId: product.parentId,
        conversionFactor: 1,
        conversionFactors: cfMap.get(product.id) || [],
        incomeAccount: product.incomeAccount,
        expenseAccount: product.expenseAccount,
        supplier: product.supplierId,
        supplierName: product.supplierMappings?.[0]?.supplier?.name,
        warehouse: product.warehouseId,
        warehouseId: product.warehouseId,
        warehouseName: product.warehouseId ? warehouseMap.get(product.warehouseId) : undefined,
        department: product.department,
        shelfLocationId: shelfLocationIds[0],
        shelfLocationIds,
        shelfLocationName: shelfLocationNames[0],
        shelfLocationNames,
        shelfQuantities,
        priceLevels: [], // Note: ProductPriceLevel table doesn't exist yet in schema
        vatStatus: product.vatStatus,
        availability: product.availability,
        earns_points: product.earnsPoints,
        expirationDate: product.expirationDate,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        hasPendingApproval: false // TODO: Check approval_queue table
      };
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function getProductsCount(filters?: ProductFilters) {
  try {
    const whereConditions: any[] = [];

    if (filters?.search) {
      whereConditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { barcode: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    if (filters?.brand && filters.brand !== 'all') {
      whereConditions.push({ brand: filters.brand });
    }

    if (filters?.category && filters.category !== 'all') {
      whereConditions.push({ category: filters.category });
    }

    if (filters?.department && filters.department !== 'all') {
      whereConditions.push({ department: filters.department });
    }

    if (filters?.supplier && filters.supplier !== 'all') {
      whereConditions.push({
        OR: [
          { supplierId: filters.supplier },
          { supplierMappings: { some: { supplierId: filters.supplier } } }
        ]
      });
    }

    if (filters?.warehouse && filters.warehouse !== 'all') {
      whereConditions.push({ warehouseId: filters.warehouse });
    }

    if (filters?.shelfLocation && filters.shelfLocation !== 'all') {
      whereConditions.push({
        productShelves: { some: { shelfId: filters.shelfLocation } }
      });
    }

    // Get low stock threshold (default to 10)
    const lowStockThreshold = 10;

    // Note: Complex status filters (low-stock, in-stock) require raw query
    // For basic filtering, we only support out-of-stock
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'out-of-stock') {
        whereConditions.push({ stock: { lte: 0 } });
      }
      // low-stock and in-stock require field comparison with reorderPoint
      // This should be handled at the application level after fetching
    }

    const hasActiveFilters = filters && (
      (filters.brand && filters.brand !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.department && filters.department !== 'all') ||
      (filters.supplier && filters.supplier !== 'all') ||
      (filters.warehouse && filters.warehouse !== 'all') ||
      (filters.shelfLocation && filters.shelfLocation !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.search
    );

    if (!hasActiveFilters) {
      whereConditions.push({ parentId: null });
    }

    return await db.product.count({
      where: whereConditions.length > 0 ? { AND: whereConditions } : undefined
    });
  } catch (error) {
    console.error('Error fetching products count:', error);
    return 0;
  }
}

export async function getLowStockAlerts() {
  try {
    // Get low stock threshold (default to 10)
    const globalThreshold = 10;

    const products = await db.product.findMany({
      where: {
        stock: { lt: globalThreshold }
      },
      select: {
        id: true,
        name: true,
        stock: true,
        reorderPoint: true
      }
    });

    // Filter client-side for products below reorderPoint
    const lowStockProducts = products.filter(p =>
      p.stock.toNumber() < p.reorderPoint.toNumber() || p.stock.toNumber() < globalThreshold
    );

    return lowStockProducts.map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock.toNumber(),
      reorderPoint: Math.max(p.reorderPoint.toNumber() || 0, globalThreshold)
    }));
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return [];
  }
}

export async function addProduct(formData: ProductFormData) {
  try {
    if (formData.conversionFactors && formData.conversionFactors.length > 0) {
      const units = formData.conversionFactors.map(cf => cf.unit.toLowerCase());
      const uniqueUnits = new Set(units);
      if (units.length !== uniqueUnits.size) {
        return { success: false, message: 'Duplicate conversion factor units detected. Each unit must be unique.' };
      }
    }

    const productId = `${formData.sku}-${Date.now()}`;

    await withTransaction(async () => {
      const legacyShelfId = formData.shelfLocationIds && formData.shelfLocationIds.length > 0
        ? formData.shelfLocationIds[0]
        : null;

      // Create product
      const product = await db.product.create({
        data: {
          id: productId,
          name: formData.name,
          description: formData.description,
          additionalDescription: formData.additionalDescription || null,
          category: formData.category,
          brand: formData.brand,
          department: formData.department || null,
          subcategory: formData.subcategory || null,
          supplierId: formData.supplier || null,
          warehouseId: formData.warehouse || null,
          stock: formData.stock || 0,
          reorderPoint: formData.reorderPoint || formData.supplierMappings?.find(m => m.isPrimary)?.rop || 0,
          avgDailySales: 0,
          price: formData.price,
          cost: formData.cost || null,
          sku: formData.sku,
          barcode: formData.barcode || null,
          imageUrl: formData.image || null,
          imageHint: formData.name.toLowerCase().replace(/\s+/g, '-'),
          unitOfMeasure: formData.unitOfMeasure,
          parentId: formData.parentId || null,
          incomeAccount: formData.incomeAccount || null,
          expenseAccount: formData.expenseAccount || null,
          vatStatus: formData.vatStatus || 'YES (Subject to 12% VAT)',
          availability: formData.availability || 'Available',
          earnsPoints: formData.earnsPoints !== false,
          shelfLocationId: legacyShelfId
        }
      });

      // Create initial batch if stock provided
      if (formData.stock && formData.stock > 0) {
        try {
          const batchId = generateBatchId();
          await db.inventoryBatch.create({
            data: {
              id: batchId,
              productId,
              receivedDate: new Date(),
              quantityIn: formData.stock,
              quantityRemaining: formData.stock,
              unitCost: formData.cost || 0,
              sellingPrice: formData.price || 0,
              sourceType: 'adjustment',
              notes: 'Initial Stock'
            }
          });
        } catch (batchErr) {
          console.warn('[BatchCosting] Could not create batch for initial product stock:', batchErr);
        }
      }

      // Create shelf assignments
      if (formData.shelfLocationIds && formData.shelfLocationIds.length > 0) {
        for (let i = 0; i < formData.shelfLocationIds.length; i++) {
          const shelfId = formData.shelfLocationIds[i];
          const qty = i === 0 ? (formData.stock || 0) : 0;
          await db.productShelf.create({
            data: {
              productId,
              shelfId,
              quantity: qty
            }
          });
        }
      }

      // Create conversion factors
      if (formData.conversionFactors && formData.conversionFactors.length > 0) {
        for (const cf of formData.conversionFactors) {
          const cfId = `${productId}-cf-${cf.unit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await db.conversionFactor.create({
            data: {
              id: cfId,
              productId,
              unit: cf.unit,
              factor: cf.factor
            }
          });
        }
      }

      // Create price levels (Note: ProductPriceLevel table may need to be added)
      // For now, store in product price field or implement separate table

      // Create supplier mappings
      if (formData.supplierMappings && formData.supplierMappings.length > 0) {
        for (const mapping of formData.supplierMappings) {
          const mappingId = `${productId}-sm-${mapping.supplierId}-${Date.now()}`;
          await db.supplierProductMapping.create({
            data: {
              id: mappingId,
              productId,
              supplierId: mapping.supplierId,
              supplierSku: mapping.supplierSku || null,
              supplierLeadTime: mapping.leadTime,
              supplierSpecificRop: mapping.rop,
              supplierCost: mapping.cost || null,
              isPrimary: mapping.isPrimary
            }
          });
        }
      }
    });

    return { success: true, message: `${formData.name} has been added to the inventory.`, productId };
  } catch (error: any) {
    console.error('Error saving product:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('unique_product_unit')) {
      return { success: false, message: 'A conversion factor with this unit already exists for this product.' };
    }
    return { success: false, message: 'There was an error saving the product.' };
  }
}

export async function updateProduct(id: string, formData: ProductFormData) {
  try {
    if (formData.conversionFactors && formData.conversionFactors.length > 0) {
      const units = formData.conversionFactors.map(cf => cf.unit.toLowerCase());
      const uniqueUnits = new Set(units);
      if (units.length !== uniqueUnits.size) {
        return { success: false, message: 'Duplicate conversion factor units detected. Each unit must be unique.' };
      }
    }

    await withTransaction(async () => {
      // Fetch existing product
      const existing = await db.product.findUnique({
        where: { id },
        include: { productShelves: true }
      });

      if (!existing) {
        throw new Error('Product not found');
      }

      const legacyShelfId = formData.shelfLocationIds && formData.shelfLocationIds.length > 0
        ? formData.shelfLocationIds[0]
        : existing.shelfLocationId;

      // Handle family stock sync for manual stock edits
      if (formData.stock !== undefined) {
        const originalStock = Number(existing.stock || 0);
        const newStock = Number(formData.stock);
        const delta = newStock - originalStock;

        if (delta !== 0) {
          const { rootId, factorToRoot } = await findUltimateRoot(id, null);
          const rootDelta = delta / factorToRoot;

          if (delta < 0) {
            await deductFamilyStock(rootId, Math.abs(rootDelta), `adj_edit_${Date.now()}`, 'adjustment', `Manual edit of ${existing.name}`, null);
          } else {
            await addFamilyStock(rootId, rootDelta, `adj_edit_${Date.now()}`, 'adjustment', `Manual edit of ${existing.name}`, null);
          }
        }
      }

      // Update product
      await db.product.update({
        where: { id },
        data: {
          name: formData.name ?? existing.name,
          description: formData.description ?? existing.description,
          additionalDescription: formData.additionalDescription !== undefined
            ? formData.additionalDescription
            : existing.additionalDescription,
          category: formData.category ?? existing.category,
          brand: formData.brand ?? existing.brand,
          department: formData.department !== undefined ? formData.department : existing.department,
          subcategory: formData.subcategory !== undefined ? formData.subcategory : existing.subcategory,
          supplierId: formData.supplier !== undefined ? formData.supplier : existing.supplierId,
          warehouseId: formData.warehouse !== undefined ? formData.warehouse : existing.warehouseId,
          stock: formData.stock !== undefined ? formData.stock : existing.stock,
          reorderPoint: formData.reorderPoint !== undefined ? formData.reorderPoint : existing.reorderPoint,
          price: formData.price !== undefined ? formData.price : existing.price,
          cost: formData.cost !== undefined ? formData.cost : existing.cost,
          sku: formData.sku ?? existing.sku,
          barcode: formData.barcode !== undefined ? formData.barcode : existing.barcode,
          imageUrl: formData.image !== undefined ? formData.image : existing.imageUrl,
          imageHint: formData.name ? formData.name.toLowerCase().replace(/\s+/g, '-') : existing.imageHint,
          unitOfMeasure: formData.unitOfMeasure ?? existing.unitOfMeasure,
          incomeAccount: formData.incomeAccount !== undefined ? formData.incomeAccount : existing.incomeAccount,
          expenseAccount: formData.expenseAccount !== undefined ? formData.expenseAccount : existing.expenseAccount,
          vatStatus: formData.vatStatus ?? existing.vatStatus,
          availability: formData.availability ?? existing.availability,
          earnsPoints: formData.earnsPoints !== undefined ? formData.earnsPoints : existing.earnsPoints,
          shelfLocationId: legacyShelfId
        }
      });

      // Handle shelf assignments with quantity preservation
      const currentShelves = existing.productShelves || [];
      const currentQtyMap = new Map(currentShelves.map(s => [s.shelfId, s.quantity]));

      // Delete all current shelf assignments
      await db.productShelf.deleteMany({ where: { productId: id } });

      // Create new shelf assignments
      if (formData.shelfLocationIds && formData.shelfLocationIds.length > 0) {
        for (let i = 0; i < formData.shelfLocationIds.length; i++) {
          const shelfId = formData.shelfLocationIds[i];
          let qty = currentQtyMap.get(shelfId) || 0;

          if (currentShelves.length === 0 && i === 0) {
            qty = formData.stock || 0;
          }

          await db.productShelf.create({
            data: {
              productId: id,
              shelfId,
              quantity: qty
            }
          });
        }
      }

      // Update conversion factors
      await db.conversionFactor.deleteMany({ where: { productId: id } });
      if (formData.conversionFactors && formData.conversionFactors.length > 0) {
        for (const cf of formData.conversionFactors) {
          const cfId = `${id}-cf-${cf.unit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await db.conversionFactor.create({
            data: {
              id: cfId,
              productId: id,
              unit: cf.unit,
              factor: cf.factor
            }
          });
        }
      }

      // Update supplier mappings
      if (formData.supplierMappings) {
        await db.supplierProductMapping.deleteMany({ where: { productId: id } });
        for (const mapping of formData.supplierMappings) {
          const mappingId = `${id}-sm-${mapping.supplierId}-${Date.now()}`;
          await db.supplierProductMapping.create({
            data: {
              id: mappingId,
              productId: id,
              supplierId: mapping.supplierId,
              supplierSku: mapping.supplierSku || null,
              supplierLeadTime: mapping.leadTime,
              supplierSpecificRop: mapping.rop,
              supplierCost: mapping.cost || null,
              isPrimary: mapping.isPrimary
            }
          });
        }
      }
    });

    return { success: true, message: `${formData.name} has been updated.` };
  } catch (error: any) {
    console.error('Error updating product:', error);
    if (error.code === 'P2002' && error.message?.includes('unique_product_unit')) {
      return { success: false, message: 'A conversion factor with this unit already exists for this product.' };
    }
    return { success: false, message: 'There was an error updating the product.' };
  }
}

export async function deleteProduct(id: string) {
  try {
    await withTransaction(async () => {
      // Cascade delete is handled by Prisma relations, but we can be explicit
      await db.productShelf.deleteMany({ where: { productId: id } });
      await db.conversionFactor.deleteMany({ where: { productId: id } });
      await db.supplierProductMapping.deleteMany({ where: { productId: id } });
      await db.product.delete({ where: { id } });
    });
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: 'Error deleting product. It might be referenced by other records.' };
  }
}

export async function updateProductPrice(id: string, newPrice: number) {
  try {
    const defaultPriceLevel = await db.priceLevel.findFirst({
      where: { isDefault: true }
    });
    const defaultLevelId = defaultPriceLevel?.id || 'retail-level';

    await withTransaction(async () => {
      // Check if product_price_levels table exists and has entry
      // For now, just update product price directly
      await db.product.update({
        where: { id },
        data: { price: newPrice }
      });

      // Note: ProductPriceLevel functionality needs to be implemented
      // when the table is added to Prisma schema
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product price:', error);
    return { success: false };
  }
}

export async function updateProductStock(id: string, newStock: number) {
  try {
    await db.product.update({
      where: { id },
      data: { stock: newStock }
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating product stock:', error);
    return { success: false };
  }
}

export type BreakPackNewProductData = {
  name: string;
  unitOfMeasure: string;
  conversionFactor: number;
  price: number;
  cost?: number;
  barcode?: string;
};

export async function breakPack(
  parentId: string,
  childId: string | null,
  quantityToBreak: number,
  manualFactor?: number,
  newProductData?: BreakPackNewProductData,
  userId: string = 'system',
  isInternalFinalization: boolean = false
) {
  try {
    // Check if approval is required
    if (!isInternalFinalization) {
      const isApprovalRequired = await checkApprovalRequired('REPACKAGING');
      if (isApprovalRequired) {
        const parentInfo = await db.product.findFirst({
          where: {
            OR: [
              { id: parentId },
              { sku: parentId }
            ]
          },
          include: { productShelves: true }
        });

        let targetName = newProductData?.name || 'New Product';
        let targetUnit = newProductData?.unitOfMeasure || '';
        let targetBarcode = newProductData?.barcode || '';
        let targetSku = 'NEW';
        let targetPrice = newProductData?.price || 0;
        let targetCost = newProductData?.cost || 0;

        if (childId) {
          const childInfo = await db.product.findFirst({
            where: {
              OR: [
                { id: childId },
                { sku: childId }
              ]
            }
          });
          if (childInfo) {
            targetName = childInfo.name;
            targetUnit = childInfo.unitOfMeasure || '';
            targetBarcode = childInfo.barcode || '';
            targetSku = childInfo.sku || '';
            targetPrice = childInfo.price.toNumber();
            targetCost = childInfo.cost ? childInfo.cost.toNumber() : 0;
          }
        }

        const factor = manualFactor || newProductData?.conversionFactor || 1;
        const sourceName = parentInfo?.name || parentId;

        const items = [
          {
            productId: parentId,
            productName: sourceName,
            sku: parentInfo?.sku || '',
            barcode: parentInfo?.barcode || '',
            price: parentInfo?.price.toNumber() || 0,
            cost: parentInfo?.cost ? parentInfo.cost.toNumber() : 0,
            quantity: -quantityToBreak,
            unit: parentInfo?.unitOfMeasure || ''
          },
          {
            productId: childId || 'NEW',
            productName: targetName,
            sku: targetSku,
            barcode: targetBarcode,
            price: targetPrice,
            cost: targetCost,
            quantity: quantityToBreak * factor,
            unit: targetUnit
          }
        ];

        const { queueId, pendingApproval } = await submitToApprovalQueue('REPACKAGING', {
          parentId,
          childId,
          quantityToBreak,
          manualFactor,
          newProductData,
          sourceProductName: sourceName,
          targetProductName: targetName,
          sourceUnit: parentInfo?.unitOfMeasure || '',
          currentStock: parentInfo?.stock.toNumber() || 0,
          quantity: `${quantityToBreak} ${parentInfo?.unitOfMeasure || ''}`.trim(),
          warehouseName: 'N/A', // TODO: Get warehouse name
          reason: 'Break Pack',
          items
        }, userId);

        if (pendingApproval) {
          return { success: true, pendingApproval: true, queueId, message: 'Repackaging request submitted for approval.' };
        }
      }
    }

    return await withTransaction(async () => {
      const repackagingId = `rpkg_${uuidv4()}`;

      // 1. Fetch parent info
      const parent = await db.product.findUnique({
        where: { id: parentId },
        include: { productShelves: true }
      });

      if (!parent) throw new Error('Parent product not found.');
      if (parent.stock.toNumber() < quantityToBreak) {
        throw new Error(`Insufficient stock of ${parent.name}. Available: ${parent.stock.toNumber()}`);
      }

      let resolvedChildId = childId;
      let childName: string;
      let childStock: number;
      let childUnit: string;
      let factor: number;

      // Scenario A: Auto-create a new child product
      if (!resolvedChildId && newProductData) {
        const newId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newSku = `${parent.sku}-${newProductData.unitOfMeasure.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        factor = newProductData.conversionFactor;

        const newChild = await db.product.create({
          data: {
            id: newId,
            name: newProductData.name,
            brand: parent.brand,
            sku: newSku,
            description: `Repackaged from ${parent.name}`,
            category: parent.category,
            subcategory: parent.subcategory,
            unitOfMeasure: newProductData.unitOfMeasure,
            stock: 0,
            reorderPoint: 0,
            price: newProductData.price,
            cost: newProductData.cost || null,
            barcode: newProductData.barcode || null,
            warehouseId: parent.warehouseId,
            department: parent.department,
            supplierId: parent.supplierId,
            vatStatus: parent.vatStatus,
            incomeAccount: parent.incomeAccount,
            expenseAccount: parent.expenseAccount,
            availability: 'Available'
          }
        });

        resolvedChildId = newId;
        childName = newProductData.name;
        childStock = 0;
        childUnit = newProductData.unitOfMeasure;
      } else if (resolvedChildId) {
        const child = await db.product.findUnique({ where: { id: resolvedChildId } });
        if (!child) throw new Error('Target product not found.');

        childName = child.name;
        childStock = child.stock.toNumber();
        childUnit = child.unitOfMeasure || '';
        factor = manualFactor || 1;
      } else {
        throw new Error('No target product specified for break pack.');
      }

      const childQuantityToAdd = quantityToBreak * factor;

      // 2. Perform Stock Update with Family Sync
      const { rootId: sourceRootId, factorToRoot: sourceFactorToRoot } = await findUltimateRoot(parentId, null);
      const sourceRootQty = quantityToBreak / sourceFactorToRoot;
      await deductFamilyStock(sourceRootId, sourceRootQty, repackagingId, 'adjustment', `Repackaging: Break Pack from ${parentId}`, null);

      const { rootId: destRootId, factorToRoot: destFactorToRoot } = await findUltimateRoot(resolvedChildId, null);
      const destRootQty = childQuantityToAdd / destFactorToRoot;
      await addFamilyStock(destRootId, destRootQty, repackagingId, 'adjustment', `Repackaging: Produced from ${parentId}`, null);

      // 3. Log to repackaging_logs
      const logId = `rpkg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await db.repackagingLog.create({
        data: {
          id: logId,
          sourceProductId: parentId,
          sourceProductName: parent.name,
          sourceQty: quantityToBreak,
          targetProductId: resolvedChildId,
          targetProductName: childName,
          targetQtyProduced: childQuantityToAdd,
          factor,
          status: 'completed',
          createdBy: userId
        }
      });

      // 4. BATCH COSTING
      try {
        const posSettings = await db.posSettings.findFirst();
        const repackInherit = !posSettings || posSettings.batchCostingRepackInherit !== false;

        let childUnitCost: number;
        let sourceType: string;

        if (repackInherit) {
          const parentBatch = await db.inventoryBatch.findFirst({
            where: {
              productId: parentId,
              quantityRemaining: { gt: 0 }
            },
            orderBy: [{ receivedDate: 'asc' }, { createdAt: 'asc' }]
          });

          if (parentBatch) {
            childUnitCost = parentBatch.unitCost.toNumber() / factor;
            sourceType = 'repack_inherit';
          } else {
            childUnitCost = (parent.cost ? parent.cost.toNumber() : 0) / factor;
            sourceType = 'repack_inherit';
          }
        } else {
          const childProduct = await db.product.findUnique({ where: { id: resolvedChildId } });
          childUnitCost = childProduct?.cost ? childProduct.cost.toNumber() : 0;
          sourceType = 'repack_new';
        }

        const childSellingPrice = (await db.product.findUnique({ where: { id: resolvedChildId } }))?.price.toNumber() || 0;

        const childBatchId = generateBatchId();
        await db.inventoryBatch.create({
          data: {
            id: childBatchId,
            productId: resolvedChildId,
            receivedDate: new Date(),
            quantityIn: childQuantityToAdd,
            quantityRemaining: childQuantityToAdd,
            unitCost: childUnitCost,
            sellingPrice: childSellingPrice,
            sourceType: sourceType as any,
            notes: `Repackaged from ${parent.name} (${logId})`
          }
        });
      } catch (batchErr) {
        console.warn('[BatchCosting] Could not create repack child batch:', batchErr);
      }

      return { success: true, message: `Successfully repackaged ${quantityToBreak} ${parent.unitOfMeasure} into ${childQuantityToAdd} ${childUnit}.` };
    });
  } catch (error: any) {
    console.error('Error in breakPack:', error);
    return { success: false, message: error.message || 'Internal server error during break pack operation.' };
  }
}

export type ConsolidatePackNewProductData = {
  name: string;
  unitOfMeasure: string;
  conversionFactor: number;
  price: number;
  cost?: number;
  barcode?: string;
};

export async function consolidatePack(
  packId: string,
  bulkId: string | null,
  packQtyUsed: number,
  manualFactor?: number,
  newProductData?: ConsolidatePackNewProductData,
  userId: string = 'system',
  isInternalFinalization: boolean = false
) {
  try {
    // Check if approval is required
    if (!isInternalFinalization) {
      const isApprovalRequired = await checkApprovalRequired('REPACKAGING');
      if (isApprovalRequired) {
        const packInfo = await db.product.findFirst({
          where: { id: packId }
        });

        let targetName = newProductData?.name || 'New Bulk Product';
        let targetUnit = newProductData?.unitOfMeasure || '';
        let targetBarcode = newProductData?.barcode || '';
        let targetSku = 'NEW';
        let targetPrice = newProductData?.price || 0;
        let targetCost = newProductData?.cost || 0;

        if (bulkId) {
          const bulkInfo = await db.product.findUnique({ where: { id: bulkId } });
          if (bulkInfo) {
            targetName = bulkInfo.name;
            targetUnit = bulkInfo.unitOfMeasure || '';
            targetBarcode = bulkInfo.barcode || '';
            targetSku = bulkInfo.sku || '';
            targetPrice = bulkInfo.price.toNumber();
            targetCost = bulkInfo.cost ? bulkInfo.cost.toNumber() : 0;
          }
        }

        const factor = manualFactor ?? newProductData?.conversionFactor ?? 1;
        const sourceName = packInfo?.name || packId;
        const bulkQtyProduced = packQtyUsed / factor;

        const items = [
          {
            productId: packId,
            productName: sourceName,
            sku: packInfo?.sku || '',
            barcode: packInfo?.barcode || '',
            price: packInfo?.price.toNumber() || 0,
            cost: packInfo?.cost ? packInfo.cost.toNumber() : 0,
            quantity: -packQtyUsed,
            unit: packInfo?.unitOfMeasure || ''
          },
          {
            productId: bulkId || 'NEW',
            productName: targetName,
            sku: targetSku,
            barcode: targetBarcode,
            price: targetPrice,
            cost: targetCost,
            quantity: bulkQtyProduced,
            unit: targetUnit
          }
        ];

        const { queueId, pendingApproval } = await submitToApprovalQueue('REPACKAGING', {
          direction: 'consolidate',
          packId,
          bulkId,
          packQtyUsed,
          manualFactor,
          newProductData,
          sourceProductName: sourceName,
          targetProductName: targetName,
          sourceUnit: packInfo?.unitOfMeasure || '',
          currentStock: packInfo?.stock.toNumber() || 0,
          quantity: `${packQtyUsed} ${packInfo?.unitOfMeasure || ''}`.trim(),
          warehouseName: 'N/A',
          reason: 'Consolidate Pack',
          items
        }, userId);

        if (pendingApproval) {
          return {
            success: true,
            pendingApproval: true,
            queueId,
            message: 'Consolidation request submitted for approval.'
          };
        }
      }
    }

    return await withTransaction(async () => {
      const repackagingId = `rpkg_${uuidv4()}`;

      // 1. Fetch pack (source) info
      const pack = await db.product.findUnique({ where: { id: packId } });
      if (!pack) throw new Error('Pack product not found.');
      if (pack.stock.toNumber() < packQtyUsed) {
        throw new Error(`Insufficient stock of ${pack.name}. Available: ${pack.stock.toNumber()}`);
      }

      let resolvedBulkId = bulkId;
      let bulkName: string;
      let bulkStock: number;
      let bulkUnit: string;
      let factor: number;

      // Scenario A: Auto-create a new bulk product
      if (!resolvedBulkId && newProductData) {
        const newId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newSku = `${pack.sku}-BULK-${Date.now().toString(36).toUpperCase()}`;
        factor = newProductData.conversionFactor;

        const newBulk = await db.product.create({
          data: {
            id: newId,
            name: newProductData.name,
            brand: pack.brand,
            sku: newSku,
            description: `Consolidated from ${pack.name}`,
            category: pack.category,
            subcategory: pack.subcategory,
            unitOfMeasure: newProductData.unitOfMeasure,
            stock: 0,
            reorderPoint: 0,
            price: newProductData.price,
            cost: newProductData.cost || null,
            barcode: newProductData.barcode || null,
            warehouseId: pack.warehouseId,
            department: pack.department,
            supplierId: pack.supplierId,
            vatStatus: pack.vatStatus,
            incomeAccount: pack.incomeAccount,
            expenseAccount: pack.expenseAccount,
            availability: 'Available'
          }
        });

        resolvedBulkId = newId;
        bulkName = newProductData.name;
        bulkStock = 0;
        bulkUnit = newProductData.unitOfMeasure;
      } else if (resolvedBulkId) {
        const bulk = await db.product.findUnique({ where: { id: resolvedBulkId } });
        if (!bulk) throw new Error('Bulk/target product not found.');

        bulkName = bulk.name;
        bulkStock = bulk.stock.toNumber();
        bulkUnit = bulk.unitOfMeasure || '';
        factor = manualFactor ?? 1;
      } else {
        throw new Error('No target bulk product specified for consolidation.');
      }

      const bulkQtyToAdd = packQtyUsed / factor;

      // 2. Perform Stock Update with Family Sync
      const { rootId: packRootId, factorToRoot: packFactorToRoot } = await findUltimateRoot(packId, null);
      const packRootQty = packQtyUsed / packFactorToRoot;
      await deductFamilyStock(packRootId, packRootQty, repackagingId, 'adjustment', `Consolidation: Used ${packQtyUsed} of ${packId}`, null);

      const { rootId: bulkRootId, factorToRoot: bulkFactorToRoot } = await findUltimateRoot(resolvedBulkId, null);
      const bulkRootQty = bulkQtyToAdd / bulkFactorToRoot;
      await addFamilyStock(bulkRootId, bulkRootQty, repackagingId, 'adjustment', `Consolidation: Produced from ${packId}`, null);

      // 3. Record stock movements
      const movementId1 = `mov_cons_p_${Date.now()}`;
      const movementId2 = `mov_cons_b_${Date.now() + 1}`;

      await db.stockMovement.create({
        data: {
          id: movementId1,
          productId: packId,
          productName: pack.name,
          movementType: 'adjustment',
          quantityChange: -packQtyUsed,
          previousStock: pack.stock.toNumber(),
          newStock: pack.stock.toNumber() - packQtyUsed,
          referenceId: resolvedBulkId,
          referenceType: 'consolidate_pack',
          notes: `Consolidated ${packQtyUsed} ${pack.unitOfMeasure} into ${bulkName}`
        }
      });

      const bulkProduct = await db.product.findUnique({ where: { id: resolvedBulkId } });

      await db.stockMovement.create({
        data: {
          id: movementId2,
          productId: resolvedBulkId,
          productName: bulkName,
          movementType: 'adjustment',
          quantityChange: bulkQtyToAdd,
          previousStock: bulkStock,
          newStock: bulkStock + bulkQtyToAdd,
          referenceId: packId,
          referenceType: 'consolidate_pack',
          notes: `Received ${bulkQtyToAdd} ${bulkUnit} from consolidating ${pack.name}`
        }
      });

      // 4. Log to repackaging_logs
      const logId = `rpkg_cons_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await db.repackagingLog.create({
        data: {
          id: logId,
          sourceProductId: packId,
          sourceProductName: pack.name,
          sourceQty: packQtyUsed,
          targetProductId: resolvedBulkId,
          targetProductName: bulkName,
          targetQtyProduced: bulkQtyToAdd,
          factor,
          status: 'completed',
          notes: 'consolidate',
          createdBy: userId
        }
      });

      return {
        success: true,
        message: `Successfully consolidated ${packQtyUsed} ${pack.unitOfMeasure} into ${bulkQtyToAdd} ${bulkUnit}.`
      };
    });
  } catch (error: any) {
    console.error('Error in consolidatePack:', error);
    return {
      success: false,
      message: error.message || 'Internal server error during consolidation operation.'
    };
  }
}

export async function updateProductShelfLocations(updates: {
  productId: string;
  shelfLocationId?: string | null;
  sourceShelfId?: string | null;
  targetShelfId?: string | null;
  quantity?: number;
}[], userId: string = 'system', isInternalFinalization: boolean = false) {
  try {
    if (!isInternalFinalization) {
      const isApprovalRequired = await checkApprovalRequired('SHELF_TRANSFER');
      if (isApprovalRequired) {
        const enrichedUpdates = await Promise.all(updates.map(async u => {
          const p = await db.product.findUnique({ where: { id: u.productId } });

          let sourceName = 'Unassigned';
          if (u.sourceShelfId && u.sourceShelfId !== 'unassigned') {
            const sourceShelf = await db.shelfLocation.findUnique({ where: { id: u.sourceShelfId } });
            sourceName = sourceShelf?.name || u.sourceShelfId;
          }

          let targetName = 'Unassigned';
          if (u.targetShelfId && u.targetShelfId !== 'unassigned') {
            const targetShelf = await db.shelfLocation.findUnique({ where: { id: u.targetShelfId } });
            targetName = targetShelf?.name || u.targetShelfId;
          }

          return {
            ...u,
            productName: p?.name || 'Unknown',
            productSku: p?.sku || '',
            productBarcode: p?.barcode || '',
            sourceShelfName: sourceName,
            targetShelfName: targetName
          };
        }));

        const { queueId, pendingApproval } = await submitToApprovalQueue('SHELF_TRANSFER', {
          updates: enrichedUpdates,
          items: enrichedUpdates.map(u => ({
            productId: u.productId,
            productName: u.productName,
            sku: u.productSku,
            barcode: u.productBarcode,
            quantity: u.quantity,
            sourceShelfName: u.sourceShelfName,
            targetShelfName: u.targetShelfName,
            notes: `Transfer from ${u.sourceShelfName} to ${u.targetShelfName}`
          }))
        }, userId);

        if (pendingApproval) {
          return { success: true, pendingApproval: true, queueId, message: 'Shelf transfer submitted for approval.' };
        }
      }
    }

    await withTransaction(async () => {
      for (const update of updates) {
        // Handle Legacy/Bulk move (entire stock to a new shelf or unassigned)
        if (update.shelfLocationId !== undefined) {
          await db.productShelf.deleteMany({ where: { productId: update.productId } });
          await db.product.update({
            where: { id: update.productId },
            data: { shelfLocationId: update.shelfLocationId || null }
          });

          if (update.shelfLocationId && update.shelfLocationId !== 'unassigned' && update.shelfLocationId !== 'none') {
            const product = await db.product.findUnique({ where: { id: update.productId } });
            if (product) {
              await db.productShelf.create({
                data: {
                  productId: update.productId,
                  shelfId: update.shelfLocationId,
                  quantity: product.stock
                }
              });
            }
          }
          continue;
        }

        // Handle Partial Transfer
        const { productId, sourceShelfId, targetShelfId, quantity = 0 } = update;
        if (quantity <= 0) continue;

        // 1. Decrement from source (if not unassigned)
        if (sourceShelfId && sourceShelfId !== 'unassigned') {
          await db.productShelf.updateMany({
            where: { productId, shelfId: sourceShelfId },
            data: { quantity: { decrement: quantity } }
          });
          await db.productShelf.deleteMany({
            where: { productId, shelfId: sourceShelfId, quantity: { lte: 0 } }
          });
        }

        // 2. Increment target (if not unassigned)
        if (targetShelfId && targetShelfId !== 'unassigned') {
          const existing = await db.productShelf.findUnique({
            where: { productId_shelfId: { productId, shelfId: targetShelfId } }
          });

          if (existing) {
            await db.productShelf.update({
              where: { productId_shelfId: { productId, shelfId: targetShelfId } },
              data: { quantity: { increment: quantity } }
            });
          } else {
            await db.productShelf.create({
              data: { productId, shelfId: targetShelfId, quantity }
            });
          }
        }

        // 3. Update legacy shelf_location_id
        const topShelf = await db.productShelf.findFirst({
          where: { productId },
          orderBy: { quantity: 'desc' }
        });
        await db.product.update({
          where: { id: productId },
          data: { shelfLocationId: topShelf?.shelfId || null }
        });

        // 4. Record stock movement
        const product = await db.product.findUnique({ where: { id: productId } });
        let sourceName = 'Unassigned';
        if (sourceShelfId && sourceShelfId !== 'unassigned') {
          const sourceShelf = await db.shelfLocation.findUnique({ where: { id: sourceShelfId } });
          sourceName = sourceShelf?.name || sourceShelfId;
        }

        let targetName = 'Unassigned';
        if (targetShelfId && targetShelfId !== 'unassigned') {
          const targetShelf = await db.shelfLocation.findUnique({ where: { id: targetShelfId } });
          targetName = targetShelf?.name || targetShelfId;
        }

        const movementId = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await db.stockMovement.create({
          data: {
            id: movementId,
            productId,
            productName: product?.name || 'Unknown',
            movementType: 'transfer',
            quantityChange: 0,
            previousStock: product?.stock.toNumber() || 0,
            newStock: product?.stock.toNumber() || 0,
            referenceId: targetShelfId || sourceShelfId,
            referenceType: 'shelf_transfer',
            notes: `Transferred from ${sourceName} to ${targetName}`
          }
        });
      }
    });

    return { success: true, message: 'Shelf locations updated successfully.' };
  } catch (error: any) {
    console.error('Error updating shelf locations:', error);
    return { success: false, message: 'Error updating shelf locations.' };
  }
}

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

export async function getCategories() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' }
    });
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      markupPercentage: cat.markupPercentage.toNumber()
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function addCategory(name: string, markupPercentage?: number) {
  try {
    const id = `cat_${Date.now()}`;
    await db.category.create({
      data: {
        id,
        name,
        markupPercentage: markupPercentage || 0
      }
    });
    return { success: true, message: 'Category added successfully.' };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, message: 'Error adding category.' };
  }
}

export async function updateCategory(id: string, name: string, markupPercentage?: number) {
  try {
    await db.category.update({
      where: { id },
      data: {
        name,
        markupPercentage: markupPercentage || 0
      }
    });
    return { success: true, message: 'Category updated successfully.' };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, message: 'Error updating category.' };
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.category.delete({ where: { id } });
    return { success: true, message: 'Category deleted successfully.' };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, message: 'Error deleting category.' };
  }
}

export async function getBrands() {
  try {
    const brands = await db.brand.findMany({
      orderBy: { name: 'asc' }
    });
    return brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      markupPercentage: brand.markupPercentage.toNumber()
    }));
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

export async function addBrand(name: string, markupPercentage?: number) {
  try {
    const id = `brand_${Date.now()}`;
    await db.brand.create({
      data: {
        id,
        name,
        markupPercentage: markupPercentage || 0
      }
    });
    return { success: true, message: 'Brand added successfully.' };
  } catch (error) {
    console.error('Error adding brand:', error);
    return { success: false, message: 'Error adding brand.' };
  }
}

export async function updateBrand(id: string, name: string, markupPercentage?: number) {
  try {
    await db.brand.update({
      where: { id },
      data: {
        name,
        markupPercentage: markupPercentage || 0
      }
    });
    return { success: true, message: 'Brand updated successfully.' };
  } catch (error) {
    console.error('Error updating brand:', error);
    return { success: false, message: 'Error updating brand.' };
  }
}

export async function deleteBrand(id: string) {
  try {
    await db.brand.delete({ where: { id } });
    return { success: true, message: 'Brand deleted successfully.' };
  } catch (error) {
    console.error('Error deleting brand:', error);
    return { success: false, message: 'Error deleting brand.' };
  }
}

export async function getSubcategories() {
  try {
    const subcategories = await db.subcategory.findMany({
      orderBy: { name: 'asc' }
    });
    return subcategories.map(sub => ({
      id: sub.id,
      name: sub.name,
      markupPercentage: sub.markupPercentage.toNumber()
    }));
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
}

export async function addSubcategory(name: string, markupPercentage?: number) {
  try {
    const id = `subcat_${Date.now()}`;
    await db.subcategory.create({
      data: {
        id,
        name,
        markupPercentage: markupPercentage || 0
      }
    });
    return { success: true, message: 'Subcategory added successfully.' };
  } catch (error) {
    console.error('Error adding subcategory:', error);
    return { success: false, message: 'Error adding subcategory.' };
  }
}

export async function updateSubcategory(id: string, name: string, markupPercentage?: number) {
  try {
    await db.subcategory.update({
      where: { id },
      data: {
        name,
        markupPercentage: markupPercentage || 0
      }
    });
    return { success: true, message: 'Subcategory updated successfully.' };
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return { success: false, message: 'Error updating subcategory.' };
  }
}

export async function deleteSubcategory(id: string) {
  try {
    await db.subcategory.delete({ where: { id } });
    return { success: true, message: 'Subcategory deleted successfully.' };
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return { success: false, message: 'Error deleting subcategory.' };
  }
}

export async function getUnitsOfMeasure(): Promise<any[]> {
  try {
    const units = await db.unitOfMeasure.findMany({
      orderBy: { name: 'asc' }
    });
    return units.map(u => ({
      id: u.id,
      name: u.name,
      abbreviation: u.abbreviation
    }));
  } catch (error) {
    console.error('Error fetching units of measure:', error);
    return [];
  }
}

export async function addUnitOfMeasure(name: string, abbreviation: string) {
  try {
    const id = `uom_${Date.now()}`;
    await db.unitOfMeasure.create({
      data: {
        id,
        name,
        abbreviation
      }
    });
    return { success: true, message: 'Unit of measure added successfully.' };
  } catch (error) {
    console.error('Error adding unit of measure:', error);
    return { success: false, message: 'Error adding unit of measure.' };
  }
}

export async function updateUnitOfMeasure(id: string, name: string, abbreviation: string) {
  try {
    await db.unitOfMeasure.update({
      where: { id },
      data: {
        name,
        abbreviation
      }
    });
    return { success: true, message: 'Unit of measure updated successfully.' };
  } catch (error) {
    console.error('Error updating unit of measure:', error);
    return { success: false, message: 'Error updating unit of measure.' };
  }
}

export async function deleteUnitOfMeasure(id: string) {
  try {
    await db.unitOfMeasure.delete({ where: { id } });
    return { success: true, message: 'Unit of measure deleted successfully.' };
  } catch (error) {
    console.error('Error deleting unit of measure:', error);
    return { success: false, message: 'Error deleting unit of measure.' };
  }
}

export async function getSuppliers(): Promise<any[]> {
  try {
    const suppliers = await db.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      contactNumber: s.contactNumber,
      telephone: s.telephone,
      mobilePhone: s.mobilePhone,
      email: s.email,
      address: s.address,
      company: s.company,
      tin: s.tin,
      paymentTerms: s.paymentTerms,
      markupPercentage: s.markupPercentage.toNumber(),
      orderSchedule: s.orderSchedule
    }));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}

export async function addSupplier(data: any) {
  try {
    const id = `supplier_${Date.now()}`;
    await db.supplier.create({
      data: {
        id,
        name: data.name,
        contactNumber: data.contactNumber || null,
        telephone: data.telephone || null,
        mobilePhone: data.mobilePhone || null,
        email: data.email || null,
        address: data.address || null,
        company: data.company || null,
        tin: data.tin || null,
        paymentTerms: data.paymentTerms || null,
        orderSchedule: data.orderSchedule || null
      }
    });
    return { success: true, message: 'Supplier added successfully.' };
  } catch (error) {
    console.error('Error adding supplier:', error);
    return { success: false, message: 'Error adding supplier.' };
  }
}

export async function updateSupplier(id: string, data: any) {
  try {
    await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactNumber: data.contactNumber || null,
        telephone: data.telephone || null,
        mobilePhone: data.mobilePhone || null,
        email: data.email || null,
        address: data.address || null,
        company: data.company || null,
        tin: data.tin || null,
        paymentTerms: data.paymentTerms || null,
        orderSchedule: data.orderSchedule || null
      }
    });
    return { success: true, message: 'Supplier updated successfully.' };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, message: 'Error updating supplier.' };
  }
}

export async function getPaymentTerms() {
  try {
    return await db.paymentTerm.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    return [];
  }
}

export async function deleteSupplier(id: string) {
  try {
    await db.supplier.delete({ where: { id } });
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Error deleting supplier.' };
  }
}

export async function getWarehouses(): Promise<any[]> {
  try {
    const warehouses = await db.warehouse.findMany({
      orderBy: { name: 'asc' }
    });
    return warehouses.map(w => ({
      id: w.id,
      name: w.name,
      location: w.location,
      isActive: w.isActive,
      createdAt: w.createdAt
    }));
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return [];
  }
}

export async function addWarehouse(name: string, location?: string) {
  try {
    const id = `wh_${Date.now()}`;
    await db.warehouse.create({
      data: {
        id,
        name,
        location: location || null
      }
    });
    return { success: true, message: 'Warehouse added successfully.' };
  } catch (error) {
    console.error('Error adding warehouse:', error);
    return { success: false, message: 'Error adding warehouse.' };
  }
}

export async function updateWarehouse(id: string, name: string, location?: string) {
  try {
    await db.warehouse.update({
      where: { id },
      data: {
        name,
        location: location || null
      }
    });
    return { success: true, message: 'Warehouse updated successfully.' };
  } catch (error) {
    console.error('Error updating warehouse:', error);
    return { success: false, message: 'Error updating warehouse.' };
  }
}

export async function deleteWarehouse(id: string) {
  try {
    await db.warehouse.delete({ where: { id } });
    return { success: true, message: 'Warehouse deleted successfully.' };
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    return { success: false, message: 'Error deleting warehouse.' };
  }
}

export async function getDepartments(): Promise<Department[]> {
  try {
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' }
    });
    return departments.map(d => ({
      id: d.id,
      name: d.name,
      markupPercentage: d.markupPercentage.toNumber()
    }));
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

export async function addDepartment(name: string) {
  try {
    const id = `dept_${Date.now()}`;
    await db.department.create({
      data: {
        id,
        name
      }
    });
    return { success: true, message: 'Department added successfully.' };
  } catch (error) {
    console.error('Error adding department:', error);
    return { success: false, message: 'Error adding department.' };
  }
}

export async function updateDepartment(id: string, name: string) {
  try {
    await db.department.update({
      where: { id },
      data: { name }
    });
    return { success: true, message: 'Department updated successfully.' };
  } catch (error) {
    console.error('Error updating department:', error);
    return { success: false, message: 'Error updating department.' };
  }
}

export async function deleteDepartment(id: string) {
  try {
    await db.department.delete({ where: { id } });
    return { success: true, message: 'Department deleted successfully.' };
  } catch (error) {
    console.error('Error deleting department:', error);
    return { success: false, message: 'Error deleting department.' };
  }
}

export async function getShelfLocations(): Promise<any[]> {
  try {
    const locations = await db.shelfLocation.findMany({
      orderBy: { name: 'asc' }
    });
    return locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      isActive: loc.isActive,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt
    }));
  } catch (error) {
    console.error('Error fetching shelf locations:', error);
    return [];
  }
}

export async function addShelfLocation(name: string, description?: string) {
  try {
    const id = `shelf_${Date.now()}`;
    await db.shelfLocation.create({
      data: {
        id,
        name,
        description: description || null
      }
    });
    return { success: true, message: 'Shelf location added successfully.' };
  } catch (error) {
    console.error('Error adding shelf location:', error);
    return { success: false, message: 'Error adding shelf location.' };
  }
}

export async function updateShelfLocation(id: string, name: string, description?: string) {
  try {
    await db.shelfLocation.update({
      where: { id },
      data: {
        name,
        description: description || null
      }
    });
    return { success: true, message: 'Shelf location updated successfully.' };
  } catch (error) {
    console.error('Error updating shelf location:', error);
    return { success: false, message: 'Error updating shelf location.' };
  }
}

export async function deleteShelfLocation(id: string) {
  try {
    await db.shelfLocation.delete({ where: { id } });
    return { success: true, message: 'Shelf location deleted successfully.' };
  } catch (error) {
    console.error('Error deleting shelf location:', error);
    return { success: false, message: 'Error deleting shelf location.' };
  }
}

export async function getPriceLevels(): Promise<any[]> {
  try {
    const levels = await db.priceLevel.findMany({
      orderBy: { name: 'asc' }
    });
    return levels;
  } catch (error) {
    console.error('Error fetching price levels:', error);
    return [];
  }
}

export async function addPriceLevel(name: string, description?: string, isDefault?: boolean, calculationBase?: string, percentageAdjustment?: number) {
  try {
    const id = `pl_${Date.now()}`;
    await db.priceLevel.create({
      data: {
        id,
        name,
        description: description || null,
        isDefault: isDefault || false,
        calculationBase: calculationBase || null,
        percentageAdjustment: percentageAdjustment || null
      }
    });
    return { success: true, message: 'Price level added successfully.' };
  } catch (error) {
    console.error('Error adding price level:', error);
    return { success: false, message: 'Error adding price level.' };
  }
}

export async function updatePriceLevel(id: string, name: string, description?: string, isDefault?: boolean) {
  try {
    await db.priceLevel.update({
      where: { id },
      data: {
        name,
        description: description || null,
        isDefault: isDefault || false
      }
    });
    return { success: true, message: 'Price level updated successfully.' };
  } catch (error) {
    console.error('Error updating price level:', error);
    return { success: false, message: 'Error updating price level.' };
  }
}

export async function deletePriceLevel(id: string) {
  try {
    await db.priceLevel.delete({ where: { id } });
    return { success: true, message: 'Price level deleted successfully.' };
  } catch (error) {
    console.error('Error deleting price level:', error);
    return { success: false, message: 'Error deleting price level.' };
  }
}
