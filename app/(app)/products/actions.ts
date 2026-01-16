'use server';

import { query } from '@/lib/mysql';

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
  priceLevels?: { levelId: string; price: number }[];
};

export async function getProducts(limit?: number, offset?: number) {
  try {
    let sql = `
      SELECT p.*, 
             s_legacy.name as legacy_supplier_name, 
             w.name as warehouse_name,
             spm.supplier_id as primary_supplier_id,
             spm.supplier_specific_rop as primary_supplier_rop,
             s_primary.name as primary_supplier_name
      FROM products p
      LEFT JOIN suppliers s_legacy ON p.supplier_id = s_legacy.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = 1
      LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
      ORDER BY p.created_at DESC
    `;

    const params: any[] = [];

    if (limit !== undefined && offset !== undefined) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const products = await query(sql, params.length > 0 ? params : undefined);

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
        price: parseFloat(pl.price)
      });
    });

    // Map database fields to Product type
    return products.map((product: any) => ({
      ...product,
      additionalDescription: product.additional_description,
      reorderPoint: product.reorder_point,
      primarySupplierRop: product.primary_supplier_rop, // Included new field
      avgDailySales: product.avg_daily_sales,
      price: parseFloat(product.price) || 0,
      cost: product.cost ? parseFloat(product.cost) : undefined,
      imageUrl: product.image_url,
      imageHint: product.image_hint,
      unitOfMeasure: product.unit_of_measure,
      parentId: product.parent_id,
      conversionFactor: product.conversion_factor,
      conversionFactors: cfMap.get(product.id) || [],
      incomeAccount: product.income_account,
      expenseAccount: product.expense_account,
      supplier: product.primary_supplier_id || product.supplier_id, // Use primary mapped supplier if available
      supplierName: product.primary_supplier_name || product.legacy_supplier_name,
      warehouse: product.warehouse_id,
      warehouseName: product.warehouse_name,
      priceLevels: plMap.get(product.id) || [],
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return []; // Return empty array instead of throwing to avoid crashing
  }
}

export async function getProductsCount() {
  try {
    const sql = `SELECT COUNT(*) as count FROM products`;
    const result = await query(sql);
    return result[0].count;
  } catch (error) {
    console.error('Error fetching products count:', error);
    return 0;
  }
}

export async function addProduct(formData: ProductFormData) {
  try {
    // Generate unique ID for the product
    const productId = `${formData.sku}-${Date.now()}`;

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
      stock: formData.stock || 0,
      reorder_point: formData.reorderPoint || 0,
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
      income_account: formData.incomeAccount || null,
      expense_account: formData.expenseAccount || null,
    };

    // Insert product into MySQL database
    const sql = `
      INSERT INTO products (
        id, name, description, additional_description, category, brand,
        subcategory, supplier_id, warehouse_id, stock, reorder_point, avg_daily_sales, price, cost,
        sku, barcode, image_url, image_hint,
        unit_of_measure, parent_id, conversion_factor, income_account, expense_account
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    ];

    await query(sql, values_array);

    // Insert conversion factors if provided
    if (formData.conversionFactors && formData.conversionFactors.length > 0) {
      for (const cf of formData.conversionFactors) {
        const cfId = `${productId}-cf-${cf.unit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cfSql = `
          INSERT INTO conversion_factors (id, product_id, unit, factor)
          VALUES (?, ?, ?, ?)
        `;
        await query(cfSql, [cfId, productId, cf.unit, cf.factor]);
      }
    }

    // Insert price levels if provided
    if (formData.priceLevels && formData.priceLevels.length > 0) {
      for (const pl of formData.priceLevels) {
        const plSql = `
          INSERT INTO product_price_levels (product_id, price_level_id, price)
          VALUES (?, ?, ?)
        `;
        await query(plSql, [productId, pl.levelId, pl.price]);
      }
    }

    return { success: true, message: `${formData.name} has been added to the inventory.`, productId };

  } catch (error) {
    console.error('Error saving product:', error);
    return { success: false, message: 'There was an error saving the product. Please check your database connection and try again.' };
  }
}

