'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OverallReadingData } from './overall-reading-types';

interface Props {
  readingData: OverallReadingData;
  maxTerminalSales: number;
  maxCashierSales: number;
}

export function OverallReadingBreakdown({ readingData, maxTerminalSales, maxCashierSales }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800">Terminal Breakdown</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Sales performance per terminal</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            {readingData.terminals.map((term, idx) => {
              const percentage = (term.netSales / maxTerminalSales) * 100;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{term.terminalName}</span>
                    <span className="text-slate-500 font-mono">₱{term.netSales.toLocaleString()} ({term.transactionCount} txns)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {readingData.terminals.length === 0 && (
              <div className="text-center text-slate-400 py-4 text-sm">No terminal data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-100">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800">Cashier Breakdown</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Sales performance per cashier</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            {readingData.cashiers.map((cashier, idx) => {
              const percentage = (cashier.netSales / maxCashierSales) * 100;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{cashier.cashierName}</span>
                    <span className="text-slate-500 font-mono">₱{cashier.netSales.toLocaleString()} ({cashier.transactionCount} txns)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {readingData.cashiers.length === 0 && (
              <div className="text-center text-slate-400 py-4 text-sm">No cashier data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
