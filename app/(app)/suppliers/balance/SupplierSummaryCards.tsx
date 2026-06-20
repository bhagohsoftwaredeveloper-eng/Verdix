'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, AlertTriangle, Clock } from 'lucide-react';

type Props = {
  totalPayable: number;
  overdueTotal: number;
  awaitingCount: number;
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

export function SupplierSummaryCards({ totalPayable, overdueTotal, awaitingCount }: Props) {
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
          <CardTitle className="text-sm font-medium">Overdue (30+ Days)</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{fmt(overdueTotal)}</div>
          <p className="text-xs text-muted-foreground">Critical outstanding balance</p>
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
    </div>
  );
}
