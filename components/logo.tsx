import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Package2 } from 'lucide-react';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)}>
      <Package2 className="h-6 w-6" />
      <span className="">StockPilot</span>
    </Link>
  );
}
