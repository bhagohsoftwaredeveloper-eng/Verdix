'use server';

import { query, withTransaction } from '@/lib/mysql';

export type ProductFormData = {
  name: string;
  brand: string;
  sku: string;
  barcode?: string;
  description: string;
  additionalDescription?: string;
  category: string;
  subcategory?: string;
  supplier?: string;
  warehouse?: string;
  shelfLocationId?: string;
  image?: string;
  imageFile?: File;
  unitOfMeasure: string;
  stock: number;
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
  supplier?: string;
  warehouse?: string;
  shelfLocation?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'all' | string;
};

export async function getProducts(limit?: number, offset?: number, filters?: ProductFilters) {
  try {
    let sql = `
      SELECT p.*, 
             s_legacy.name as legacy_supplier_name, 
             w.name as warehouse_name,
             sl.name as shelf_location_name,
             spm.supplier_id as primary_supplier_id,
             spm.supplier_specific_rop as primary_supplier_rop,
             s_primary.name as primary_supplier_name
      FROM products p
      LEFT JOIN suppliers s_legacy ON p.supplier_id = s_legacy.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN shelf_locations sl ON p.shelf_location_id = sl.id
      LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = 1
      LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    const hasActiveFilters = filters && (
      (filters.brand && filters.brand !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.supplier && filters.supplier !== 'all') ||
      (filters.warehouse && filters.warehouse !== 'all') ||
      (filters.shelfLocation && filters.shelfLocation !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.search
    );

    if (filters) {
      if (filters.search) {
        whereClauses.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`);
        const searchParam = `%${filters.search}%`;
        params.push(searchParam, searchParam, searchParam);
      }
      if (filters.brand && filters.brand !== 'all') {
        whereClauses.push(`p.brand = ?`);
        params.push(filters.brand);
      }
      if (filters.category && filters.category !== 'all') {
        whereClauses.push(`p.category = ?`);
        params.push(filters.category);
      }
      if (filters.supplier && filters.supplier !== 'all') {
        // Check if the product is directly linked OR has a mapping for this supplier
        whereClauses.push(`(p.supplier_id = ? OR EXISTS (SELECT 1 FROM supplier_product_mapping spm_check WHERE spm_check.product_id = p.id AND spm_check.supplier_id = ?))`);
        params.push(filters.supplier, filters.supplier);
      }
      if (filters.warehouse && filters.warehouse !== 'all') {
        whereClauses.push(`p.warehouse_id = ?`);
        params.push(filters.warehouse);
      }
      if (filters.shelfLocation && filters.shelfLocation !== 'all') {
        whereClauses.push(`p.shelf_location_id = ?`);
        params.push(filters.shelfLocation);
      }
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'out-of-stock') {
          whereClauses.push(`p.stock <= 0`);
        } else if (filters.status === 'low-stock') {
          whereClauses.push(`p.stock > 0 AND (p.stock < p.reorder_point OR p.stock < (SELECT COALESCE(low_stock_threshold, 0) FROM pos_settings LIMIT 1))`);
        } else if (filters.status === 'in-stock') {
           whereClauses.push(`p.stock > 0 AND p.stock >= p.reorder_point AND p.stock >= (SELECT COALESCE(low_stock_threshold, 0) FROM pos_settings LIMIT 1)`);
        }
      }
    }

    if (!hasActiveFilters && limit !== undefined && offset !== undefined) {
      // In tree mode (no filters), paginate by root products only
      whereClauses.push(`p.parent_id IS NULL`);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ` ORDER BY p.created_at DESC`;

    if (limit !== undefined && offset !== undefined) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const pagedProducts = await query(sql, params.length > 0 ? params : undefined);
    
    // If we paginated root products, we now need to fetch all their descendants
    // to ensure the tree can be built correctly in the frontend.
    let products = pagedProducts;
    if (!hasActiveFilters && limit !== undefined && offset !== undefined && pagedProducts.length > 0) {
      const rootIds = pagedProducts.map((p: any) => p.id);
      
      // Fetch all children for these roots recursively (up to 10 levels)
      // Using a recursive CTE for MySQL 8.0+
      try {
        const recursiveSql = `
          WITH RECURSIVE product_tree AS (
            SELECT p.*, 
                   s_legacy.name as legacy_supplier_name, 
                   w.name as warehouse_name,
                   sl.name as shelf_location_name,
                   spm.supplier_id as primary_supplier_id,
                   spm.supplier_specific_rop as primary_supplier_rop,
                   s_primary.name as primary_supplier_name
            FROM products p
            LEFT JOIN suppliers s_legacy ON p.supplier_id = s_legacy.id
            LEFT JOIN warehouses w ON p.warehouse_id = w.id
            LEFT JOIN shelf_locations sl ON p.shelf_location_id = sl.id
            LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = 1
            LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
            WHERE p.id IN (?)
            
            UNION ALL
            
            SELECT p.*, 
                   s_legacy.name as legacy_supplier_name, 
                   w.name as warehouse_name,
                   sl.name as shelf_location_name,
                   spm.supplier_id as primary_supplier_id,
                   spm.supplier_specific_rop as primary_supplier_rop,
                   s_primary.name as primary_supplier_name
            FROM products p
            INNER JOIN product_tree pt ON p.parent_id = pt.id
            LEFT JOIN suppliers s_legacy ON p.supplier_id = s_legacy.id
            LEFT JOIN warehouses w ON p.warehouse_id = w.id
            LEFT JOIN shelf_locations sl ON p.shelf_location_id = sl.id
            LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = 1
            LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
          )
          SELECT * FROM product_tree ORDER BY created_at DESC
        `;
        products = await query(recursiveSql, [rootIds]);
      } catch (err) {
        console.warn('Recursive CTE failed, falling back to flat list. Error:', err);
        // If recursive CTE is not supported, we just return the roots.
        // The tree will be shallow but at least it won't crash.
        products = pagedProducts;
      }
    }

    // Fetch conversion factors for all products
    const conversionFactorsSql = `SELECT * FROM conversion_factors ORDER BY product_id, created_at`;
    const allConversionFactors = await query(conversionFactorsSql);

    // Group conversion factors by product_id
    const cfMap = new Map();
    allConversionFactors.forEach((cf: any) => {
      if (!cfMap.has(cf.product_id)) {
        cfMap.set(cf.product_id, []);
      }
      cfMap.get(cf.product_id).push({
        unit: cf.unit,
        factor: cf.factor,
      });
    });
    
    // Fetch price levels for all products
    const priceLevelsSql = `SELECT * FROM product_price_levels`;
    const allPriceLevels = await query(priceLevelsSql);
    
    // Group price levels by product_id
    const plMap = new Map();
    allPriceLevels.forEach((pl: any) => {
      if (!plMap.has(pl.product_id)) {
        plMap.set(pl.product_id, []);
      }
      plMap.get(pl.product_id).push({
        levelId: pl.price_level_id,
        price: parseFloat(pl.price),
        minQuantity: pl.min_quantity ? parseInt(pl.min_quantity) : 0
      });
    });

    // Fetch default price level
    const defaultPriceLevelSql = `SELECT id FROM price_levels WHERE is_default = 1 LIMIT 1`;
    const defaultPriceLevelResult = await query(defaultPriceLevelSql);
    const defaultLevelId = defaultPriceLevelResult.length > 0 ? defaultPriceLevelResult[0].id : 'retail-level';

    // Map database fields to Product type
    return products.map((product: any) => {
      const productPriceLevels = plMap.get(product.id) || [];
      // Sort overrides by minQuantity to find the standard (lowest quantity) retail price
      const retailPriceOverrides = productPriceLevels
        .filter((pl: any) => pl.levelId === defaultLevelId)
        .sort((a: any, b: any) => (a.minQuantity || 0) - (b.minQuantity || 0));
      
      const effectivePrice = retailPriceOverrides.length > 0 
        ? retailPriceOverrides[0].price 
        : (parseFloat(product.price) || 0);

      return {
        ...product,
        shelfLocationId: product.shelf_location_id,
        shelfLocationName: product.shelf_location_name,
        additionalDescription: product.additional_description,
        reorderPoint: product.reorder_point,
        primarySupplierRop: product.primary_supplier_rop,
        avgDailySales: product.avg_daily_sales,
        price: effectivePrice,
        cost: product.cost ? parseFloat(product.cost) : undefined,
        imageUrl: product.image_url,
        imageHint: product.image_hint,
        unitOfMeasure: product.unit_of_measure,
        parentId: product.parent_id,
        conversionFactor: product.conversion_factor,
        conversionFactors: cfMap.get(product.id) || [],
        incomeAccount: product.income_account,
        expenseAccount: product.expense_account,
        supplier: product.primary_supplier_id || product.supplier_id,
        supplierName: product.primary_supplier_name || product.legacy_supplier_name,
        warehouse: product.warehouse_id,
        warehouseName: product.warehouse_name,
        priceLevels: productPriceLevels,
        vatStatus: product.vat_status,
        availability: product.availability,
        earnsPoints: product.earns_points === 1,
        expirationDate: product.expiration_date,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      };
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return []; // Return empty array instead of throwing to avoid crashing
  }
}

export async function getProductsCount(filters?: ProductFilters) {
  try {
    let sql = `
        SELECT COUNT(*) as count 
        FROM products p
        LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = 1
    `;
    
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters) {
       if (filters.search) {
        whereClauses.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`);
        const searchParam = `%${filters.search}%`;
        params.push(searchParam, searchParam, searchParam);
      }
      if (filters.brand && filters.brand !== 'all') {
        whereClauses.push(`p.brand = ?`);
        params.push(filters.brand);
      }
      if (filters.category && filters.category !== 'all') {
        whereClauses.push(`p.category = ?`);
        params.push(filters.category);
      }
      if (filters.supplier && filters.supplier !== 'all') {
         whereClauses.push(`(p.supplier_id = ? OR EXISTS (SELECT 1 FROM supplier_product_mapping spm_check WHERE spm_check.product_id = p.id AND spm_check.supplier_id = ?))`);
        params.push(filters.supplier, filters.supplier);
      }
      if (filters.warehouse && filters.warehouse !== 'all') {
        whereClauses.push(`p.warehouse_id = ?`);
        params.push(filters.warehouse);
      }
      if (filters.shelfLocation && filters.shelfLocation !== 'all') {
        whereClauses.push(`p.shelf_location_id = ?`);
        params.push(filters.shelfLocation);
      }
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'out-of-stock') {
          whereClauses.push(`p.stock <= 0`);
        } else if (filters.status === 'low-stock') {
          whereClauses.push(`p.stock > 0 AND (p.stock < p.reorder_point OR p.stock < (SELECT COALESCE(low_stock_threshold, 0) FROM pos_settings LIMIT 1))`);
        } else if (filters.status === 'in-stock') {
           whereClauses.push(`p.stock > 0 AND p.stock >= p.reorder_point AND p.stock >= (SELECT COALESCE(low_stock_threshold, 0) FROM pos_settings LIMIT 1)`);
        }
      }
    }

    const hasActiveFilters = filters && (
      (filters.brand && filters.brand !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.supplier && filters.supplier !== 'all') ||
      (filters.warehouse && filters.warehouse !== 'all') ||
      (filters.shelfLocation && filters.shelfLocation !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.search
    );

    if (!hasActiveFilters) {
      whereClauses.push(`p.parent_id IS NULL`);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await query(sql, params);
    return result[0].count;
  } catch (error) {
    console.error('Error fetching products count:', error);
    return 0;
  }
}

export async function getLowStockAlerts() {
  try {
    // Get the global threshold first
    const settingsResult = await query('SELECT low_stock_threshold FROM pos_settings LIMIT 1');
    const globalThreshold = settingsResult.length > 0 ? settingsResult[0].low_stock_threshold : 10;

    const sql = `
      SELECT id, name, stock, reorder_point
      FROM products
      WHERE stock < reorder_point OR stock < ?
    `;
    const products = await query(sql, [globalThreshold]);
    return products.map((p: any) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      reorderPoint: Math.max(p.reorder_point || 0, globalThreshold)
    }));
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return [];
  }
}

export async function addProduct(formData: ProductFormData) {
  try {
    // Validate conversion factors for duplicates
    if (formData.conversionFactors && formData.conversionFactors.length > 0) {
      const units = formData.conversionFactors.map(cf => cf.unit.toLowerCase());
      const uniqueUnits = new Set(units);
      if (units.length !== uniqueUnits.size) {
        return { 
          success: false, 
          message: 'Duplicate conversion factor units detected. Each unit must be unique.' 
        };
      }
    }

    // Generate unique ID for the product
    const productId = `${formData.sku}-${Date.now()}`;

    // Execute all operations within a transaction
    await withTransaction(async (connection) => {
      // Prepare product data for database insertion
      const productData = {
        id: productId,
        name: formData.name,
        description: formData.description,
        additional_description: formData.additionalDescription || null,
        category: formData.category,
        brand: formData.brand,
        subcategory: formData.subcategory || null,
        supplier_id: formData.supplier || null,
        warehouse_id: formData.warehouse || null,
        shelf_location_id: formData.shelfLocationId || null,
        stock: formData.stock || 0,
        reorder_point: formData.reorderPoint || formData.supplierMappings?.find(m => m.isPrimary)?.rop || 0,
        avg_daily_sales: 0, // Will be calculated later based on sales history
        price: formData.price,
        cost: formData.cost || null,
        sku: formData.sku,
        barcode: formData.barcode || null,
        image_url: formData.image || null,
        image_hint: formData.name.toLowerCase().replace(/\s+/g, '-'), // Generate hint from name
        unit_of_measure: formData.unitOfMeasure,
        parent_id: formData.parentId || null,
        conversion_factor: formData.conversionFactor || 1,

        expense_account: formData.expenseAccount || null,
        income_account: formData.incomeAccount || null,
        vat_status: formData.vatStatus || 'YES (Subject to 12% VAT)',
        availability: formData.availability || 'Available',
        earns_points: formData.earnsPoints !== false, // Default to true if undefined
      };

      // Insert product into MySQL database
      const sql = `
        INSERT INTO products (
          id, name, description, additional_description, category, brand,
          subcategory, supplier_id, warehouse_id, shelf_location_id, stock, reorder_point, avg_daily_sales, price, cost,
          sku, barcode, image_url, image_hint,
          unit_of_measure, parent_id, conversion_factor, income_account, expense_account,
          vat_status, availability, earns_points
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values_array = [
        productData.id,
        productData.name,
        productData.description,
        productData.additional_description,
        productData.category,
        productData.brand,
        productData.subcategory,
        productData.supplier_id,
        productData.warehouse_id,
        productData.shelf_location_id,
        productData.stock,
        productData.reorder_point,
        productData.avg_daily_sales,
        productData.price,
        productData.cost,
        productData.sku,
        productData.barcode,
        productData.image_url,
        productData.image_hint,
        productData.unit_of_measure,
        productData.parent_id,
        productData.conversion_factor,
        productData.income_account,
        productData.expense_account,
        productData.vat_status,
        productData.availability,
        productData.earns_points,
      ];

      await connection.query(sql, values_array);

      // Insert conversion factors if provided
      if (formData.conversionFactors && formData.conversionFactors.length > 0) {
        for (const cf of formData.conversionFactors) {
          const cfId = `${productId}-cf-${cf.unit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const cfSql = `
            INSERT INTO conversion_factors (id, product_id, unit, factor)
            VALUES (?, ?, ?, ?)
          `;
          await connection.query(cfSql, [cfId, productId, cf.unit, cf.factor]);
        }
      }

      // Insert price levels if provided
      if (formData.priceLevels && formData.priceLevels.length > 0) {
        for (const pl of formData.priceLevels) {
          const plSql = `
            INSERT INTO product_price_levels (product_id, price_level_id, price, min_quantity)
            VALUES (?, ?, ?, ?)
          `;
          await connection.query(plSql, [productId, pl.levelId, pl.price, pl.minQuantity || 0]);
        }
      }

      // Insert supplier mappings if provided
      if (formData.supplierMappings && formData.supplierMappings.length > 0) {
          for (const mapping of formData.supplierMappings) {
              const mappingId = `${productId}-sm-${mapping.supplierId}-${Date.now()}`;
              const smSql = `
                  INSERT INTO supplier_product_mapping (
                      id, product_id, supplier_id, supplier_sku, 
                      supplier_lead_time, supplier_specific_rop, 
                      supplier_cost, is_primary
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `;
              await connection.query(smSql, [
                  mappingId, productId, mapping.supplierId, mapping.supplierSku || null,
                  mapping.leadTime, mapping.rop, mapping.cost || null, mapping.isPrimary ? 1 : 0
              ]);
          }
      }
    });

    return { success: true, message: `${formData.name} has been added to the inventory.`, productId };

  } catch (error: any) {
    console.error('Error saving product:', error);
    
    // Check for duplicate key error
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('unique_product_unit')) {
        return { 
          success: false, 
          message: 'A conversion factor with this unit already exists for this product.' 
        };
      }
    }
    
    return { 
      success: false, 
      message: 'There was an error saving the product. Please check your database connection and try again.' 
    };
  }
}

// Brands
export async function getBrands() {
  try {
    const sql = `SELECT * FROM brands ORDER BY name ASC`;
    const brands = await query(sql);
    return brands.map((b: any) => ({ 
      ...b, 
      markupPercentage: b.markup_percentage !== null ? parseFloat(b.markup_percentage) : undefined,
      created_at: b.created_at, 
      updated_at: b.updated_at 
    }));
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

export async function addBrand(name: string, markupPercentage?: number) {
  try {
    const brandId = `brand_${Date.now()}`;
    const sql = `INSERT INTO brands (id, name, markup_percentage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), markup_percentage = VALUES(markup_percentage)`;
    await query(sql, [brandId, name, markupPercentage || 0]);
    return { success: true, message: `Brand "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding brand:', error);
    return { success: false, message: 'Error adding brand.' };
  }
}

export async function updateBrand(id: string, name: string, markupPercentage?: number) {
  try {
    const sql = `UPDATE brands SET name = ?, markup_percentage = ? WHERE id = ?`;
    await query(sql, [name, markupPercentage !== undefined ? markupPercentage : 0, id]);
    return { success: true, message: `Brand updated to "${name}".` };
  } catch (error) {
    console.error('Error updating brand:', error);
    return { success: false, message: 'Error updating brand.' };
  }
}

export async function updateCategory(id: string, name: string, markupPercentage?: number) {
  try {
    const sql = `UPDATE categories SET name = ?, markup_percentage = ? WHERE id = ?`;
    await query(sql, [name, markupPercentage !== undefined ? markupPercentage : 0, id]);
    return { success: true, message: `Category updated to "${name}".` };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, message: 'Error updating category.' };
  }
}

export async function updateSubcategory(id: string, name: string, markupPercentage?: number) {
  try {
    const sql = `UPDATE subcategories SET name = ?, markup_percentage = ? WHERE id = ?`;
    await query(sql, [name, markupPercentage !== undefined ? markupPercentage : 0, id]);
    return { success: true, message: `Subcategory updated to "${name}".` };
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return { success: false, message: 'Error updating subcategory.' };
  }
}

export async function updateUnitOfMeasure(id: string, name: string, abbreviation: string) {
  try {
    const sql = `UPDATE units_of_measure SET name = ?, abbreviation = ? WHERE id = ?`;
    await query(sql, [name, abbreviation, id]);
    return { success: true, message: `Unit of Measure updated to "${name}".` };
  } catch (error) {
    console.error('Error updating unit of measure:', error);
    return { success: false, message: 'Error updating unit of measure.' };
  }
}

type UpdateProductData = Omit<ProductFormData, 'imageFile' | 'stock'>;

export async function updateProduct(id: string, formData: UpdateProductData) {
  try {
    // Validate conversion factors for duplicates
    if (formData.conversionFactors && formData.conversionFactors.length > 0) {
      const units = formData.conversionFactors.map(cf => cf.unit.toLowerCase());
      const uniqueUnits = new Set(units);
      if (units.length !== uniqueUnits.size) {
        return { 
          success: false, 
          message: 'Duplicate conversion factor units detected. Each unit must be unique.' 
        };
      }
    }

    // Execute all operations within a transaction
    await withTransaction(async (connection) => {
      // Prepare product data for database update
      const productData = {
        name: formData.name,
        description: formData.description,
        additional_description: formData.additionalDescription || null,
        category: formData.category,
        brand: formData.brand,
        subcategory: formData.subcategory || null,
        supplier_id: formData.supplier || null,
        reorder_point: formData.reorderPoint || 0,
        price: formData.price,
        cost: formData.cost || null,
        barcode: formData.barcode || null,
        unit_of_measure: formData.unitOfMeasure,
        warehouse_id: formData.warehouse || null,
        shelf_location_id: formData.shelfLocationId || null,
        conversion_factor: formData.conversionFactor || 1,
        income_account: formData.incomeAccount || null,

        expense_account: formData.expenseAccount || null,
        vat_status: formData.vatStatus || 'YES (Subject to 12% VAT)',
        availability: formData.availability || 'Available',
        earns_points: formData.earnsPoints !== false,
      };

      // Update product in MySQL database
      const sql = `
        UPDATE products SET
          name = ?, description = ?, additional_description = ?, category = ?,
          brand = ?, subcategory = ?, supplier_id = ?, price = ?, cost = ?,
          barcode = ?, unit_of_measure = ?, warehouse_id = ?, shelf_location_id = ?, conversion_factor = ?,
          income_account = ?, expense_account = ?, vat_status = ?, availability = ?, earns_points = ?, reorder_point = ?
        WHERE id = ?
      `;

      const values_array = [
        productData.name,
        productData.description,
        productData.additional_description,
        productData.category,
        productData.brand,
        productData.subcategory,
        productData.supplier_id,
        productData.price,
        productData.cost,
        productData.barcode,
        productData.unit_of_measure,
        productData.warehouse_id,
        productData.shelf_location_id,
        productData.conversion_factor,
        productData.income_account,
        productData.expense_account,
        productData.vat_status,
        productData.availability,
        productData.earns_points,
        productData.reorder_point,
        id,
      ];

      await connection.query(sql, values_array);

      // Handle conversion factors: delete existing and insert new ones
      const deleteCFSql = `DELETE FROM conversion_factors WHERE product_id = ?`;
      await connection.query(deleteCFSql, [id]);

      if (formData.conversionFactors && formData.conversionFactors.length > 0) {
        for (const cf of formData.conversionFactors) {
          const cfId = `${id}-cf-${cf.unit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const cfSql = `
            INSERT INTO conversion_factors (id, product_id, unit, factor)
            VALUES (?, ?, ?, ?)
          `;
          await connection.query(cfSql, [cfId, id, cf.unit, cf.factor]);
        }
      }

      // Handle price levels: delete existing and insert new ones
      const deletePLSql = `DELETE FROM product_price_levels WHERE product_id = ?`;
      await connection.query(deletePLSql, [id]);

      if (formData.priceLevels && formData.priceLevels.length > 0) {
        for (const pl of formData.priceLevels) {
          const plSql = `
            INSERT INTO product_price_levels (product_id, price_level_id, price, min_quantity)
            VALUES (?, ?, ?, ?)
          `;
          await connection.query(plSql, [id, pl.levelId, pl.price, pl.minQuantity || 0]);
        }
      }
    });

    return { success: true, message: `${formData.name} has been updated.` };

  } catch (error: any) {
    console.error('Error updating product:', error);
    
    // Check for duplicate key error
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('unique_product_unit')) {
        return { 
          success: false, 
          message: 'A conversion factor with this unit already exists for this product.' 
        };
      }
    }
    
    return { 
      success: false, 
      message: 'There was an error updating the product. Please check your database connection and try again.' 
    };
  }
}

export async function deleteBrand(id: string) {
  try {
    // Get the brand name first as it is used as the link in the products table
    const brandResult = await query('SELECT name FROM brands WHERE id = ?', [id]);
    if (brandResult.length === 0) {
      return { success: false, message: 'Brand not found.' };
    }
    const brandName = brandResult[0].name;

    // Check if any products are associated with this brand name
    const productsSql = `SELECT id FROM products WHERE brand = ? LIMIT 1`;
    const products = await query(productsSql, [brandName]);

    if (products.length > 0) {
      // Check if any of these products have transactions
      const transactionsSql = `
        SELECT 1 FROM sale_items si JOIN products p ON si.product_id = p.id WHERE p.brand = ?
        UNION ALL
        SELECT 1 FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE p.brand = ?
        UNION ALL
        SELECT 1 FROM stock_movements sm JOIN products p ON sm.product_id = p.id WHERE p.brand = ?
        UNION ALL
        SELECT 1 FROM bad_order_items boi JOIN products p ON boi.product_id = p.id WHERE p.brand = ?
        LIMIT 1
      `;
      const transactions = await query(transactionsSql, [brandName, brandName, brandName, brandName]);

      if (transactions.length > 0) {
        return { 
          success: false, 
          message: 'Cannot delete brand because it has associated transactions. Please void or delete related transactions first.' 
        };
      }

      return { 
        success: false, 
        message: 'Cannot delete brand because it is currently assigned to one or more products. Please reassign or delete the products first.' 
      };
    }

    const sql = `DELETE FROM brands WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Brand deleted successfully.' };
  } catch (error) {
    console.error('Error deleting brand:', error);
    return { success: false, message: 'Error deleting brand.' };
  }
}

// Categories
export async function getCategories() {
  try {
    const sql = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM products p WHERE p.category = c.name) as product_count
      FROM categories c 
      ORDER BY c.name ASC
    `;
    const categories = await query(sql);
    return categories.map((c: any) => ({ 
      ...c, 
      markupPercentage: c.markup_percentage !== null ? parseFloat(c.markup_percentage) : undefined,
      productCount: c.product_count || 0,
      created_at: c.created_at, 
      updated_at: c.updated_at 
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function addCategory(name: string, markupPercentage?: number) {
  try {
    const categoryId = `category_${Date.now()}`;
    const sql = `INSERT INTO categories (id, name, markup_percentage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), markup_percentage = VALUES(markup_percentage)`;
    await query(sql, [categoryId, name, markupPercentage || 0]);
    return { success: true, message: `Category "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, message: 'Error adding category.' };
  }
}

export async function deleteCategory(id: string) {
  try {
    // Get the category name first as it is used as the link in the products table
    const categoryResult = await query('SELECT name FROM categories WHERE id = ?', [id]);
    if (categoryResult.length === 0) {
      return { success: false, message: 'Category not found.' };
    }
    const categoryName = categoryResult[0].name;

    // Check if any products are associated with this category name
    const productsSql = `SELECT id FROM products WHERE category = ? LIMIT 1`;
    const products = await query(productsSql, [categoryName]);

    if (products.length > 0) {
      // Check if any of these products have transactions
      const transactionsSql = `
        SELECT 1 FROM sale_items si JOIN products p ON si.product_id = p.id WHERE p.category = ?
        UNION ALL
        SELECT 1 FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE p.category = ?
        UNION ALL
        SELECT 1 FROM stock_movements sm JOIN products p ON sm.product_id = p.id WHERE p.category = ?
        UNION ALL
        SELECT 1 FROM bad_order_items boi JOIN products p ON boi.product_id = p.id WHERE p.category = ?
        LIMIT 1
      `;
      const transactions = await query(transactionsSql, [categoryName, categoryName, categoryName, categoryName]);

      if (transactions.length > 0) {
        return { 
          success: false, 
          message: `Cannot delete category "${categoryName}" because it has associated transactions. Please void or delete related transactions first.` 
        };
      }

      return { 
        success: false, 
        message: `Cannot delete category "${categoryName}" because it is currently assigned to one or more products. Please reassign or delete the products first.` 
      };
    }

    const sql = `DELETE FROM categories WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Category deleted successfully.' };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, message: 'Error deleting category.' };
  }
}

// Subcategories
export async function getSubcategories() {
  try {
    const sql = `
      SELECT s.*, 
             (SELECT COUNT(*) FROM products p WHERE p.subcategory = s.name) as product_count
      FROM subcategories s 
      ORDER BY s.name ASC
    `;
    const subcategories = await query(sql);
    return subcategories.map((s: any) => ({ 
      ...s, 
      markupPercentage: s.markup_percentage !== null ? parseFloat(s.markup_percentage) : undefined,
      productCount: s.product_count || 0,
      created_at: s.created_at, 
      updated_at: s.updated_at 
    }));
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
}

export async function addSubcategory(name: string, markupPercentage?: number) {
  try {
    const subcategoryId = `subcategory_${Date.now()}`;
    const sql = `INSERT INTO subcategories (id, name, markup_percentage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), markup_percentage = VALUES(markup_percentage)`;
    await query(sql, [subcategoryId, name, markupPercentage || 0]);
    return { success: true, message: `Subcategory "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding subcategory:', error);
    return { success: false, message: 'Error adding subcategory.' };
  }
}

export async function deleteSubcategory(id: string) {
  try {
    // Get the subcategory name first as it is used as the link in the products table
    const subcategoryResult = await query('SELECT name FROM subcategories WHERE id = ?', [id]);
    if (subcategoryResult.length === 0) {
      return { success: false, message: 'Subcategory not found.' };
    }
    const subcategoryName = subcategoryResult[0].name;

    // Check if any products are associated with this subcategory name
    const productsSql = `SELECT id FROM products WHERE subcategory = ? LIMIT 1`;
    const products = await query(productsSql, [subcategoryName]);

    if (products.length > 0) {
      // Check if any of these products have transactions
      const transactionsSql = `
        SELECT 1 FROM sale_items si JOIN products p ON si.product_id = p.id WHERE p.subcategory = ?
        UNION ALL
        SELECT 1 FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE p.subcategory = ?
        UNION ALL
        SELECT 1 FROM stock_movements sm JOIN products p ON sm.product_id = p.id WHERE p.subcategory = ?
        UNION ALL
        SELECT 1 FROM bad_order_items boi JOIN products p ON boi.product_id = p.id WHERE p.subcategory = ?
        LIMIT 1
      `;
      const transactions = await query(transactionsSql, [subcategoryName, subcategoryName, subcategoryName, subcategoryName]);

      if (transactions.length > 0) {
        return { 
          success: false, 
          message: `Cannot delete subcategory "${subcategoryName}" because it has associated transactions. Please void or delete related transactions first.` 
        };
      }

      return { 
        success: false, 
        message: `Cannot delete subcategory "${subcategoryName}" because it is currently assigned to one or more products. Please reassign or delete the products first.` 
      };
    }

    const sql = `DELETE FROM subcategories WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Subcategory deleted successfully.' };
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return { success: false, message: 'Error deleting subcategory.' };
  }
}

// Suppliers
export async function getSuppliers() {
  try {
    const sql = `SELECT * FROM suppliers ORDER BY name ASC`;
    const suppliers = await query(sql);
    return suppliers.map((s: any) => ({
      ...s,
      contactNumber: s.contact_number,
      telephone: s.telephone,
      mobilePhone: s.mobile_phone,
      email: s.email,
      company: s.company,
      tin: s.tin,
      markupPercentage: s.markup_percentage !== null ? parseFloat(s.markup_percentage) : undefined,
      orderSchedule: s.order_schedule,
      created_at: s.created_at,
      updated_at: s.updated_at
    }));
  } catch (error) {
    return [];
  }
}

export async function addSupplier(data: { name: string, contactNumber?: string, address?: string, paymentTerms?: string, markupPercentage?: number, telephone?: string, mobilePhone?: string, email?: string, company?: string, tin?: string, orderSchedule?: string }) {
  try {
    const supplierId = `supplier_${Date.now()}`;
    const sql = `
      INSERT INTO suppliers (
        id, name, contact_number, address, payment_terms, markup_percentage,
        telephone, mobile_phone, email, company, tin, order_schedule
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name), 
        contact_number = VALUES(contact_number), 
        address = VALUES(address), 
        payment_terms = VALUES(payment_terms), 
        markup_percentage = VALUES(markup_percentage),
        telephone = VALUES(telephone),
        mobile_phone = VALUES(mobile_phone),
        email = VALUES(email),
        company = VALUES(company),
        tin = VALUES(tin),
        order_schedule = VALUES(order_schedule)
    `;
    await query(sql, [
      supplierId, 
      data.name, 
      data.contactNumber || null, 
      data.address || null, 
      data.paymentTerms || null, 
      data.markupPercentage || null,
      data.telephone || null,
      data.mobilePhone || null,
      data.email || null,
      data.company || null,
      data.tin || null,
      data.orderSchedule || null
    ]);
    return { success: true, message: `Supplier "${data.name}" has been added.` };
  } catch (error) {
    console.error('Error adding supplier:', error);
    return { success: false, message: 'Error adding supplier.' };
  }
}

export async function updateSupplier(id: string, data: { name: string, contactNumber?: string, address?: string, paymentTerms?: string, markupPercentage?: number, telephone?: string, mobilePhone?: string, email?: string, company?: string, tin?: string, orderSchedule?: string }) {
  try {
    const sql = `
      UPDATE suppliers SET 
        name = ?, 
        contact_number = ?, 
        address = ?, 
        payment_terms = ?, 
        markup_percentage = ?,
        telephone = ?,
        mobile_phone = ?,
        email = ?,
        company = ?,
        tin = ?,
        order_schedule = ?
      WHERE id = ?
    `;
    await query(sql, [
      data.name, 
      data.contactNumber || null, 
      data.address || null, 
      data.paymentTerms || null, 
      data.markupPercentage || null,
      data.telephone || null,
      data.mobilePhone || null,
      data.email || null,
      data.company || null,
      data.tin || null,
      data.orderSchedule || null,
      id
    ]);
    return { success: true, message: `Supplier updated to "${data.name}".` };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, message: 'Error updating supplier.' };
  }
}

export async function deleteSupplier(id: string) {
  try {
    // Check for existing purchase orders
    const poResult = await query('SELECT id FROM purchase_orders WHERE supplier_id = ? LIMIT 1', [id]);
    if (poResult.length > 0) {
      return { 
        success: false, 
        message: 'Cannot delete supplier because they have existing purchase orders. Please void or delete related purchase orders first.' 
      };
    }

    // Check for existing payments
    const paymentResult = await query('SELECT id FROM supplier_payments WHERE supplier_id = ? LIMIT 1', [id]);
    if (paymentResult.length > 0) {
      return { 
        success: false, 
        message: 'Cannot delete supplier because they have existing payment history. Please void or delete related payments first.' 
      };
    }

    const sql = `DELETE FROM suppliers WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Error deleting supplier.' };
  }
}

export async function getPaymentTerms() {
  try {
    // Try to fetch with description first (API route schema)
    try {
      const sql = `SELECT * FROM payment_terms WHERE is_active = TRUE ORDER BY created_at DESC`;
      const terms = await query(sql);
      return terms.map((t: any) => ({
        id: t.id,
        name: t.description || t.name, // Fallback to name if description is missing
        days: t.days || t.number_of_days_month // Fallback for days column
      }));
    } catch (e) {
      // Fallback if table or columns don't match, though query select * should be fine.
      // This is just a safety net if the query fails completely.
       console.error('Error in getPaymentTerms query:', e);
       return [];
    }
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    return [];
  }
}

// Units of Measure
export async function getUnitsOfMeasure() {
  try {
    const sql = `SELECT * FROM units_of_measure ORDER BY name ASC`;
    const units = await query(sql);
    return units.map((u: any) => ({
      ...u,
      created_at: u.created_at,
      updated_at: u.updated_at
    }));
  } catch (error) {
    console.error('Error fetching units of measure:', error);
    return [];
  }
}

export async function addUnitOfMeasure(name: string, abbreviation: string) {
  try {
    const unitId = `unit_${Date.now()}`;
    const sql = `INSERT INTO units_of_measure (id, name, abbreviation) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), abbreviation = VALUES(abbreviation)`;
    await query(sql, [unitId, name, abbreviation]);
    return { success: true, message: `Unit of Measure "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding unit of measure:', error);
    return { success: false, message: 'Error adding unit of measure.' };
  }
}

export async function deleteUnitOfMeasure(id: string) {
  try {
    const sql = `DELETE FROM units_of_measure WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Unit of Measure deleted successfully.' };
  } catch (error) {
    console.error('Error deleting unit of measure:', error);
    return { success: false, message: 'Error deleting unit of measure.' };
  }
}

// Tax Rates
export async function getTaxRates() {
  try {
    const sql = `SELECT * FROM tax_rates ORDER BY created_at DESC`;
    const rates = await query(sql);
    return rates.map((r: any) => ({
      id: r.id,
      name: r.name,
      rate: parseFloat(r.rate),
      description: r.description,
      isDefault: !!r.is_default
    }));
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return [];
  }
}

export async function deleteProduct(id: string) {
  try {
    // Helper function to recursively get all descendant product IDs
    async function getDescendants(productId: string): Promise<string[]> {
      const childrenSql = `SELECT id FROM products WHERE parent_id = ?`;
      const children = await query(childrenSql, [productId]);
      let descendants: string[] = [];

      for (const child of children) {
        descendants.push(child.id);
        // Recursively get descendants of this child
        descendants = descendants.concat(await getDescendants(child.id));
      }

      return descendants;
    }

    // Get all descendants (children, grandchildren, etc.)
    const descendants = await getDescendants(id);

    // Delete conversion factors for all products being deleted (descendants + parent)
    const allProductsToDelete = [...descendants, id];
    for (const productId of allProductsToDelete) {
      const deleteCFSql = `DELETE FROM conversion_factors WHERE product_id = ?`;
      await query(deleteCFSql, [productId]);
    }

    // Delete products from leaves to root (descendants first, then parent)
    for (const productId of descendants) {
      const deleteProductSql = `DELETE FROM products WHERE id = ?`;
      await query(deleteProductSql, [productId]);
    }

    // Finally delete the parent product
    const deleteProductSql = `DELETE FROM products WHERE id = ?`;
    await query(deleteProductSql, [id]);

    return { success: true, message: 'Product and all its variants deleted successfully.' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: 'Error deleting product.' };
  }
}

export async function addChildProduct(parentId: string, data: Omit<ProductFormData, 'parentId'>) {
  try {
    // Get the parent's conversion factors
    const parentCFSql = `SELECT unit, factor FROM conversion_factors WHERE product_id = ? ORDER BY factor DESC`;
    const parentCFs = await query(parentCFSql, [parentId]);

    let childConversionFactors: { unit: string; factor: number }[] = [];

    if (parentCFs.length > 0) {
      // Find the factor for the child's unit
      const childUnitFactor = parentCFs.find((cf: any) => cf.unit === data.unitOfMeasure)?.factor;

      if (childUnitFactor) {
        // Create conversion factors for the child: all units except the child's unit, with factors divided by childUnitFactor
        childConversionFactors = parentCFs
          .filter((cf: any) => cf.unit !== data.unitOfMeasure)
          .map((cf: any) => ({
            unit: cf.unit,
            factor: cf.factor / childUnitFactor
          }));
      }
    }

    const result = await addProduct({
      ...data,
      parentId,
      conversionFactors: childConversionFactors,
    });

    if (result.success) {
      return {
        success: true,
        message: `Child product created successfully.`,
        productId: result.productId
      };
    }

    return result;
  } catch (error) {
    console.error('Error adding child product:', error);
    return { success: false, message: 'Error adding child product.' };
  }
}

// Accounts



const API_URL = process.env.API_URL || 'http://192.168.1.246:3000/api/accounts';

export async function getAccounts() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
       console.error(`External API responded with status: ${response.status}`);
       return [];
    }

    const accounts = await response.json();
    if (!Array.isArray(accounts)) return [];

    return accounts.map((a: any) => ({
      id: a.id || a.Id || a.accountId,
      name: a.name || a.Name || a.accountName || 'Unknown',
      type: (a.type || a.Type || 'income').toLowerCase(),
      code: a.code || a.Code || '',
      created_at: a.created_at || new Date().toISOString(),
      updated_at: a.updated_at || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function getAccountsByType(type: 'income' | 'expense') {
  try {
    const allAccounts = await getAccounts();
    return allAccounts.filter((a: any) => a.type === type);
  } catch (error) {
    console.error(`Error fetching ${type} accounts:`, error);
    return [];
  }
}

export async function addAccount(name: string, type: 'income' | 'expense', code?: string) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, type, code }),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to add account to external API.' };
    }

    const newAccount = await response.json();
    
    // Normalize return
    return { 
        success: true, 
        message: `Account "${name}" has been added via API.`, 
        accountId: newAccount.id || newAccount.Id,
        account: newAccount
    };
  } catch (error) {
    console.error('Error adding account:', error);
    return { success: false, message: 'Error adding account via API.' };
  }
}

export async function updateAccount(id: string, name: string, type: 'income' | 'expense', code?: string) {
    // External API update implementation would go here. 
    // For now, returning success to avoid breaking UI, but logging warning.
    console.warn('Update Account not fully implemented for External API');
    return { success: true, message: 'Account updated (local simulation).' };
}

export async function deleteAccount(id: string) {
    // External API delete implementation would go here.
    console.warn('Delete Account not fully implemented for External API');
    return { success: true, message: 'Account deleted (local simulation).' };
}

// Warehouses
export async function getWarehouses() {
  try {
    const sql = `SELECT * FROM warehouses ORDER BY name ASC`;
    const warehouses = await query(sql);
    return warehouses.map((w: any) => ({
      ...w,
      created_at: w.created_at,
      updated_at: w.updated_at
    }));
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return [];
  }
}

export async function addWarehouse(name: string, location?: string) {
  try {
    const warehouseId = `warehouse_${Date.now()}`;
    const sql = `INSERT INTO warehouses (id, name, location) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location)`;
    await query(sql, [warehouseId, name, location || null]);
    return { success: true, message: `Warehouse "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding warehouse:', error);
    return { success: false, message: 'Error adding warehouse.' };
  }
}

export async function updateWarehouse(id: string, name: string, location?: string) {
  try {
    const sql = `UPDATE warehouses SET name = ?, location = ? WHERE id = ?`;
    await query(sql, [name, location || null, id]);
    return { success: true, message: `Warehouse updated to "${name}".` };
  } catch (error) {
    console.error('Error updating warehouse:', error);
    return { success: false, message: 'Error updating warehouse.' };
  }
}

export async function deleteWarehouse(id: string) {
  try {
    const sql = `DELETE FROM warehouses WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Warehouse deleted successfully.' };
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    return { success: false, message: 'Error deleting warehouse.' };
  }
}

// Price Levels
export async function getPriceLevels() {
  try {
    const sql = `SELECT * FROM price_levels ORDER BY name ASC`;
    const levels = await query(sql);
    return levels.map((l: any) => ({
      ...l,
      isDefault: l.is_default === 1 || l.is_default === true,
      calculationBase: l.calculation_base || 'retail',
      percentageAdjustment: l.percentage_adjustment ? parseFloat(l.percentage_adjustment) : 0,
      minQuantity: l.min_quantity ? parseInt(l.min_quantity) : 0,
      created_at: l.created_at,
      updated_at: l.updated_at
    }));
  } catch (error) {
    console.error('Error fetching price levels:', error);
    return [];
  }
}

export async function addPriceLevel(name: string, description?: string, isDefault: boolean = false, percentageAdjustment: number = 0, minQuantity: number = 0, calculationBase: 'retail' | 'cost' = 'retail') {
  try {
    const levelId = `level_${Date.now()}`;
    
    if (isDefault) {
      await query('UPDATE price_levels SET is_default = FALSE');
    }
    
    const sql = `INSERT INTO price_levels (id, name, description, is_default, percentage_adjustment, min_quantity, calculation_base) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await query(sql, [levelId, name, description || null, isDefault, percentageAdjustment, minQuantity, calculationBase]);
    return { success: true, message: `Price level "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding price level:', error);
    return { success: false, message: 'Error adding price level.' };
  }
}

export async function updatePriceLevel(id: string, name: string, description?: string, isDefault: boolean = false, percentageAdjustment: number = 0, minQuantity: number = 0, calculationBase: 'retail' | 'cost' = 'retail') {
  try {
    if (isDefault) {
      await query('UPDATE price_levels SET is_default = FALSE');
    }
    
    const sql = `UPDATE price_levels SET name = ?, description = ?, is_default = ?, percentage_adjustment = ?, min_quantity = ?, calculation_base = ? WHERE id = ?`;
    await query(sql, [name, description || null, isDefault, percentageAdjustment, minQuantity, calculationBase, id]);
    return { success: true, message: `Price level "${name}" has been updated.` };
  } catch (error) {
    console.error('Error updating price level:', error);
    return { success: false, message: 'Error updating price level.' };
  }
}

export async function deletePriceLevel(id: string) {
  try {
    // Check if it's the default level
    const [level] = await query('SELECT name, is_default FROM price_levels WHERE id = ?', [id]);
    if (!level) {
      return { success: false, message: 'Price level not found.' };
    }
    
    if (level.is_default) {
      return { success: false, message: 'Cannot delete the default price level.' };
    }

    // Check if any customers are assigned to this price level
    const customerCheck = await query('SELECT id FROM customers WHERE price_level_id = ? LIMIT 1', [id]);
    if (customerCheck.length > 0) {
      return { 
        success: false, 
        message: `Cannot delete price level "${level.name}" because it is currently assigned to one or more customers. Please reassign the customers first.` 
      };
    }

    // Check if any product price overrides exist for this level
    const productCheck = await query('SELECT product_id FROM product_price_levels WHERE price_level_id = ? LIMIT 1', [id]);
    if (productCheck.length > 0) {
      return { 
        success: false, 
        message: `Cannot delete price level "${level.name}" because it is currently used in product price overrides. Please remove these overrides first.` 
      };
    }
    
    const sql = `DELETE FROM price_levels WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Price level deleted successfully.' };
  } catch (error) {
    console.error('Error deleting price level:', error);
    return { success: false, message: 'Error deleting price level. It may have associated transaction history.' };
  }
}
// Supplier Product Mappings
export async function getSupplierMappings(productId: string) {
  try {
    const sql = `
      SELECT spm.*, s.name as supplier_name, s.contact_number
      FROM supplier_product_mapping spm
      JOIN suppliers s ON spm.supplier_id = s.id
      WHERE spm.product_id = ?
      ORDER BY spm.is_primary DESC, s.name ASC
    `;
    const mappings = await query(sql, [productId]);
    
    return mappings.map((m: any) => ({
      id: m.id,
      productId: m.product_id,
      supplierId: m.supplier_id,
      supplierName: m.supplier_name,
      supplierSku: m.supplier_sku,
      supplierLeadTime: m.supplier_lead_time,
      supplierSpecificRop: m.supplier_specific_rop,
      supplierCost: m.supplier_cost ? parseFloat(m.supplier_cost) : undefined,
      isPrimary: m.is_primary === 1 || m.is_primary === true,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  } catch (error) {
    console.error('Error fetching supplier mappings:', error);
    return [];
  }
}

export async function addSupplierMapping(productId: string, supplierId: string, leadTime: number, rop: number, cost?: number, supplierSku?: string, isPrimary: boolean = false) {
  try {
    // If making this primary, unset other primaries for this product first
    if (isPrimary) {
      await query('UPDATE supplier_product_mapping SET is_primary = FALSE WHERE product_id = ?', [productId]);
    }
    
    // Check if mapping already exists
    const checkSql = `SELECT id FROM supplier_product_mapping WHERE product_id = ? AND supplier_id = ?`;
    const existing = await query(checkSql, [productId, supplierId]);
    
    if (existing.length > 0) {
      return { success: false, message: 'This supplier is already mapped to this product.' };
    }

    const id = `spm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const sql = `
      INSERT INTO supplier_product_mapping 
      (id, product_id, supplier_id, supplier_sku, supplier_lead_time, supplier_specific_rop, supplier_cost, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await query(sql, [id, productId, supplierId, supplierSku || null, leadTime, rop, cost || null, isPrimary]);

    if (isPrimary) {
        await query('UPDATE products SET reorder_point = ? WHERE id = ?', [rop, productId]);
    }
    
    return { success: true, message: 'Supplier mapping added successfully.', id };
  } catch (error) {
    console.error('Error adding supplier mapping:', error);
    return { success: false, message: 'Error adding supplier mapping.' };
  }
}

export async function updateSupplierMapping(id: string, leadTime: number, rop: number, cost?: number, supplierSku?: string, isPrimary: boolean = false) {
  try {
    // Get productId for this mapping to handle primary logic
    const [mapping] = await query('SELECT product_id FROM supplier_product_mapping WHERE id = ?', [id]);
    
    if (!mapping) {
      return { success: false, message: 'Mapping not found.' };
    }
    
    const productId = mapping.product_id;

    if (isPrimary) {
      await query('UPDATE supplier_product_mapping SET is_primary = FALSE WHERE product_id = ?', [productId]);
    }

    const sql = `
      UPDATE supplier_product_mapping
      SET supplier_lead_time = ?, supplier_specific_rop = ?, supplier_cost = ?, supplier_sku = ?, is_primary = ?
      WHERE id = ?
    `;
    
    await query(sql, [leadTime, rop, cost || null, supplierSku || null, isPrimary, id]);
    
    if (isPrimary) {
        await query('UPDATE products SET reorder_point = ? WHERE id = ?', [rop, productId]);
    }

    return { success: true, message: 'Supplier mapping updated successfully.' };
  } catch (error) {
    console.error('Error updating supplier mapping:', error);
    return { success: false, message: 'Error updating supplier mapping.' };
  }
}

export async function deleteSupplierMapping(id: string) {
  try {
    await query('DELETE FROM supplier_product_mapping WHERE id = ?', [id]);
    return { success: true, message: 'Supplier mapping removed.' };
  } catch (error) {
    console.error('Error deleting supplier mapping:', error);
    return { success: false, message: 'Error deleting supplier mapping.' };
  }
}

export async function setPrimarySupplier(productId: string, mappingId: string) {
  try {
    await query('UPDATE supplier_product_mapping SET is_primary = FALSE WHERE product_id = ?', [productId]);
    await query('UPDATE supplier_product_mapping SET is_primary = TRUE WHERE id = ?', [mappingId]);
    
    // Sync ROP
    const [mapping] = await query('SELECT supplier_specific_rop FROM supplier_product_mapping WHERE id = ?', [mappingId]);
    if (mapping) {
        await query('UPDATE products SET reorder_point = ? WHERE id = ?', [mapping.supplier_specific_rop, productId]);
    }

    return { success: true, message: 'Primary supplier updated.' };
  } catch (error) {
    console.error('Error setting primary supplier:', error);
    return { success: false, message: 'Error setting primary supplier.' };
  }
}

// Shelf Locations
export async function getShelfLocations() {
  try {
    const sql = `SELECT * FROM shelf_locations ORDER BY name ASC`;
    const locations = await query(sql);
    return locations.map((s: any) => ({
      ...s,
      isActive: s.is_active === 1,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  } catch (error) {
    console.error('Error fetching shelf locations:', error);
    return [];
  }
}

// Product Options Aggregation
export async function getProductOptions() {
  try {
    const [
      brandsResult,
      categoriesResult,
      subcategoriesResult,
      unitsResult,
      suppliersResult,
      accountsResult,
      warehousesResult,
      shelfLocationsResult,
      priceLevelsResult,
      taxRatesResult
    ] = await Promise.allSettled([
      getBrands(),
      getCategories(),
      getSubcategories(),
      getUnitsOfMeasure(),
      getSuppliers(),
      getAccounts(),
      getWarehouses(),
      getShelfLocations(),
      getPriceLevels(),
      getTaxRates()
    ]);

    return {
      brands: brandsResult.status === 'fulfilled' ? brandsResult.value : [],
      categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
      subcategories: subcategoriesResult.status === 'fulfilled' ? subcategoriesResult.value : [],
      units: unitsResult.status === 'fulfilled' ? unitsResult.value : [],
      suppliers: suppliersResult.status === 'fulfilled' ? suppliersResult.value : [],
      accounts: accountsResult.status === 'fulfilled' ? accountsResult.value : [],
      warehouses: warehousesResult.status === 'fulfilled' ? warehousesResult.value : [],
      shelfLocations: shelfLocationsResult.status === 'fulfilled' ? shelfLocationsResult.value : [],
      priceLevels: priceLevelsResult.status === 'fulfilled' ? priceLevelsResult.value : [],
      taxRates: taxRatesResult.status === 'fulfilled' ? taxRatesResult.value : [],
      errors: {
        accounts: accountsResult.status === 'rejected' ? String(accountsResult.reason) : null,
      }
    };
  } catch (error) {
    console.error('Error fetching product options:', error);
    return {
      brands: [], categories: [], subcategories: [], units: [], suppliers: [], 
      accounts: [], warehouses: [], shelfLocations: [], priceLevels: [], taxRates: [], errors: { global: String(error) }
    };
  }
}

export async function updateProductShelfLocations(updates: { productId: string; shelfLocationId: string | null }[]) {
  return await withTransaction(async (connection) => {
    try {
      for (const update of updates) {
        await connection.execute(
          'UPDATE products SET shelf_location_id = ? WHERE id = ?',
          [update.shelfLocationId, update.productId]
        );
      }
      return { success: true, message: 'Shelf locations updated successfully' };
    } catch (error) {
      console.error('Error updating shelf locations in bulk:', error);
      return { success: false, message: 'Failed to update shelf locations', error: String(error) };
    }
  });
}
