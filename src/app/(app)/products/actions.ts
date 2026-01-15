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
};

export async function getProducts(limit?: number, offset?: number) {
  try {
    let sql = `
      SELECT p.*, s.name as supplier_name, w.name as warehouse_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
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

    // Map database fields to Product type
    return products.map((product: any) => ({
      ...product,
      additionalDescription: product.additional_description,
      reorderPoint: product.reorder_point,
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
      supplier: product.supplier_name,
      warehouse: product.warehouse_id, // Return ID for form binding, or name if needed? Usually ID for edit forms.
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
        brand = ?, subcategory = ?, reorder_point = ?, price = ?, cost = ?,
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
export async function getAccounts() {
  try {
    const response = await fetch('/api/accounts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const accounts = await response.json();

    if (!Array.isArray(accounts)) return [];

    return accounts.map((a: any) => ({
      ...a,
      id: a.id,
      name: a.name,
      code: a.code || '',
      type: a.type as 'income' | 'expense',
      created_at: a.created_at,
      updated_at: a.updated_at
    }));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function getAccountsByType(type: 'income' | 'expense') {
  try {
    const response = await fetch(`/api/accounts?type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const accounts = await response.json();

    if (!Array.isArray(accounts)) return [];

    return accounts.map((a: any) => ({
      ...a,
      id: a.id,
      name: a.name,
      code: a.code || '',
      type: a.type as 'income' | 'expense',
      created_at: a.created_at,
      updated_at: a.updated_at
    }));
  } catch (error) {
    console.error(`Error fetching ${type} accounts:`, error);
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
