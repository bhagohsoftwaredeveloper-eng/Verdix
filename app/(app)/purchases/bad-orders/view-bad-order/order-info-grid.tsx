'use client';

import { format } from 'date-fns';

interface OrderInfoGridProps {
  badOrder: any;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export function OrderInfoGrid({ badOrder }: OrderInfoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
      <InfoItem label="Bad Order ID" value={badOrder.id} />
      <InfoItem label="Purchase Order" value={badOrder.purchaseOrderId || '-'} />
      <InfoItem label="Supplier" value={badOrder.supplierName || '-'} />
      <InfoItem label="Report Date" value={format(new Date(badOrder.reportDate), 'PPP')} />
      <InfoItem label="Reported By" value={badOrder.reportedBy || '-'} />
      <InfoItem label="Warehouse" value={badOrder.warehouseName || '-'} />
      <InfoItem label="Shelf / Area" value={badOrder.shelfName || '-'} />
      <InfoItem
        label="Total Affected Value"
        value={
          <span className="text-destructive">
            ₱{badOrder.totalAffectedValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        }
      />
    </div>
  );
}
