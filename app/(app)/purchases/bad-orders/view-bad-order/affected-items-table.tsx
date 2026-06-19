'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatQuantity } from '@/lib/utils';

function reasonBadgeVariant(reason: string) {
  switch (reason) {
    case 'Damaged':
    case 'Defective':
      return 'destructive';
    case 'Expired':
      return 'secondary';
    case 'Wrong Item':
    case 'Missing':
      return 'default';
    default:
      return 'secondary';
  }
}

interface AffectedItemsTableProps {
  items: any[];
}

export function AffectedItemsTable({ items }: AffectedItemsTableProps) {
  return (
    <div>
      <Label className="text-sm font-medium">Affected Items</Label>
      <div className="mt-2 border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                <TableCell className="text-right">₱{item.cost.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">
                  ₱{(item.quantity * item.cost).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant={reasonBadgeVariant(item.reason) as any} className="text-xs">
                    {item.reason}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.description}>
                  {item.description || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
