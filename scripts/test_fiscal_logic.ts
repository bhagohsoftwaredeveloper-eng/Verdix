import { getFiscalYear, getFiscalPeriod, getFiscalYearRange, formatFiscalYear, getCurrentFiscalYear, toLocalYmd } from '../lib/fiscal-utils';

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

  console.log(`Tests Passed: ${passed}/${testCases.length}`);

  console.log(`\n--- getCurrentFiscalYear Tests ---`);
  const cfyCases = [
    { now: new Date('2024-03-15'), startMonth: 4, expected: 2023 },
    { now: new Date('2024-04-01'), startMonth: 4, expected: 2024 },
    { now: new Date('2024-06-15'), startMonth: 1, expected: 2024 },
    { now: new Date('2025-01-01'), startMonth: 4, expected: 2024 },
  ];
  let cfyPassed = 0;
  cfyCases.forEach((tc, i) => {
    const got = getCurrentFiscalYear(tc.startMonth, tc.now);
    const ok = got === tc.expected;
    console.log(`  CFY ${i + 1}: ${tc.now.toISOString().split('T')[0]} (Start ${tc.startMonth}) => ${got} (Expected ${tc.expected}) ${ok ? '✅' : '❌'}`);
    if (ok) cfyPassed++;
  });
  console.log(`  getCurrentFiscalYear Passed: ${cfyPassed}/${cfyCases.length}`);

  console.log(`\n--- toLocalYmd Range Tests ---`);
  const { startDate: aprStart, endDate: aprEnd } = getFiscalYearRange(2024, 4);
  const aprStartStr = toLocalYmd(aprStart);
  const aprEndStr = toLocalYmd(aprEnd);
  const rangeOk = aprStartStr === '2024-04-01' && aprEndStr === '2025-03-31';
  console.log(`  FY2024 (Apr start) local range: ${aprStartStr} .. ${aprEndStr} (Expected 2024-04-01 .. 2025-03-31) ${rangeOk ? '✅' : '❌'}`);
  if (!rangeOk) { console.log('  toLocalYmd RANGE TEST FAILED'); }

  console.log(`\nResult: ${passed === testCases.length && cfyPassed === cfyCases.length && rangeOk ? 'SUCCESS 🚀' : 'FAILED ❌'}`);
}

testFiscalLogic();
