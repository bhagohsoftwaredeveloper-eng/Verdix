'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { calculatePurchaseCosts } from '@/lib/purchase-utils';
import { toSafeNumber } from '@/lib/utils';
import { type PurchaseOrder } from '@/lib/types';
import { type ReceivePurchaseOrderController } from './use-receive-purchase-order';

interface ReceiveItemsTableProps {
  order: PurchaseOrder;
  controller: ReceivePurchaseOrderController;
}

export function ReceiveItemsTable({ order, controller }: ReceiveItemsTableProps) {
  const {
    quantities,
    badItems,
    expiryDates,
    allocationStrategy,
    handleQuantityChange,
    handleExpiryDateChange,
    handleBadQtyChange,
    handleBadReasonChange,
    handleBadDescriptionChange,
  } = controller;

  const calculations = calculatePurchaseCosts(
    order.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      cost: i.cost,
      discount: i.discount || 0,
      discountType: (i.discountType as any) || 'amount',
      vatSubject: i.vatSubject,
    })),
    order.shippingFee || 0,
    12,
    allocationStrategy,
  );

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Product</TableHead>
            <TableHead className="text-right w-[80px]">Ordered</TableHead>
            <TableHead className="text-right w-[100px]">Cost</TableHead>
            <TableHead className="text-right w-[100px]">
              <div className="flex items-center justify-end gap-1">
                Landed Cost
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Landed Cost includes the shipping fee allocation. This will be the new inventory cost for this item.
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className="text-right w-[100px]">Good Qty</TableHead>
            <TableHead className="w-[130px]">Expiry Date</TableHead>
            <TableHead className="text-right w-[100px]">Bad Qty</TableHead>
            <TableHead className="w-[120px]">Reason</TableHead>
            <TableHead>Issue Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => {
            const calculated = calculations.items.find((ci) => ci.productId === item.productId);
            const landedCost = calculated?.landedCostPerUnit || item.cost;

            return (
              <TableRow key={item.productId}>
                <TableCell>
                  <div className="font-medium text-xs truncate max-w-[170px]" title={item.productName}>
                    {item.productName}
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  ₱{toSafeNumber(item.cost).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-xs font-bold text-primary">
                  ₱{toSafeNumber(landedCost).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="text-right h-8 text-xs"
                    value={quantities[item.productId] ?? ''}
                    onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={expiryDates[item.productId] || ''}
                    onChange={(e) => handleExpiryDateChange(item.productId, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="text-right h-8 text-xs border-destructive/50 focus-visible:ring-destructive"
                    value={badItems[item.productId]?.quantity || ''}
                    onChange={(e) => handleBadQtyChange(item.productId, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={badItems[item.productId]?.reason || 'Damaged'}
                    onValueChange={(val) => handleBadReasonChange(item.productId, val)}
                    disabled={!(badItems[item.productId]?.quantity > 0)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Defective">Defective</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                      <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                      <SelectItem value="Missing">Missing</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Optional notes..."
                    className="h-8 text-xs"
                    value={badItems[item.productId]?.description || ''}
                    onChange={(e) => handleBadDescriptionChange(item.productId, e.target.value)}
                    disabled={!(badItems[item.productId]?.quantity > 0)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
