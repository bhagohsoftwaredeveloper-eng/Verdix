
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
import { ChevronRight, Search, Loader2 } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { TerminalSelector } from '@/components/TerminalSelector';

interface SaleRowProps {
    sale: Sale;
}

function SaleRow({ sale }: SaleRowProps) {
  const statusVariant = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Failed':
        return 'destructive';
      case 'Voided':
        return 'destructive'; // Assuming Voided maps to destructive
      case 'Returned':
        return 'outline';   // Distinct style for returns
      default:
        return 'secondary';
    }
  };
  
  const displayDate = sale.invoiceDate || sale.date || new Date().toISOString();

  return (
    <Collapsible asChild>
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
                                {sale.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.product.name}</TableCell>
                                        <TableCell>{(item.product as any).sku || '-'}</TableCell>
                                        <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
  const [terminalId, setTerminalId] = useState<string>('all');

  useEffect(() => {
    const fetchSales = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (terminalId && terminalId !== 'all') {
                params.append('terminalId', terminalId);
            }
            // Fetch logic
            const response = await fetch(`/api/sales/transactions?${params.toString()}`);
            const result = await response.json();
            if (result.success) {
                setSales(result.data);
            } else {
                console.error("Failed to fetch sales:", result.error);
            }
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchSales();
  }, [terminalId]);

  const filteredSales = sales.filter(sale => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      sale.id.toLowerCase().includes(term) ||
      sale.customer.name.toLowerCase().includes(term) ||
      (sale.customer.contactNumber && sale.customer.contactNumber.toLowerCase().includes(term))
    );
  });

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
          <div className="flex gap-2">
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
            <TerminalSelector 
                terminalId={terminalId}
                onTerminalChange={setTerminalId}
                showAllOption={true}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
          
            {isLoading ? (
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                            <div className="flex justify-center items-center">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading sales data...
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            ) : filteredSales.length > 0 ? (
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
      </CardContent>
    </Card>
  );
}