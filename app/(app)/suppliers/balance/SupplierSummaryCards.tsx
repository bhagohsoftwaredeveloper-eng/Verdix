'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, AlertTriangle, Clock, BarChart2 } from 'lucide-react';
import { AgingBuckets } from './use-supplier-balance';

type Props = {
  totalPayable: number;
  overdueTotal: number;
  awaitingCount: number;
  agingBuckets: AgingBuckets;
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

export function SupplierSummaryCards({ totalPayable, overdueTotal, awaitingCount, agingBuckets }: Props) {
  const totalWithBalance = totalPayable > 0 ? totalPayable : 1; // avoid divide-by-zero

  const agingRows = [
    { label: 'Current',    value: agingBuckets.current,    color: 'bg-emerald-500' },
    { label: '1–30 days',  value: agingBuckets.days1to30,  color: 'bg-yellow-400' },
    { label: '31–60 days', value: agingBuckets.days31to60, color: 'bg-orange-500' },
    { label: '61–90 days', value: agingBuckets.days61to90, color: 'bg-red-500'    },
    { label: '90+ days',   value: agingBuckets.days90plus, color: 'bg-red-900'    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">₱{fmt(totalPayable)}</div>
          <p className="text-xs text-muted-foreground">Total outstanding debt</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">₱{fmt(overdueTotal)}</div>
          <p className="text-xs text-muted-foreground">Past payment due date</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{awaitingCount}</div>
          <p className="text-xs text-muted-foreground">Suppliers with balance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aging Schedule</CardTitle>
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1.5 pt-1">
          {agingRows.map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-16 shrink-0 text-[10px] text-muted-foreground">{label}</div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${Math.min(100, (value / totalWithBalance) * 100)}%` }}
                />
              </div>
              <div className="w-20 shrink-0 text-right text-[10px] font-medium">
                {value > 0 ? `₱${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
