'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format as formatFns } from 'date-fns';
import { PurchaseOrder, SystemSettings } from '@/lib/types';
import { toSafeNumber } from '@/lib/utils';
import { PurchaseOrderActions } from './purchase-order-actions';

function statusVariant(status: string) {
  switch (status) {
    case 'Paid':
    case 'Received':
      return 'success';
    case 'Draft':
    case 'Pending':
      return 'secondary';
    case 'Approved':
    case 'Shipped':
      return 'default';
    case 'Failed':
    case 'Cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

interface PurchaseOrderRowProps {
  order: PurchaseOrder;
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  onReceive: (order: PurchaseOrder) => void;
  onPrint: (order: PurchaseOrder) => void;
  onReorder: (order: PurchaseOrder) => void;
  onEdit: (order: PurchaseOrder) => void;
  onViewDetails: (order: PurchaseOrder) => void;
  settings?: SystemSettings | null;
}

export function PurchaseOrderRow({
  order,
  onUpdateOrder,
  onReceive,
  onPrint,
  onReorder,
  onEdit,
  onViewDetails,
  settings,
}: PurchaseOrderRowProps) {
  const itemsSubtotal = order.items.reduce(
    (acc, item) => acc + toSafeNumber(item.cost) * toSafeNumber(item.quantity),
    0,
  );

  return (
    <TableRow className="hover:bg-muted/50 transition-colors text-xs group">
      <TableCell className="w-8 p-1" />
      <TableCell className="px-2 py-1 font-medium text-primary whitespace-nowrap">
        {order.referenceNumber || order.id.substring(0, 8).toUpperCase()}
      </TableCell>
      <TableCell className="px-2 py-1 whitespace-nowrap">{order.orderedBy || '-'}</TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">
        ₱{itemsSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">
        ₱{(order.shippingFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">
        ₱{(order.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="px-2 py-1 text-right font-bold whitespace-nowrap">
        ₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">
        ₱{(order.receivedTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="px-2 py-1 max-w-[150px] truncate" title={order.supplierName}>
        {order.supplierName}
      </TableCell>
      <TableCell className="px-2 py-1 whitespace-nowrap">
        {formatFns(new Date(order.date), 'MMM dd, yyyy')}
      </TableCell>
      <TableCell className="px-2 py-1 whitespace-nowrap">
        {order.deliveryDate ? formatFns(new Date(order.deliveryDate), 'MMM dd, yyyy') : '-'}
      </TableCell>
      <TableCell className="px-2 py-1 text-center">
        <Badge
          variant={statusVariant(order.status) as any}
          className="rounded-sm uppercase text-[9px] px-1.5 py-0 min-w-[70px] justify-center h-5"
        >
          {order.status}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-1 text-right">
        <PurchaseOrderActions
          order={order}
          onUpdateOrder={onUpdateOrder}
          onReceive={onReceive}
          onPrint={() => onPrint(order)}
          onViewDetails={() => onViewDetails(order)}
          onReorder={onReorder}
          onEdit={onEdit}
          settings={settings}
        />
      </TableCell>
    </TableRow>
  );
}
