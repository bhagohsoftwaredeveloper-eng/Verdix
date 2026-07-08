import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DenominationInputProps {
  denom: { value: number; label: string };
  color: string;
  count: number | undefined;
  onCountChange: (value: number, count: string) => void;
}

export const DenominationInput = memo(({ denom, color, count, onCountChange }: DenominationInputProps) => {
  const subtotal = (count || 0) * denom.value;
  const displayBadge = denom.value >= 1 ? denom.value.toString() : denom.value.toFixed(2).substring(1);
  const hasCount = (count || 0) > 0;

  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-white dark:bg-slate-800/60 px-3 py-2 shadow-sm transition-all hover:shadow ${hasCount ? 'border-slate-300 ring-1 ring-slate-100 dark:border-slate-600 dark:ring-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className={`flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg border font-bold text-sm tabular-nums ${color}`}>
        {displayBadge}
      </div>
      <Label htmlFor={`denom-${denom.value}`} className="flex-1 min-w-0 truncate text-sm font-medium text-slate-500 dark:text-slate-300">
        {denom.label}
      </Label>
      <span className="text-slate-300 dark:text-slate-600 font-mono text-sm">×</span>
      <Input
        id={`denom-${denom.value}`}
        type="number"
        placeholder="0"
        value={count || ''}
        onChange={(e) => onCountChange(denom.value, e.target.value)}
        className="w-16 h-9 text-center font-mono font-semibold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        autoFocus={denom.value === 1000}
      />
      <div className={`w-24 text-right font-mono text-sm font-bold tabular-nums ${hasCount ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
        ₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(subtotal)}
      </div>
    </div>
  );
});

DenominationInput.displayName = 'DenominationInput';
