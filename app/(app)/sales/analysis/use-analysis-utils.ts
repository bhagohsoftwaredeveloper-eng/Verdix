'use client';

import { format } from 'date-fns';
import type { SalesData } from './analysis-types';

type UtilParams = {
  salesData: SalesData[];
  interval: string;
};

export function useAnalysisUtils({ salesData, interval }: UtilParams) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(val || 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (interval === 'monthly') return format(date, 'MMMM yyyy');
    if (interval === 'hourly') return format(date, 'PP p');
    return format(date, 'PP');
  };

  const summaryTotals = salesData.reduce(
    (acc, row) => ({
      transactions: acc.transactions + row.transactionCount,
      revenue: acc.revenue + row.totalRevenue,
      discount: acc.discount + row.totalDiscount,
      cost: acc.cost + row.cost,
      profit: acc.profit + row.profit,
    }),
    { transactions: 0, revenue: 0, discount: 0, cost: 0, profit: 0 }
  );

  const avgTransactionValue =
    summaryTotals.transactions > 0 ? summaryTotals.revenue / summaryTotals.transactions : 0;

  const exportToCSV = () => {
    const headers = ['Date', 'Transactions', 'Revenue', 'Discount', 'Cost', 'Profit'];
    const csvRows = salesData.map(item => [
      formatDate(item.date) || '',
      item.transactionCount || 0,
      item.totalRevenue || 0,
      item.totalDiscount || 0,
      item.cost || 0,
      item.profit || 0,
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_analysis_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <html><head><title>Sales Analysis Report</title>
      <style>body{font-family:sans-serif;font-size:10px;}table{width:100%;border-collapse:collapse;margin-bottom:20px;}th,td{border:1px solid #ddd;padding:4px;text-align:left;}th{background-color:#f2f2f2;font-weight:bold;}.text-right{text-align:right;}h2{margin-bottom:10px;}p{margin:5px 0;}</style>
      </head><body>
      <h2>Sales Analysis Report</h2>
      <p>Generated: ${format(new Date(), 'PPpp')}</p>
      <p>Interval: ${interval.charAt(0).toUpperCase() + interval.slice(1)}</p>
      <table><thead><tr><th>Date</th><th class="text-right">Transactions</th><th class="text-right">Revenue</th><th class="text-right">Discount</th><th class="text-right">Cost</th><th class="text-right">Profit</th></tr></thead>
      <tbody>${salesData.map(item => `<tr><td>${formatDate(item.date) || ''}</td><td class="text-right">${item.transactionCount}</td><td class="text-right">${formatCurrency(item.totalRevenue)}</td><td class="text-right">${formatCurrency(item.totalDiscount)}</td><td class="text-right">${formatCurrency(item.cost)}</td><td class="text-right">${formatCurrency(item.profit)}</td></tr>`).join('')}
      </tbody></table></body></html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return {
    formatCurrency,
    formatDate,
    summaryTotals,
    avgTransactionValue,
    exportToCSV,
    exportToPDF,
  };
}