// Brands
export async function getBrands() {
  try {
    const sql = `SELECT * FROM brands ORDER BY name ASC`;
    const brands = await query(sql);
    return brands.map((b: any) => ({ ...b, created_at: b.created_at, updated_at: b.updated_at }));
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

export async function addBrand(name: string) {
  try {
    const brandId = `brand_${Date.now()}`;
    const sql = `INSERT INTO brands (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`;
    await query(sql, [brandId, name]);
    return { success: true, message: `Brand "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding brand:', error);
    return { success: false, message: 'Error adding brand.' };
  }
}

export async function updateBrand(id: string, name: string) {
  try {
    const sql = `UPDATE brands SET name = ? WHERE id = ?`;
    await query(sql, [name, id]);
    return { success: true, message: `Brand updated to "${name}".` };
  } catch (error) {
    console.error('Error updating brand:', error);
    return { success: false, message: 'Error updating brand.' };
  }
}

export async function updateCategory(id: string, name: string) {
  try {
    const sql = `UPDATE categories SET name = ? WHERE id = ?`;
    await query(sql, [name, id]);
    return { success: true, message: `Category updated to "${name}".` };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, message: 'Error updating category.' };
  }
}

export async function updateSubcategory(id: string, name: string) {
  try {
    const sql = `UPDATE subcategories SET name = ? WHERE id = ?`;
    await query(sql, [name, id]);
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
      conversion_factor: formData.conversionFactor || 1,
      income_account: formData.incomeAccount || null,
      expense_account: formData.expenseAccount || null,
    };

    // Update product in MySQL database
    const sql = `
      UPDATE products SET
        name = ?, description = ?, additional_description = ?, category = ?,
        brand = ?, subcategory = ?, supplier_id = ?, reorder_point = ?, price = ?, cost = ?,
        barcode = ?, unit_of_measure = ?, warehouse_id = ?, conversion_factor = ?,
        income_account = ?, expense_account = ?
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
      productData.reorder_point,
      productData.price,
      productData.cost,
      productData.barcode,
      productData.unit_of_measure,
      productData.warehouse_id,
      productData.conversion_factor,
      productData.income_account,
      productData.expense_account,
      id,
    ];

    await query(sql, values_array);

    // Handle conversion factors: delete existing and insert new ones
    const deleteCFSql = `DELETE FROM conversion_factors WHERE product_id = ?`;
    await query(deleteCFSql, [id]);

    if (formData.conversionFactors && formData.conversionFactors.length > 0) {
      for (const cf of formData.conversionFactors) {
        const cfId = `${id}-cf-${cf.unit}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cfSql = `
          INSERT INTO conversion_factors (id, product_id, unit, factor)
          VALUES (?, ?, ?, ?)
        `;
        await query(cfSql, [cfId, id, cf.unit, cf.factor]);
      }
    }

    // Handle price levels: delete existing and insert new ones
    const deletePLSql = `DELETE FROM product_price_levels WHERE product_id = ?`;
    await query(deletePLSql, [id]);

    if (formData.priceLevels && formData.priceLevels.length > 0) {
      for (const pl of formData.priceLevels) {
        const plSql = `
          INSERT INTO product_price_levels (product_id, price_level_id, price)
          VALUES (?, ?, ?)
        `;
        await query(plSql, [id, pl.levelId, pl.price]);
      }
    }

    return { success: true, message: `${formData.name} has been updated.` };

  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, message: 'There was an error updating the product. Please check your database connection and try again.' };
  }
}

export async function deleteBrand(id: string) {
  try {
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
    const sql = `SELECT * FROM categories ORDER BY name ASC`;
    const categories = await query(sql);
    return categories.map((c: any) => ({ ...c, created_at: c.created_at, updated_at: c.updated_at }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function addCategory(name: string) {
  try {
    const categoryId = `category_${Date.now()}`;
    const sql = `INSERT INTO categories (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`;
    await query(sql, [categoryId, name]);
    return { success: true, message: `Category "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, message: 'Error adding category.' };
  }
}

export async function deleteCategory(id: string) {
  try {
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
    const sql = `SELECT * FROM subcategories ORDER BY name ASC`;
    const subcategories = await query(sql);
    return subcategories.map((s: any) => ({ ...s, created_at: s.created_at, updated_at: s.updated_at }));
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
}

export async function addSubcategory(name: string) {
  try {
    const subcategoryId = `subcategory_${Date.now()}`;
    const sql = `INSERT INTO subcategories (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`;
    await query(sql, [subcategoryId, name]);
    return { success: true, message: `Subcategory "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding subcategory:', error);
    return { success: false, message: 'Error adding subcategory.' };
  }
}

export async function deleteSubcategory(id: string) {
  try {
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
      markupPercentage: s.markup_percentage ? parseFloat(s.markup_percentage) : undefined,
      created_at: s.created_at,
      updated_at: s.updated_at
    }));
  } catch (error) {
    return [];
  }
}

export async function addSupplier(name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) {
  try {
    const supplierId = `supplier_${Date.now()}`;
    const sql = `INSERT INTO suppliers (id, name, contact_number, address, payment_terms, markup_percentage) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), contact_number = VALUES(contact_number), address = VALUES(address), payment_terms = VALUES(payment_terms), markup_percentage = VALUES(markup_percentage)`;
    await query(sql, [supplierId, name, contactNumber, address || null, paymentTerms || null, markupPercentage || null]);
    return { success: true, message: `Supplier "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding supplier:', error);
    return { success: false, message: 'Error adding supplier.' };
  }
}

export async function updateSupplier(id: string, name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) {
  try {
    const sql = `UPDATE suppliers SET name = ?, contact_number = ?, address = ?, payment_terms = ?, markup_percentage = ? WHERE id = ?`;
    await query(sql, [name, contactNumber, address || null, paymentTerms || null, markupPercentage || null, id]);
    return { success: true, message: `Supplier updated to "${name}".` };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, message: 'Error updating supplier.' };
  }
}

export async function deleteSupplier(id: string) {
  try {
    const sql = `DELETE FROM suppliers WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Error deleting supplier.' };
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
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function readEnvConfig() {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
      if (!fs.existsSync(envPath)) {
        return {};
      }
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      return envConfig;
  } catch (e) {
      console.error("Error reading .env file", e);
      return {};
  }
}

function getExternalApiUrl() {
  const config = readEnvConfig();
  // Ensure the URL is valid and doesn't end with a slash to avoid double slashes
  let url = config.API_URL || '';
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  // Clean up if user entered the full endpoint path by mistake
  if (url.endsWith('/api/accounts')) {
      url = url.replace('/api/accounts', '');
  }
  
  // If no URL is configured, return null or empty to handle gracefully
  return url;
}

export async function getAccounts() {
  try {
    const apiUrl = getExternalApiUrl();
    
    if (!apiUrl) {
       console.warn('API URL not configured in settings.');
       return [];
    }
    
    // Construct the endpoint URL using the base API URL
    const endpoint = `${apiUrl}/api/accounts`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const accounts = await response.json();

    if (!Array.isArray(accounts)) return [];

    return accounts.map((a: any) => {
      const cat = (a.category || a.Category || '').toLowerCase();
      let derivedType = 'income';
      if (cat.includes('expense')) derivedType = 'expense';
      else if (cat.includes('income')) derivedType = 'income';

      return {
        ...a,
        id: a.id || a.Id || a.ID || a.accountId || a.AccountId,
        name: a.name || a.Name || a.accountName || a.AccountName || a.title || a.Title || 'Unknown Account',
        code: a.code || a.Code || a.accountCode || a.AccountCode || '',
        type: derivedType as 'income' | 'expense',
        created_at: a.created_at,
        updated_at: a.updated_at
      };
    });
  } catch (error) {
    console.error('Error fetching accounts from external API:', error);
    return [];
  }
}

export async function getAccountsByType(type: 'income' | 'expense') {
  try {
    const apiUrl = getExternalApiUrl();
    
    if (!apiUrl) {
       return [];
    }

    const endpoint = `${apiUrl}/api/accounts`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const accounts = await response.json();

    if (!Array.isArray(accounts)) return [];

    return accounts
      .map((a: any) => {
        const cat = (a.category || a.Category || '').toLowerCase();
        let derivedType = '';
        if (cat.includes('expense')) derivedType = 'expense';
        else if (cat.includes('income')) derivedType = 'income';

        return {
          ...a,
          id: a.id || a.Id || a.ID || a.accountId || a.AccountId,
          name: a.name || a.Name || a.accountName || a.AccountName || a.title || a.Title || 'Unknown Account',
          code: a.code || a.Code || a.accountCode || a.AccountCode || '',
          type: derivedType as 'income' | 'expense',
          created_at: a.created_at,
          updated_at: a.updated_at
        };
      })
      .filter(a => a.type === type);
  } catch (error) {
    console.error(`Error fetching ${type} accounts from external API:`, error);
    return [];
  }
}

export async function addAccount(name: string, type: 'income' | 'expense', code?: string) {
  try {
    const accountId = `account_${Date.now()}`;
    const sql = `INSERT INTO accounts (id, name, type, code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), code = VALUES(code)`;
    await query(sql, [accountId, name, type, code || null]);
    return { success: true, message: `Account "${name}" has been added.`, accountId, account: { id: accountId, name, type, code } };
  } catch (error) {
    console.error('Error adding account:', error);
    return { success: false, message: 'Error adding account.' };
  }
}

export async function updateAccount(id: string, name: string, type: 'income' | 'expense', code?: string) {
  try {
    const sql = `UPDATE accounts SET name = ?, type = ?, code = ? WHERE id = ?`;
    await query(sql, [name, type, code || null, id]);
    return { success: true, message: `Account updated to "${name}".` };
  } catch (error) {
    console.error('Error updating account:', error);
    return { success: false, message: 'Error updating account.' };
  }
}

export async function deleteAccount(id: string) {
  try {
    const sql = `DELETE FROM accounts WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Account deleted successfully.' };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, message: 'Error deleting account.' };
  }
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
      created_at: l.created_at,
      updated_at: l.updated_at
    }));
  } catch (error) {
    console.error('Error fetching price levels:', error);
    return [];
  }
}

export async function addPriceLevel(name: string, description?: string, isDefault: boolean = false) {
  try {
    const levelId = `level_${Date.now()}`;
    
    if (isDefault) {
      await query('UPDATE price_levels SET is_default = FALSE');
    }
    
    const sql = `INSERT INTO price_levels (id, name, description, is_default) VALUES (?, ?, ?, ?)`;
    await query(sql, [levelId, name, description || null, isDefault]);
    return { success: true, message: `Price level "${name}" has been added.` };
  } catch (error) {
    console.error('Error adding price level:', error);
    return { success: false, message: 'Error adding price level.' };
  }
}

export async function updatePriceLevel(id: string, name: string, description?: string, isDefault: boolean = false) {
  try {
    if (isDefault) {
      await query('UPDATE price_levels SET is_default = FALSE');
    }
    
    const sql = `UPDATE price_levels SET name = ?, description = ?, is_default = ? WHERE id = ?`;
    await query(sql, [name, description || null, isDefault, id]);
    return { success: true, message: `Price level "${name}" has been updated.` };
  } catch (error) {
    console.error('Error updating price level:', error);
    return { success: false, message: 'Error updating price level.' };
  }
}

export async function deletePriceLevel(id: string) {
  try {
    // Check if it's the default level
    const [level] = await query('SELECT is_default FROM price_levels WHERE id = ?', [id]);
    if (level && level.is_default) {
      return { success: false, message: 'Cannot delete the default price level.' };
    }
    
    const sql = `DELETE FROM price_levels WHERE id = ?`;
    await query(sql, [id]);
    return { success: true, message: 'Price level deleted successfully.' };
  } catch (error) {
    console.error('Error deleting price level:', error);
    return { success: false, message: 'Error deleting price level.' };
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
    return { success: true, message: 'Primary supplier updated.' };
  } catch (error) {
    console.error('Error setting primary supplier:', error);
    return { success: false, message: 'Error setting primary supplier.' };
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
      priceLevelsResult
    ] = await Promise.allSettled([
      getBrands(),
      getCategories(),
      getSubcategories(),
      getUnitsOfMeasure(),
      getSuppliers(),
      getAccounts(),
      getWarehouses(),
      getPriceLevels()
    ]);

    return {
      brands: brandsResult.status === 'fulfilled' ? brandsResult.value : [],
      categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
      subcategories: subcategoriesResult.status === 'fulfilled' ? subcategoriesResult.value : [],
      units: unitsResult.status === 'fulfilled' ? unitsResult.value : [],
      suppliers: suppliersResult.status === 'fulfilled' ? suppliersResult.value : [],
      accounts: accountsResult.status === 'fulfilled' ? accountsResult.value : [],
      warehouses: warehousesResult.status === 'fulfilled' ? warehousesResult.value : [],
      priceLevels: priceLevelsResult.status === 'fulfilled' ? priceLevelsResult.value : [],
      errors: {
        accounts: accountsResult.status === 'rejected' ? String(accountsResult.reason) : null,
      }
    };
  } catch (error) {
    console.error('Error fetching product options:', error);
    return {
      brands: [], categories: [], subcategories: [], units: [], suppliers: [], 
      accounts: [], warehouses: [], priceLevels: [], errors: { global: String(error) }
    };
  }
}
