
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

    // 1. Check for overrides for the ACTIVE level
    if (activeLevelId) {
        const applicableOverrides = product.priceLevels
            .filter(pl => 
                pl.levelId === activeLevelId && 
                pl.minQuantity !== undefined && 
                pl.minQuantity !== null && 
                quantity >= pl.minQuantity
            )
            .sort((a, b) => (b.minQuantity || 0) - (a.minQuantity || 0));
        
        if (applicableOverrides.length > 0) {
            return applicableOverrides[0].price;
        }
    }

    // 2. Fallback to DEFAULT level tiers if active level didn't produce a match
    if (activeLevelId !== defaultLevelId) {
        const defaultOverrides = product.priceLevels
            .filter(pl => 
                pl.levelId === defaultLevelId && 
                pl.minQuantity !== undefined && 
                pl.minQuantity !== null && 
                quantity >= pl.minQuantity
            )
            .sort((a, b) => (b.minQuantity || 0) - (a.minQuantity || 0));
            
        if (defaultOverrides.length > 0) {
            return defaultOverrides[0].price;
        }
    }

    // 3. Final fallback to the product's base price
    return product.price;
}
