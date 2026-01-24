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
// import { Logo } from "@/components/logo"; // Removed to avoid text overlap

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
  if (!order) return null;

  const handlePrint = () => {
    // OLD METHOD: window.print();
    
    // NEW METHOD: Open a popup window with isolated content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order #${order.referenceNumber || order.id.substring(0,8)}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18pt; font-weight: bold; }
          .header p { margin: 0; font-size: 10pt; }
          
          .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10pt; }
          .info-col p { margin: 2px 0; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
          th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
          th { background-color: #f0f0f0; -webkit-print-color-adjust: exact; font-weight: bold; }
          .text-right { text-align: right; }
          
          .totals { margin-left: auto; width: 200px; font-size: 10pt; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .totals-row.bordered { border-bottom: 1px dashed #999; }
          .totals-row.final { border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 4px; }
          .totals-row.grand { font-weight: bold; font-size: 11pt; }
          
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 10pt; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-top: 1px solid #000; padding-top: 5px; }
          
          .generated { margin-top: 30px; text-align: center; font-size: 8pt; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
            <h1>PURCHASE ORDER</h1>
            <p>StockPilot Inc.</p>
        </div>
        
        <div class="info-row">
            <div class="info-col">
                <p><strong>Supplier:</strong></p>
                <p>${order.supplierName}</p>
                <p>ID: ${order.supplierId.substring(0,8)}</p>
            </div>
            <div class="info-col" style="text-align: right;">
                <p><strong>PO #:</strong> ${order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</p>
                <p><strong>Date:</strong> ${format(new Date(order.date), "MMM dd, yyyy")}</p>
                <p><strong>Status:</strong> ${order.status}</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 50%">Description</th>
                    <th class="text-right" style="width: 10%">Price</th>
                    <th class="text-right" style="width: 10%">Qty</th>
                    <th class="text-right" style="width: 15%">Total</th>
                    <th class="text-right" style="width: 15%">Recv</th>
                </tr>
            </thead>
            <tbody>
                ${order.items.map(item => `
                    <tr>
                        <td>
                            <div style="font-weight: bold; font-size: 10pt;">${item.productName}</div>
                            <div style="font-size: 8pt; color: #666;">
                                ${item.barcode || '-'} <span style="margin-left:8px;">Stock: ${item.currentStock || 0}</span>
                            </div>
                        </td>
                        <td class="text-right">₱${item.cost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">₱${(item.cost * item.quantity).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="text-right">${
                            order.status === 'Received' || order.status === 'Paid' ? item.quantity : 
                            (order.status === 'Approved' ? '0' : '-')
                        }</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="totals-row bordered">
                <span>Subtotal:</span>
                <span>₱${order.items.reduce((acc, item) => acc + item.cost * item.quantity, 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div class="totals-row bordered">
                <span>Shipping:</span>
                <span>₱${(order.shippingFee || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
             <div class="totals-row final">
                <span>VAT:</span>
                <span>₱${(order.vatAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
             <div class="totals-row grand">
                <span>Total:</span>
                <span>₱${order.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
        </div>
        
        <div class="footer">
            <div class="signature-box">
                <div class="signature-line">Authorized By</div>
            </div>
             <div class="signature-box">
                <div class="signature-line">Received By</div>
            </div>
        </div>
        
        <div class="generated">Generated by StockPilot on ${format(new Date(), "PPpp")}</div>
        
        <script>
            window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Styles removed - printing handled via popup window */}
      <DialogContent className="max-w-6xl p-0 overflow-hidden printable-dialog-content bg-zinc-50/50 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 bg-white border-b non-printable flex-shrink-0">
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
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">StockPilot Inc.</h2>
                    <div className="text-muted-foreground space-y-0.5 text-xs">
                        <p>123 Business Avenue, Tech District</p>
                        <p>Quezon City, Philippines 1100</p>
                        <p>contact@stockpilot.app • +63 900 000 0000</p>
                    </div>
                </div>
            </div>
            <div className="text-right space-y-2">
                <h1 className="text-4xl font-black text-zinc-900 tracking-tighter/5">PURCHASE ORDER</h1>
                <p className="text-lg font-medium text-muted-foreground">#{order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-12">
             
             {/* Supplier */}
             <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Building2 className="size-3" /> Supplier
                </h3>
                <div className="space-y-1 border-l-2 pl-3 border-primary/20">
                    <p className="font-bold text-base">{order.supplierName}</p>
                    <p className="text-muted-foreground">Supplier ID: {order.supplierId.substring(0,8)}</p>
                    {/* Placeholder address if not in type */}
                    <p className="text-muted-foreground">Manila, Philippines</p> 
                </div>
             </div>

             {/* Ship To */}
             <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="size-3" /> Ship To
                </h3>
                 <div className="space-y-1 border-l-2 pl-3 border-zinc-200">
                    <p className="font-bold text-base">{order.orderedBy || "Main Warehouse"}</p>
                    <p className="text-muted-foreground">Purok sto. Nino, Bunao</p>
                    <p className="text-muted-foreground">Quezon City</p>
                </div>
             </div>

             {/* Details */}
             <div className="bg-zinc-50 p-4 rounded-lg space-y-3 border">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3" /> Issue Date</span>
                    <span className="font-medium">{format(new Date(order.date), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3" /> Delivery Date</span>
                    <span className="font-medium">{order.deliveryDate ? format(new Date(order.deliveryDate), "MMM dd, yyyy") : "-"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="size-3" /> Terms</span>
                    <span className="font-medium">{order.paymentMethod || "Net 30"}</span>
                </div>
             </div>
          </div>

          {/* Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-100/80">
                <TableRow>
                  <TableHead className="font-semibold text-zinc-700">Product Description</TableHead>
                  <TableHead className="text-right font-semibold text-zinc-700 w-[120px]">Price</TableHead>
                  <TableHead className="text-right font-semibold text-zinc-700 w-[100px]">Qty</TableHead>
                  <TableHead className="text-right font-semibold text-zinc-700 w-[120px]">Total</TableHead>
                  <TableHead className="text-right font-semibold text-zinc-700 w-[120px] bg-primary/5">Qty Recv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-zinc-50">
                    <TableCell>
                        <div className="flex flex-col">
                             <span className="font-medium text-sm">{item.productName}</span>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                 <span className="font-mono">{item.barcode || '-'}</span>
                                 <span className={(item.currentStock || 0) <= 0 ? 'text-destructive font-bold' : ''}>
                                     Stock: {item.currentStock || 0}
                                 </span>
                             </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">₱{item.cost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="text-right">{item.quantity} <span className="text-xs text-muted-foreground">pc</span></TableCell>
                    <TableCell className="text-right font-medium">₱{(item.cost * item.quantity).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                     {/* "Quantity Received" column as requested. 
                         Logic: If status is 'Received', show quantity (assuming full). 
                         If status is 'Partially Received', we'd need a field.
                         For now we don't have per-item received tracking in the type, so we'll show '-' or match Qty if closed.
                      */}
                    <TableCell className="text-right bg-primary/5 font-medium">
                        {order.status === 'Received' || order.status === 'Paid' ? item.quantity : 
                         (order.status === 'Approved' ? '0' : '-')}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Minimum Rows Filler */}
                {Array.from({ length: Math.max(0, 5 - order.items.length) }).map((_, i) => (
                    <TableRow key={`empty-${i}`} className="hover:bg-transparent">
                        <TableCell colSpan={5} className="h-12"></TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-2 gap-12 pt-4">
             <div className="bg-zinc-50 p-6 rounded-lg border h-fit space-y-4">
                 <p className="text-xs font-semibold text-muted-foreground uppercase">Notes / Instructions</p>
                 <p className="text-sm text-muted-foreground italic">
                    Please ensure all items are sealed and in good condition upon delivery.
                    Call ahead 24 hours before delivery.
                 </p>
             </div>

             <div className="space-y-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span>Subtotal</span>
                        <span>₱{order.items.reduce((acc, item) => acc + item.cost * item.quantity, 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                     <div className="flex justify-between items-center text-muted-foreground">
                        <span>Shipping Fee</span>
                        <span>₱{(order.shippingFee || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                     <div className="flex justify-between items-center text-muted-foreground">
                        <span>VAT (12%)</span>
                        <span>₱{(order.vatAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center text-xl font-bold bg-primary/5 p-3 rounded text-primary">
                        <span>Grand Total</span>
                        <span>₱{order.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="pt-12 grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                         <div className="border-b-2 border-zinc-200 h-8"></div>
                         <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">Approved By</p>
                     </div>
                     <div className="space-y-2">
                         <div className="border-b-2 border-zinc-200 h-8"></div>
                         <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">Received By</p>
                     </div>
                </div>
             </div>
          </div>
        </div>

        {/* 2. Print Content is now handled via Popup Window (handlePrint) */}

        <DialogFooter className="p-4 border-t bg-muted/20 non-printable flex justify-between sm:justify-between items-center">
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
