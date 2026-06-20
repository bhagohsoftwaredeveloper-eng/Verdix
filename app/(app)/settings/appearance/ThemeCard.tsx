'use client';

import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';

interface ThemeCardProps {
  value: string;
  currentValue: string | undefined;
  label: string;
  htmlFor: string;
  variant: 'light' | 'dark';
}

export function ThemeCard({ value, currentValue, label, htmlFor, variant }: ThemeCardProps) {
  const isSelected = currentValue === value;

  const preview = variant === 'light' ? (
    <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
      <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
        <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
      </div>
      <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
      </div>
      <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
      </div>
    </div>
  ) : (
    <div className="space-y-2 rounded-sm bg-slate-950 p-2">
      <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
      </div>
      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
        <div className="h-4 w-4 rounded-full bg-slate-400" />
        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
      </div>
      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
        <div className="h-4 w-4 rounded-full bg-slate-400" />
        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
      </div>
    </div>
  );

  return (
    <div className="text-center">
      <Label className="cursor-pointer" htmlFor={htmlFor}>
        <div className={`items-center rounded-md border-2 p-1 hover:border-accent ${isSelected ? 'border-primary' : 'border-muted'}`}>
          {preview}
        </div>
        <div className="flex items-center justify-center p-2 font-medium">
          <span className="mr-2">{label}</span>
          <RadioGroupItem value={value} id={htmlFor} className="sr-only" />
        </div>
      </Label>
    </div>
  );
}
