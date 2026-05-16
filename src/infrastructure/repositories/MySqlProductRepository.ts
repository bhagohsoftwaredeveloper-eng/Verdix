import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { ProductRepository, GetProductsFilters } from '../../core/products/domain/IProductRepository';
import { ProductEntity } from '../../core/products/domain/Product';
import { Prisma } from '@prisma/client';

export class MySqlProductRepository implements ProductRepository {
  async findAll(limit: number, offset: number, filters: GetProductsFilters): Promise<ProductEntity[]> {
    const whereConditions: Prisma.ProductWhereInput = {};

    if (filters.category) {
      whereConditions.category = filters.category;
    }

    if (filters.department) {
      whereConditions.department = filters.department;
    }

    if (filters.search) {
      whereConditions.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.warehouseId) {
      whereConditions.warehouseId = filters.warehouseId;
    }

    if (filters.availability) {
      whereConditions.availability = filters.availability;
    }

    if (filters.supplierId) {
      whereConditions.OR = [
        { supplierId: filters.supplierId },
        { supplierMappings: { some: { supplierId: filters.supplierId } } },
      ];
    }

    if (filters.shelfId || filters.shelfLocationId) {
      const shelfId = filters.shelfId || filters.shelfLocationId;
      whereConditions.shelves = { some: { shelfId } };
    }

    const products = await db.product.findMany({
      where: whereConditions,
      include: {
        shelves: true,
        conversionFactors: true,
        supplierMappings: true,
        priceLevels: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Fetch default price level for effective price calculation
    const defaultPriceLevel = await db.priceLevel.findFirst({
      where: { isDefault: true },
    });
    const defaultLevelId = defaultPriceLevel?.id || null;

    return products.map((product: any) => ({
      ...product,
      shelfLocationIds: product.shelves.map((s: any) => s.shelfId),
      shelfQuantities: product.shelves.reduce((acc: any, s: any) => {
        acc[s.shelfId] = Number(s.quantity);
        return acc;
      }, {}),
      priceLevels: product.priceLevels.map((pl: any) => ({
        levelId: pl.priceLevelId,
        price: Number(pl.price),
        minQuantity: pl.minQuantity || 0,
      })),
      price: this.calculateEffectivePrice(product, product.priceLevels, defaultLevelId),
      conversionFactor: product.conversionFactor ? Number(product.conversionFactor) : undefined,
    }));
  }

  private calculateEffectivePrice(
    product: any,
    priceLevels: any[],
    defaultLevelId: string | null
  ): number {
    if (!defaultLevelId) return Number(product.price);

    const retailOverrides = priceLevels
      .filter((pl: any) => pl.priceLevelId === defaultLevelId)
      .sort((a: any, b: any) => (a.minQuantity || 0) - (b.minQuantity || 0));

    if (retailOverrides.length > 0) {
      return Number(retailOverrides[0].price);
    }

    return Number(product.price);
  }

  async countAll(filters: GetProductsFilters): Promise<number> {
    const whereConditions: Prisma.ProductWhereInput = {};

    if (filters.category) {
      whereConditions.category = filters.category;
    }

    if (filters.department) {
      whereConditions.department = filters.department;
    }

    if (filters.search) {
      whereConditions.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.warehouseId) {
      whereConditions.warehouseId = filters.warehouseId;
    }

    if (filters.availability) {
      whereConditions.availability = filters.availability;
    }

    if (filters.supplierId) {
      whereConditions.OR = [
        { supplierId: filters.supplierId },
        { supplierMappings: { some: { supplierId: filters.supplierId } } },
      ];
    }

    if (filters.shelfId || filters.shelfLocationId) {
      const shelfId = filters.shelfId || filters.shelfLocationId;
      whereConditions.shelves = { some: { shelfId } };
    }

    return await db.product.count({ where: whereConditions });
  }

  async findById(id: string): Promise<ProductEntity | null> {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        shelves: true,
        conversionFactors: true,
        supplierMappings: true,
        priceLevels: true,
      },
    });

    if (!product) return null;

    // Fetch default price level
    const defaultPriceLevel = await db.priceLevel.findFirst({
      where: { isDefault: true },
    });
    const defaultLevelId = defaultPriceLevel?.id || null;

    return {
      ...product,
      shelfLocationIds: product.shelves.map((s: any) => s.shelfId),
      shelfQuantities: product.shelves.reduce((acc: any, s: any) => {
        acc[s.shelfId] = Number(s.quantity);
        return acc;
      }, {}),
      priceLevels: product.priceLevels.map((pl: any) => ({
        levelId: pl.priceLevelId,
        price: Number(pl.price),
        minQuantity: pl.minQuantity || 0,
      })),
      price: this.calculateEffectivePrice(product, product.priceLevels, defaultLevelId),
      conversionFactor: product.conversionFactor ? Number(product.conversionFactor) : undefined,
    };
  }

  async create(product: Partial<ProductEntity>): Promise<string> {
    return withTransaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: product.name!,
          description: product.description,
          category: product.category,
          brand: product.brand,
          department: product.department,
          stock: Number(product.stock) || 0,
          price: product.price!,
          cost: product.cost ? Number(product.cost) : null,
          sku: product.sku!,
          barcode: product.barcode,
          reorderPoint: 0,
          avgDailySales: 0,
        },
      });

      if (product.priceLevels && product.priceLevels.length > 0) {
        for (const pl of product.priceLevels) {
          await tx.productPriceLevel.create({
            data: {
              productId: newProduct.id,
              priceLevelId: pl.levelId,
              price: Number(pl.price),
              minQuantity: pl.minQuantity || 0,
            },
          });
        }
      }

      if (product.shelfLocationIds && product.shelfLocationIds.length > 0) {
        for (let i = 0; i < product.shelfLocationIds.length; i++) {
          const shelfId = product.shelfLocationIds[i];
          const qty = i === 0 ? (product.stock || 0) : 0;
          await tx.productShelf.create({
            data: {
              productId: newProduct.id,
              shelfId,
              quantity: Number(qty),
            },
          });
        }
      }

      return newProduct.id;
    });
  }

  async update(id: string, product: Partial<ProductEntity>): Promise<void> {
    return withTransaction(async (tx) => {
      const updateData: any = {};

      Object.entries(product).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'priceLevels' && key !== 'shelfLocationIds' && key !== 'shelfQuantities' && value !== undefined) {
          if (key === 'price' || key === 'cost' || key === 'stock' || key === 'reorderPoint' || key === 'avgDailySales' || key === 'conversionFactor') {
            updateData[key] = Number(value);
          } else {
            updateData[key] = value;
          }
        }
      });

      if (Object.keys(updateData).length > 0) {
        await tx.product.update({
          where: { id },
          data: updateData,
        });
      }

      if (product.shelfLocationIds) {
        const currentShelves = await tx.productShelf.findMany({
          where: { productId: id },
        });
        const currentQtyMap = new Map(currentShelves.map((s: any) => [s.shelfId, Number(s.quantity)]));

        await tx.productShelf.deleteMany({ where: { productId: id } });

        for (let i = 0; i < product.shelfLocationIds.length; i++) {
          const shelfId = product.shelfLocationIds[i];
          let qty = currentQtyMap.get(shelfId) || 0;

          if (currentShelves.length === 0 && i === 0) {
            qty = Number(product.stock) || 0;
          }

          await tx.productShelf.create({
            data: {
              productId: id,
              shelfId,
              quantity: qty,
            },
          });
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await db.product.delete({
      where: { id },
    });
  }
}
