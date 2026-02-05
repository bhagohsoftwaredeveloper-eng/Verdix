
// Mock 'use server' environment if needed, or just import
import { getProducts, getProductsCount } from '../app/(app)/products/actions';

async function testActions() {
  try {
    console.log('Testing getProducts(10, 0)...');
    const products = await getProducts(10, 0);
    console.log('getProducts result count:', products.length);
    if (products.length > 0) {
        console.log('First product ID:', products[0].id);
        console.log('First product parentId:', products[0].parentId);
        console.log('First product parentId type:', typeof products[0].parentId);
    } else {
        console.log('Products array is empty.');
    }

    console.log('Testing getProductsCount()...');
    const count = await getProductsCount();
    console.log('getProductsCount result:', count);

  } catch (error) {
    console.error('Error executing actions:', error);
  }
}

testActions();
