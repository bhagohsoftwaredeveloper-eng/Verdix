import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurchaseOrder } from "@/lib/types";
import { format } from "date-fns";
import { Printer, Building2, MapPin, Calendar, CreditCard, Box, Package2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useProducts, useBusinessProfile } from "@/hooks/use-api";
import { calculatePurchaseCosts } from "@/lib/purchase-utils";
// import { Logo } from "@/components/logo"; // Removed to avoid text overlap
import { formatQuantity } from "@/lib/utils";

import { printPurchaseOrder } from "./purchase-order-print-utils";

interface ViewPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
}

export function ViewPurchaseOrderDialog({
  open,
  onOpenChange,
  order,
}: ViewPurchaseOrderDialogProps) {
  const { products } = useProducts();
  const { profile } = useBusinessProfile();

  if (!order) return null;

  const handlePrint = () => {
    printPurchaseOrder(order, profile, products);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Styles removed - printing handled via popup window */}
      <DialogContent className="sm:max-w-none max-w-full w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none m-0 shadow-none printable-dialog-content">
        <DialogHeader className="px-6 py-4 border-b bg-white non-printable shrink-0">
          <div className="flex items-center justify-between pr-8">
             <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Package2 className="size-6 text-primary" />
                Purchase Order Details
             </DialogTitle>
             <div className="flex items-center gap-2">
                <Badge variant={
                    order.status === 'Received' || order.status === 'Paid' ? 'default' : 
                    order.status === 'Voided' ? 'destructive' : 'secondary'
                } className="text-sm uppercase px-3 py-1">
                    {order.status}
                </Badge>
             </div>
          </div>
          <DialogDescription className="screen-only">
            Detailed view of purchase order {order.referenceNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-8 bg-white text-sm overflow-y-auto flex-1" id="printable-order-content">
          
          {/* Top Branding Section */}
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
                {/* Placeholder for Company Logo if existing */}
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Building2 className="size-8" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{profile?.businessName || 'verdix Inc.'}</h2>
                    <div className="text-zinc-700 space-y-0.5 text-xs">
                        <p>{profile?.address || '123 Business Avenue, Tech District'}</p>
                        <p>{profile?.contactNumber || '+63 900 000 0000'} • {profile?.email || 'contact@verdix.app'}</p>
                    </div>
                </div>
            </div>
            <div className="text-right space-y-2">
                <h1 className="text-4xl font-black text-zinc-950 tracking-tighter/5">PURCHASE ORDER</h1>
                <p className="text-lg font-bold text-zinc-700">#{order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-12">
             
             {/* Supplier */}
             <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                    <Building2 className="size-3" /> Supplier
                </h3>
                <div className="space-y-1 border-l-2 pl-3 border-primary/40">
                    <p className="font-bold text-base text-zinc-900">{order.supplierName}</p>
                    <p className="text-zinc-700">Supplier ID: {order.supplierId.substring(0,8)}</p>
                    {/* Placeholder address if not in type */}
                    <p className="text-zinc-700 font-medium">Manila, Philippines</p> 
                </div>
             </div>

             {/* Ship To */}
             <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                    <MapPin className="size-3" /> Ship To
                </h3>
                 <div className="space-y-1 border-l-2 pl-3 border-zinc-400">
                    <p className="font-bold text-base text-zinc-900">{order.orderedBy || "Main Warehouse"}</p>
                    <p className="text-zinc-700">Purok sto. Nino, Bunao</p>
                    <p className="text-zinc-700">Quezon City</p>
                </div>
             </div>

             {/* Details */}
             <div className="bg-zinc-100 p-4 rounded-lg space-y-3 border border-zinc-300">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-700 font-bold flex items-center gap-1.5"><Calendar className="size-3" /> Issue Date</span>
                    <span className="font-bold text-zinc-900">{format(new Date(order.date), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-700 font-bold flex items-center gap-1.5"><Calendar className="size-3" /> Delivery Date</span>
                    <span className="font-bold text-zinc-900">{order.deliveryDate ? format(new Date(order.deliveryDate), "MMM dd, yyyy") : "-"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-700 font-bold flex items-center gap-1.5"><CreditCard className="size-3" /> Terms</span>
                    <span className="font-bold text-zinc-900">{order.paymentMethod || "Net 30"}</span>
                </div>
             </div>
          </div>

          {/* Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-100/80">
                <TableRow>
                  <TableHead className="font-bold text-zinc-900">Product Description</TableHead>
                  <TableHead className="text-center font-bold text-zinc-900 w-[100px]">Remaining QTY</TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 w-[120px]">Base Cost</TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 w-[100px]">Qty</TableHead>
                  <TableHead className="text-right font-bold text-zinc-800 w-[120px] italic">Landed Cost</TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 w-[120px]">Total</TableHead>
                  <TableHead className="text-right font-bold text-zinc-900 w-[120px] bg-primary/10">Qty Recv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  const currentStock = product ? product.stock : (item.currentStock || 0);

                  return (
                  <TableRow key={index} className="hover:bg-zinc-50 border-zinc-300">
                    <TableCell>
                        <div className="flex flex-col">
                             <span className="font-bold text-sm text-zinc-900">{item.productName}</span>
                             <div className="flex items-center gap-2 text-xs text-zinc-700">
                                 <span className="font-mono font-bold">{item.barcode || '-'}</span>
                             </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-center text-zinc-900 font-bold">
                        <span className={currentStock <= 0 ? 'text-destructive font-black' : ''}>
                            {formatQuantity(currentStock)}
                        </span>
                    </TableCell>
                    <TableCell className="text-right text-zinc-900 font-bold">₱{item.cost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="text-right text-zinc-900 font-bold">{formatQuantity(item.quantity)} <span className="text-xs text-zinc-700">pc</span></TableCell>
                    <TableCell className="text-right italic text-zinc-800 bg-zinc-100/50 font-mono text-xs font-bold border-l border-zinc-200">
                        ₱{(() => {
                            const results = calculatePurchaseCosts(order.items as any, order.shippingFee || 0);
                            return (results.items[index]?.landedCostPerUnit || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        })()}
                    </TableCell>
                    <TableCell className="text-right font-black text-zinc-950">₱{(item.cost * item.quantity).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="text-right bg-primary/10 font-black text-zinc-950">
                        {order.status === 'Received' || order.status === 'Paid' ? item.quantity : 
                         (order.status === 'Approved' ? '0' : '-')}
                    </TableCell>
                  </TableRow>
                  );
                })}
                {/* Minimum Rows Filler */}
                {Array.from({ length: Math.max(0, 5 - order.items.length) }).map((_, i) => (
                    <TableRow key={`empty-${i}`} className="hover:bg-transparent">
                        <TableCell colSpan={6} className="h-12"></TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-2 gap-12 pt-4">
             <div className="bg-zinc-100 p-6 rounded-lg border border-zinc-300 h-fit space-y-4">
                 <p className="text-xs font-bold text-zinc-900 uppercase">Notes / Instructions</p>
                 <p className="text-sm text-zinc-800 italic font-medium">
                    Please ensure all items are sealed and in good condition upon delivery.
                    Call ahead 24 hours before delivery.
                 </p>
             </div>

             <div className="space-y-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-zinc-700">
                        <span>Subtotal</span>
                        <span className="font-bold text-zinc-900">₱{order.items.reduce((acc, item) => acc + item.cost * item.quantity, 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                     <div className="flex justify-between items-center text-zinc-700">
                        <span>Shipping Fee</span>
                        <span className="font-bold text-zinc-900">₱{(order.shippingFee || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                     <div className="flex justify-between items-center text-zinc-700">
                        <span>VAT (12%)</span>
                        <span className="font-bold text-zinc-900">₱{(order.vatAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <Separator className="my-2 bg-zinc-400" />
                    <div className="flex justify-between items-center text-xl font-black bg-zinc-900 p-3 rounded text-white mt-4">
                        <span>Grand Total</span>
                        <span>₱{order.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="pt-12 grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                         <div className="border-b-2 border-zinc-400 h-8"></div>
                         <p className="text-xs text-center text-zinc-900 font-bold uppercase tracking-wide">Approved By</p>
                     </div>
                     <div className="space-y-2">
                         <div className="border-b-2 border-zinc-400 h-8"></div>
                         <p className="text-xs text-center text-zinc-900 font-bold uppercase tracking-wide">Received By</p>
                     </div>
                </div>
             </div>
          </div>
        </div>

        {/* 2. Print Content is now handled via Popup Window (handlePrint) */}

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 non-printable flex-row justify-between items-center shrink-0">
          <div className="text-xs text-muted-foreground">
             Use <kbd className="border rounded px-1 bg-white">Ctrl+P</kbd> to print this view.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print Purchase Order
            </Button>
            <Button onClick={() => onOpenChange(false)}>
                Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
