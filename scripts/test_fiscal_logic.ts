import { getFiscalYear, getFiscalPeriod, getFiscalYearRange, formatFiscalYear } from '../lib/fiscal-utils';

function testFiscalLogic() {
  console.log('--- Testing Fiscal Year Logic ---\n');

  const testCases = [
    { date: new Date('2024-03-15'), startMonth: 4, expectedFY: 2023, expectedPeriod: 12 },
    { date: new Date('2024-04-01'), startMonth: 4, expectedFY: 2024, expectedPeriod: 1 },
    { date: new Date('2024-12-31'), startMonth: 4, expectedFY: 2024, expectedPeriod: 9 },
    { date: new Date('2025-01-01'), startMonth: 4, expectedFY: 2024, expectedPeriod: 10 },
    { date: new Date('2024-01-01'), startMonth: 1, expectedFY: 2024, expectedPeriod: 1 },
    { date: new Date('2024-06-15'), startMonth: 7, expectedFY: 2023, expectedPeriod: 12 },
    { date: new Date('2024-07-01'), startMonth: 7, expectedFY: 2024, expectedPeriod: 1 },
  ];

  let passed = 0;
  testCases.forEach((tc, i) => {
    const fy = getFiscalYear(tc.date, tc.startMonth);
    const period = getFiscalPeriod(tc.date, tc.startMonth);
    const success = fy === tc.expectedFY && period === tc.expectedPeriod;
    
    console.log(`Test Case ${i + 1}: ${tc.date.toISOString().split('T')[0]} (Start: ${tc.startMonth})`);
    console.log(`  FY: ${fy} (Expected: ${tc.expectedFY}) ${fy === tc.expectedFY ? '✅' : '❌'}`);
    console.log(`  Period: ${period} (Expected: ${tc.expectedPeriod}) ${period === tc.expectedPeriod ? '✅' : '❌'}`);
    console.log(`  Formatted: ${formatFiscalYear(fy, tc.startMonth)}`);
    
    if (success) passed++;
  });

  console.log(`\n--- Range Tests ---`);
  const range = getFiscalYearRange(2024, 4);
  console.log(`FY 2024 (Start: April):`);
  console.log(`  Start: ${range.startDate.toISOString()}`);
  console.log(`  End: ${range.endDate.toISOString()}`);

  console.log(`\nTests Passed: ${passed}/${testCases.length}`);
  if (passed === testCases.length) {
    console.log('Result: SUCCESS 🚀');
  } else {
    console.log('Result: FAILED ❌');
  }
}

testFiscalLogic();
