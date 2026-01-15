'use server';

import { getRestockSuggestions } from '@/ai/flows/restock-suggestions';
import { initializeFirebaseOnServer } from '@/firebase/server-init';
import { Product } from '@/lib/types';
import { getDocs, collection } from 'firebase/firestore';

export type FormState = {
  suggestions: Awaited<ReturnType<typeof getRestockSuggestions>> | null;
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
    const { firestore } = initializeFirebaseOnServer();
    const productsSnapshot = await getDocs(collection(firestore, 'products'));
    const products = productsSnapshot.docs.map(doc => doc.data() as Product);

    const salesDataString = products
      .map(
        (p) =>
          `Product: ${p.name}, Avg Daily Sales: ${p.avgDailySales}, Current Stock: ${p.stock}, Reorder Point: ${p.reorderPoint}`
      )
      .join('\n');

    const suggestions = await getRestockSuggestions({
      salesData: salesDataString,
      storageCost: storageCost,
    });
    
    return { suggestions, error: null };
  } catch (e) {
    console.error(e);
    return {
      suggestions: null,
      error: 'Failed to generate suggestions. Please try again later.',
    };
  }
}

    