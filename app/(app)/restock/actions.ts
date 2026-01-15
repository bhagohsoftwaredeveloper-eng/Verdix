'use server';

import { Product } from '@/lib/types';
import { mockProducts } from '@/lib/data';

export type FormState = {
  suggestions: string[] | null; // Mock type for restock suggestions
  error: string | null;
};

export async function generateSuggestions(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const storageCostStr = formData.get('storageCost') as string;
  const storageCost = parseFloat(storageCostStr);

  if (isNaN(storageCost) || storageCost < 0) {
    return { suggestions: null, error: 'Please enter a valid, non-negative storage cost.' };
  }

  try {
    const products = mockProducts;

    const salesDataString = products
      .map(
        (p: Product) =>
          `Product: ${p.name}, Avg Daily Sales: ${p.avgDailySales}, Current Stock: ${p.stock}, Reorder Point: ${p.reorderPoint}`
      )
      .join('\n');

    // Mock restock suggestions based on products low on stock
    const suggestions: string[] = products
      .filter((p: Product) => p.stock <= p.reorderPoint)
      .map((p: Product) => `Restock ${p.name}: Current stock (${p.stock}) is below reorder point (${p.reorderPoint}). Consider ordering ${Math.max(50, p.avgDailySales * 30 - p.stock)} units.`);

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { suggestions, error: null };
  } catch (e) {
    console.error(e);
    return {
      suggestions: null,
      error: 'Failed to generate suggestions. Please try again later.',
    };
  }
}
