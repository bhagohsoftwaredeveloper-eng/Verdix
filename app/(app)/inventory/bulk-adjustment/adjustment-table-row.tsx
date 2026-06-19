import { ArrowRight, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn, formatQuantity } from '@/lib/utils';

import { typeConfig, type AdjustmentItem } from './constants';

export function AdjustmentTableRow({
  adj,
  onUpdate,
  onRemove,
}: {
  adj: AdjustmentItem;
  onUpdate: (productId: string, updates: Partial<AdjustmentItem>) => void;
  onRemove: (productId: string) => void;
}) {
  const newStock = adj.type === 'remove' ? adj.product.stock - adj.quantity : adj.product.stock + adj.quantity;
  const isNegative = newStock < 0;
  const cfg = typeConfig[adj.type];
  const Icon = cfg.icon;

  return (
    <TableRow className="group hover:bg-slate-50/80 transition-colors border-b last:border-0">
      <TableCell className="py-4 pl-6">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm text-slate-900 group-hover:text-primary transition-colors">
            {adj.product.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{adj.product.barcode || adj.product.sku}</span>
            {adj.product.warehouseName && (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <WarehouseIcon className="h-3 w-3" />{adj.product.warehouseName}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge variant="outline" className={cn("gap-1 font-semibold text-xs px-2.5 py-1 rounded-lg border", cfg.color)}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </Badge>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2 w-36">
          <button
            className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
            onClick={() => onUpdate(adj.product.id, { quantity: Math.max(1, adj.quantity - 1) })}
          >−</button>
          <Input
            type="number"
            min="1"
            className="h-8 w-14 text-center font-bold text-sm border-slate-200 px-1"
            value={adj.quantity}
            onChange={e => onUpdate(adj.product.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <button
            className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
            onClick={() => onUpdate(adj.product.id, { quantity: adj.quantity + 1 })}
          >+</button>
        </div>
        <p className="text-[10px] text-slate-400 uppercase mt-1 pl-1">{adj.product.unitOfMeasure}</p>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-slate-500 tabular-nums">{formatQuantity(adj.product.stock)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          <span className={cn("text-sm font-bold tabular-nums", isNegative ? "text-red-600" : "text-emerald-600")}>
            {formatQuantity(newStock)}
          </span>
          {isNegative && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 ml-0.5">Low</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Input
          placeholder="Optional note..."
          className="h-8 text-xs border-slate-200 w-full min-w-[160px]"
          value={adj.reason}
          onChange={e => onUpdate(adj.product.id, { reason: e.target.value })}
        />
      </TableCell>
      <TableCell className="py-4 pr-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
          onClick={() => onRemove(adj.product.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
