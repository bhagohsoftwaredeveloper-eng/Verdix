
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search } from 'lucide-react';
import type { Sale, PosTransaction } from '@/lib/types';
import { Input } from '@/components/ui/input';

function SaleRow({ sale }: { sale: Sale }) {
  const [posTransaction, setPosTransaction] = useState<PosTransaction | null>(null);
  const [isLoadingPos, setIsLoadingPos] = useState(false);

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const displayDate = sale.invoiceDate || sale.date || new Date().toISOString().slice(0, 10);

  const fetchPosTransaction = async () => {
    if (posTransaction) return; // Already fetched

    setIsLoadingPos(true);
    try {
      const response = await fetch(`/api/pos-transactions?saleId=${sale.id}`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setPosTransaction(result.data[0]); // Get the first POS transaction for this sale
      }
    } catch (error) {
      console.error('Error fetching POS transaction:', error);
    } finally {
      setIsLoadingPos(false);
    }
  };

  return (
    <Collapsible asChild onOpenChange={(open) => open && fetchPosTransaction()}>
      <TableBody>
        <TableRow>
          <TableCell className="w-12">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="group">
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </Button>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell className="font-medium">{sale.id}</TableCell>
          <TableCell>
            <div className="font-medium">{sale.customer.name}</div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {sale.customer.contactNumber}
            </div>
          </TableCell>
          <TableCell className="hidden md:table-cell">
            {format(new Date(displayDate), 'PP')}
          </TableCell>
          <TableCell>
            <Badge variant={statusVariant(sale.status)}>{sale.status}</Badge>
          </TableCell>
          <TableCell className="text-right">
            ₱{sale.total.toFixed(2)}
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
            <tr className="bg-muted/50">
                <TableCell colSpan={6}>
                    <div className='p-4'>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 className='font-semibold mb-2'>Sale Items ({sale.items.length})</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className='text-right'>Price</TableHead>
                                            <TableHead className='text-right'>Quantity</TableHead>
                                            <TableHead className='text-right'>Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                     <TableBody>
                                        {sale.items.map(item => (
                                            <TableRow key={item.product.id}>
                                                <TableCell>{item.product.name}</TableCell>
                                                <TableCell>{item.product.sku}</TableCell>
                                                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div>
                                <h4 className='font-semibold mb-2'>POS Transaction Details</h4>
                                {isLoadingPos ? (
                                    <div className="text-sm text-muted-foreground">Loading POS data...</div>
                                ) : posTransaction ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">POS Transaction ID:</span>
                                            <span className="font-mono">{posTransaction.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Transaction Type:</span>
                                            <span>{posTransaction.transactionType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Method:</span>
                                            <span>{posTransaction.paymentMethod || sale.paymentMethod || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Transaction Date:</span>
                                            <span>{format(new Date(posTransaction.transactionTime), 'PPpp')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cashier:</span>
                                            <span>{posTransaction.user?.fullName || posTransaction.user?.username || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Terminal:</span>
                                            <span>{posTransaction.terminal?.name || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Shift:</span>
                                            <span>{posTransaction.shift ? `Shift ${posTransaction.shift.id}` : 'No Shift'}</span>
                                        </div>
                                        {posTransaction.notes && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Notes:</span>
                                                <span className="text-right max-w-32">{posTransaction.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        No POS transaction data available for this sale.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </TableCell>
            </tr>
        </CollapsibleContent>
      </TableBody>
    </Collapsible>
  );
}

export default function SalesDetailsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await fetch('/api/sales');
        const result = await response.json();
        if (result.success) {
          setSales(result.data);
        } else {
          console.error('Failed to fetch sales:', result.error);
        }
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSales();
  }, []);

  const filteredSales = sales?.filter(sale => {
    const term = searchTerm.toLowerCase();
    return (
      sale.id.toLowerCase().includes(term) ||
      sale.customer.name.toLowerCase().includes(term) ||
      sale.customer.contactNumber.toLowerCase().includes(term)
    );
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>POS Sales Detail</CardTitle>
            <CardDescription>
              A detailed breakdown of all POS sales transactions.
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by ID, customer..."
              className="pl-8 sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-muted-foreground">Loading sales data...</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><span className='sr-only'>Expand</span></TableHead>
                <TableHead>Sale ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>

            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <SaleRow key={sale.id} sale={sale} />
              ))
            ) : (
             <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No sales found.
                </TableCell>
              </TableRow>
              </TableBody>
            )}
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
