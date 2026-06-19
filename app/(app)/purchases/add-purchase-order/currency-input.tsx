'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function CurrencyInput({ value, onChange, className, ...props }: any) {
  const [isFocused, setIsFocused] = useState(false);

  const format = (val: any) => {
    if (val === '' || val === undefined || val === null) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Input
      type="text"
      className={className}
      value={isFocused ? value : format(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        if ((raw.match(/\./g) || []).length > 1) return;
        onChange(raw);
      }}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
}
