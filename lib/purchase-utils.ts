/**
 * Utility functions for purchase order cost calculations, 
 * including Landed Cost distribution.
 */
import { toSafeNumber } from './utils';

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  discount?: number;
  discountType?: 'amount' | 'percentage';
  vatSubject?: boolean;
}

export interface CalculatedPurchaseDetails {
  subtotal: number;
  vatAmount: number;
  shippingFee: number;
  grandTotal: number;
  items: Array<PurchaseItem & {
    lineTotal: number;
    landedCostPerUnit: number;
    landedCostTotal: number;
    shippingAllocation: number;
  }>;
}

/**
 * Calculates total costs and distributes shipping fee across items (Landed Cost).
 * 
 * @param items List of purchase items
 * @param shippingFee Total shipping fee for the order
 * @param taxRate VAT rate (e.g., 12 for 12%). VAT is assumed to be INCLUSIVE if vatSubject is true.
 * @param allocationStrategy Strategy for distributing shipping costs: 
 *                           'equal' (per line) or 'proportional' (by value/subtotal)
 */
export function calculatePurchaseCosts(
  items: PurchaseItem[],
  shippingFee: number | string = 0,
  taxRate: number | string = 12,
  allocationStrategy: 'equal' | 'proportional' = 'equal'
): CalculatedPurchaseDetails {
  let subtotal = 0;
  let totalVat = 0;

  const numericShippingFee = toSafeNumber(shippingFee);
  const numericTaxRate = toSafeNumber(taxRate);

  // 1. Calculate line totals and base order subtotal
  const processedItems = items.map(item => {
    const cost = toSafeNumber(item.cost);
    const quantity = toSafeNumber(item.quantity);
    const discount = toSafeNumber(item.discount);
    const discountType = item.discountType || 'amount';
    const isVatSubject = item.vatSubject || false;

    let lineTotal = cost * quantity;
    if (discountType === 'percentage') {
      lineTotal = lineTotal - (lineTotal * (discount / 100));
    } else {
      lineTotal = lineTotal - discount;
    }

    subtotal += lineTotal;

    if (isVatSubject) {
      // Inclusive VAT calculation: Total * (Rate / (100 + Rate))
      totalVat += lineTotal * (numericTaxRate / (100 + numericTaxRate));
    }

    return {
      ...item,
      cost,
      quantity,
      discount,
      lineTotal,
    };
  });

  const grandTotal = subtotal + numericShippingFee;

  // 2. Distribute shipping fee across items (Landed Cost Calculation)
  const numLines = items.length;
  
  const itemsWithLandedCost = processedItems.map(item => {
    let shippingAllocation = 0;

    if (numericShippingFee > 0) {
      if (allocationStrategy === 'proportional' && subtotal > 0) {
        // Allocation method: Proportional to line total / subtotal
        shippingAllocation = (item.lineTotal / subtotal) * numericShippingFee;
      } else {
        // Allocation method: Divided equally by the number of item lines (not total quantity).
        shippingAllocation = numLines > 0 ? numericShippingFee / numLines : 0;
      }
    }

    const landedCostTotal = item.lineTotal + shippingAllocation;
    const landedCostPerUnit = item.quantity > 0 ? landedCostTotal / item.quantity : 0;

    return {
      ...item,
      shippingAllocation,
      landedCostTotal,
      landedCostPerUnit,
    };
  });

  return {
    subtotal,
    vatAmount: totalVat,
    shippingFee: numericShippingFee,
    grandTotal,
    items: itemsWithLandedCost,
  };
}

/**
 * Calculates the markup percentage for a product based on system settings and priority rules.
 */
export function calculateMarkupPercentage(
  product: { category?: string; subcategory?: string; brand?: string; supplierId?: string },
  settings: any,
  categories: any[] = [],
  subcategories: any[] = [],
  brands: any[] = [],
  suppliers: any[] = []
): { markup: number; source: string } {
  if (!settings?.enableAutomaticMarkup) {
    return { markup: 0, source: '' };
  }

  const category = categories.find(c => c.name === product.category);
  const subcategory = subcategories.find(s => s.name === product.subcategory);
  const brand = brands.find(b => b.name === product.brand);
  const supplier = suppliers.find(s => s.id === product.supplierId);

  let markup = 0;
  let source = '';
  const priority = settings.markupPriority || ["subcategory", "category", "brand", "supplier"];

  for (const type of priority) {
    if (type === 'subcategory' && subcategory && subcategory.markupPercentage && subcategory.markupPercentage > 0) {
      markup = subcategory.markupPercentage;
      source = 'Subcategory';
      break;
    } else if (type === 'category' && category && category.markupPercentage && category.markupPercentage > 0) {
      markup = category.markupPercentage;
      source = 'Category';
      break;
    } else if (type === 'brand' && brand && brand.markupPercentage && brand.markupPercentage > 0) {
      markup = brand.markupPercentage;
      source = 'Brand';
      break;
    } else if (type === 'supplier' && supplier && supplier.markupPercentage && supplier.markupPercentage > 0) {
        markup = supplier.markupPercentage;
        source = 'Supplier';
        break;
    }
  }

  // Fallback to global default if no specific markup found
  if (!source && settings.defaultMarkupPercentage !== undefined) {
    markup = settings.defaultMarkupPercentage;
    source = 'Global Default';
  }

  return { markup, source };
}

/**
 * Calculates the suggested selling price based on landed cost and markup.
 */
export function calculateSuggestedPrice(
  landedCost: number,
  markupPercentage: number,
  priceLevel?: any // Default level from system
): number {
  // 1. Calculate the base retail price (Landed Cost + Automatic Markup)
  const baseRetailPrice = landedCost * (1 + (toSafeNumber(markupPercentage)) / 100);
  
  if (priceLevel) {
    const adjustment = toSafeNumber(priceLevel.percentageAdjustment);
    const base = priceLevel.calculationBase || 'retail';
    
    if (adjustment !== 0) {
      if (base === 'cost') {
        // Option A: Adjust directly on top of Landed Cost
        return landedCost * (1 + adjustment / 100);
      } else {
        // Option B: Adjust on top of the calculated Retail Price
        return baseRetailPrice * (1 + adjustment / 100);
      }
    }
  }
  
  return baseRetailPrice;
}
