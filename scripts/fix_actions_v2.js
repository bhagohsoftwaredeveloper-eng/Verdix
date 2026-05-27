const fs = require('fs');

const filePath = 'd:/BHAGOH PROJECT/verdix/app/(app)/products/actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update hasActiveFilters in getProducts (first occurrence)
content = content.replace(
  /\(filters\.category && filters\.category !== 'all'\) \|\|/,
  "(filters.category && filters.category !== 'all') ||\n      (filters.department && filters.department !== 'all') ||"
);

// 2. Update whereClauses in getProducts
content = content.replace(
  /if \(filters\.category && filters\.category !== 'all'\) \{\s+whereClauses\.push\(`p\.category = \?`\);\s+params\.push\(filters\.category\);\s+\}/,
  `if (filters.category && filters.category !== 'all') {
        whereClauses.push(\`p.category = ?\`);
        params.push(filters.category);
      }
      if (filters.department && filters.department !== 'all') {
        whereClauses.push(\`p.department = ?\`);
        params.push(filters.department);
      }`
);

// Repeat for getProductsCount
content = content.replace(
  /\(filters\.category && filters\.category !== 'all'\) \|\|/,
  "(filters.category && filters.category !== 'all') ||\n      (filters.department && filters.department !== 'all') ||"
);

content = content.replace(
  /if \(filters\.category && filters\.category !== 'all'\) \{\s+whereClauses\.push\(`p\.category = \?`\);\s+params\.push\(filters\.category\);\s+\}/,
  `if (filters.category && filters.category !== 'all') {
        whereClauses.push(\`p.category = ?\`);
        params.push(filters.category);
      }
      if (filters.department && filters.department !== 'all') {
        whereClauses.push(\`p.department = ?\`);
        params.push(filters.department);
      }`
);

fs.writeFileSync(filePath, content);
console.log('Successfully updated actions.ts with regex');
