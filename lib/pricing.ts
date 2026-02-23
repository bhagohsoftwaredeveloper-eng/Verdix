
import { Product, PriceLevel } from './types';

/**
 * Calculates the effective price for a product based on quantity and context.
 * 
 * Logic Priority:
 * 1. Tiered Overrides for the ACTIVE Level (Customer or Selected)
 * 2. Tiered Overrides for the DEFAULT Level
 * 3. Base Product Price
 * 
 * @param product The product object including its price levels
 * @param quantity The quantity being added/viewed
 * @param activeLevelId The currently active price level ID (from customer or manual selection)
 * @param defaultLevelId The system's default price level ID (usually 'retail-level')
 * @returns The calculated effective price
 */
export function calculateEffectivePrice(
    product: Product, 
    quantity: number, 
    activeLevelId?: string, 
    defaultLevelId: string = 'retail-level'
): number {
    if (!product.priceLevels || product.priceLevels.length === 0) {
        return product.price;
    }

    // Initialize with fallback prices
    let bestPrice = product.price;
    let foundOverride = false;

    // 1. Check ALL price levels for tiered overrides (minQuantity > 1) first
    // This allows a "Wholesale" tier to apply even if the user is on "Retail" or "VIP"
    const applicableTiers = product.priceLevels
        .filter(pl => 
            pl.minQuantity !== undefined && 
            pl.minQuantity !== null && 
            pl.minQuantity > 1 && 
            quantity >= pl.minQuantity
        )
        .sort((a, b) => b.minQuantity! - a.minQuantity!); // Check largest tiers first

    if (applicableTiers.length > 0) {
        // Find the lowest price among applicable tiers for this quantity
        // This ensures if multiple levels have a tier at Q12, we pick the cheapest
        return Math.min(...applicableTiers.map(t => t.price));
    }

    // 2. Fallback to overrides/base price for the ACTIVE level
    if (activeLevelId) {
        const activeLevelMatches = product.priceLevels
            .filter(pl => 
                pl.levelId === activeLevelId && 
                (pl.minQuantity === undefined || pl.minQuantity === null || quantity >= pl.minQuantity)
            )
            .sort((a, b) => (b.minQuantity || 0) - (a.minQuantity || 0));
        
        if (activeLevelMatches.length > 0) {
            return activeLevelMatches[0].price;
        }
    }

    // 3. Fallback to DEFAULT level base price or tiers
    const defaultOverrides = product.priceLevels
        .filter(pl => 
            pl.levelId === defaultLevelId && 
            (pl.minQuantity === undefined || pl.minQuantity === null || quantity >= pl.minQuantity)
        )
        .sort((a, b) => (b.minQuantity || 0) - (a.minQuantity || 0));
    
    if (defaultOverrides.length > 0) return defaultOverrides[0].price;

    // 4. Final fallback to the product's base price
    return product.price;
}
