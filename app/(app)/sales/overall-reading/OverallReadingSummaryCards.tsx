'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ShoppingCart, CreditCard, Users } from 'lucide-react';
import type { OverallReadingData } from './overall-reading-types';

interface Props {
  readingData: OverallReadingData;
}

export function OverallReadingSummaryCards({ readingData }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
        <div className="absolute right-[-10px] top-[-10px] opacity-10"><TrendingUp size={100} /></div>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-100">Net Sales</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{readingData.netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-blue-100 mt-1">Total revenue after deductions</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
        <div className="absolute right-[-10px] top-[-10px] opacity-10"><ShoppingCart size={100} /></div>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-100">Gross Sales</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{readingData.grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-emerald-100 mt-1">Total revenue before deductions</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative">
        <div className="absolute right-[-10px] top-[-10px] opacity-10"><CreditCard size={100} /></div>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-violet-100">Transactions</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{readingData.transactionCount}</div>
          <p className="text-xs text-violet-100 mt-1">Completed transactions</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
        <div className="absolute right-[-10px] top-[-10px] opacity-10"><Users size={100} /></div>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-100">Total Discounts</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{readingData.totalDiscounts.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-amber-100 mt-1">Total discounts given</p>
        </CardContent>
      </Card>
    </div>
  );
}
