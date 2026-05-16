
const items = [
    { name: 'VAT Item', price: 112, quantity: 1, discount: 0, taxType: 'VAT' },
    { name: 'Exempt Item', price: 100, quantity: 1, discount: 0, taxType: 'VAT_EXEMPT' },
    { name: 'Zero Item', price: 50, quantity: 1, discount: 0, taxType: 'ZERO_RATED' },
    { name: 'Non-VAT Item', price: 75, quantity: 1, discount: 0, taxType: 'NON_VAT' },
    { name: 'Default Item', price: 25, quantity: 1, discount: 0 } // No taxType
];

const vatableSales = items.reduce((acc, item: any) => {
    const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
    return item.taxType === 'VAT' ? acc + (netItemTotal / 1.12) : acc;
}, 0);

const vatAmountResult = items.reduce((acc, item: any) => {
    const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
    return item.taxType === 'VAT' ? acc + (netItemTotal - (netItemTotal / 1.12)) : acc;
}, 0);

const vatExemptSales = items.reduce((acc, item: any) => {
    const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
    return item.taxType === 'VAT_EXEMPT' ? acc + netItemTotal : acc;
}, 0);

const zeroRatedSales = items.reduce((acc, item: any) => {
    const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
    return item.taxType === 'ZERO_RATED' ? acc + netItemTotal : acc;
}, 0);

const nonVatSales = items.reduce((acc, item: any) => {
    const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
    return (item.taxType === 'NON_VAT' || !item.taxType) ? acc + netItemTotal : acc;
}, 0);

console.log('--- Results ---');
console.log('VATABLE SALES:', vatableSales);
console.log('12% VAT:', vatAmountResult);
console.log('VAT-EXEMPT SALES:', vatExemptSales);
console.log('ZERO-RATED SALES:', zeroRatedSales);
console.log('NON-VAT SALES:', nonVatSales);

const total = vatableSales + vatAmountResult + vatExemptSales + zeroRatedSales + nonVatSales;
const originalTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
console.log('Computed Total:', total);
console.log('Original Total:', originalTotal);
console.log('Check:', total === originalTotal ? 'PASS' : 'FAIL');
