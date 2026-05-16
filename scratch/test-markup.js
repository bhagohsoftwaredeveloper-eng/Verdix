
import { calculateMarkupPercentage, calculateSuggestedPrice } from './lib/purchase-utils.js';

const mockSettings = {
    enableAutomaticMarkup: true,
    markupPriority: ["subcategory", "category", "brand", "supplier"],
    defaultMarkupPercentage: 15
};

const mockCategories = [
    { id: 'cat_001', name: 'Flour', markupPercentage: 20 }
];

const mockProduct = {
    category: 'Flour', // Name match
    subcategory: '',
    brand: '',
    supplierId: 'sup_001'
};

const result1 = calculateMarkupPercentage(mockProduct, mockSettings, mockCategories, [], [], []);
console.log('Test 1 (Name Match):', result1);

const mockProduct2 = {
    category: 'cat_001', // ID match attempt
    subcategory: '',
    brand: '',
    supplierId: 'sup_001'
};

const result2 = calculateMarkupPercentage(mockProduct2, mockSettings, mockCategories, [], [], []);
console.log('Test 2 (ID Match):', result2);

const suggested = calculateSuggestedPrice(1000, result1.markup);
console.log('Suggested Price (with 20%):', suggested);
