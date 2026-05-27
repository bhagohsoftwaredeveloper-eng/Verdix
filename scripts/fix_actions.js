const fs = require('fs');

const filePath = 'd:/BHAGOH PROJECT/verdix/app/(app)/products/actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update hasActiveFilters in getProducts
const hasActiveFiltersOld = `const hasActiveFilters = filters && (
      (filters.brand && filters.brand !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.supplier && filters.supplier !== 'all') ||
      (filters.warehouse && filters.warehouse !== 'all') ||
      (filters.shelfLocation && filters.shelfLocation !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.search
    );`;

const hasActiveFiltersNew = `const hasActiveFilters = filters && (
      (filters.brand && filters.brand !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.department && filters.department !== 'all') ||
      (filters.supplier && filters.supplier !== 'all') ||
      (filters.warehouse && filters.warehouse !== 'all') ||
      (filters.shelfLocation && filters.shelfLocation !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.search
    );`;

content = content.replace(hasActiveFiltersOld, hasActiveFiltersNew);

// 2. Update whereClauses in getProducts
const whereClausesOld = `if (filters.category && filters.category !== 'all') {
        whereClauses.push(\`p.category = ?\`);
        params.push(filters.category);
      }`;

const whereClausesNew = `if (filters.category && filters.category !== 'all') {
        whereClauses.push(\`p.category = ?\`);
        params.push(filters.category);
      }
      if (filters.department && filters.department !== 'all') {
        whereClauses.push(\`p.department = ?\`);
        params.push(filters.department);
      }`;

content = content.replace(whereClausesOld, whereClausesNew);

// 3. Update whereClauses in getProductsCount
// We use the same string so it might replace both... that's fine as long as they are identical.
// But let's be careful. content.replace(str, newStr) only replaces first occurrence.
content = content.replace(whereClausesOld, whereClausesNew);

// 4. Update hasActiveFilters in getProductsCount
content = content.replace(hasActiveFiltersOld, hasActiveFiltersNew);

fs.writeFileSync(filePath, content);
console.log('Successfully updated actions.ts');
