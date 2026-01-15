'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mockProducts } from '@/lib/data';
import { Product, SerialNumber } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertCircle, ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Mock serial data
const mockSerialNumbers: SerialNumber[] = [
  // Nike Shoes Serials
  {
    id: 'NK-123456789',
    productId: '2',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'NK-987654321',
    productId: '2',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'NK-111222333',
    productId: '2',
    status: 'Sold',
    dateAdded: new Date(Date.now() - 5 * 86400000).toISOString(),
    saleId: 'sale-2',
  },
  {
    id: 'NK-444555666',
    productId: '2',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // Dell Laptop Serials
  {
    id: 'DL-777888999',
    productId: '5',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'DL-000111222',
    productId: '5',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'DL-333444555',
    productId: '5',
    status: 'Sold',
    dateAdded: new Date(Date.now() - 7 * 86400000).toISOString(),
    saleId: 'sale-1',
  },
];

function AddSerialNumberDialog({ product }: { product: Product }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [baseSerial, setBaseSerial] = useState('');

  const handleAddBatchSerials = async () => {
    if (quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid quantity.',
        description: 'Quantity must be greater than 0.',
      });
      return;
    }

    if (!baseSerial.trim()) {
      toast({
        variant: 'destructive',
        title: 'Base serial number cannot be empty.',
        description: 'Please provide a base serial number pattern.',
      });
      return;
    }

    // Check for potential duplicates
    const existingSerials = mockSerialNumbers.filter(s => s.productId === product.id).map(s => s.id);
    const newSerials = [];
    const duplicates = [];

    for (let i = 0; i < quantity; i++) {
      const serialId = `${baseSerial}-${String(i + 1).padStart(3, '0')}`;
      if (existingSerials.includes(serialId)) {
        duplicates.push(serialId);
      } else {
        newSerials.push(serialId);
      }
    }

    if (duplicates.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Duplicate serial numbers found.',
        description: `The following serial numbers already exist: ${duplicates.join(', ')}`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock add batch
      const addedSerials = newSerials.map(serialId => ({
        id: serialId,
        productId: product.id,
        status: 'In Stock' as const,
        dateAdded: new Date().toISOString(),
      }));

      mockSerialNumbers.push(...addedSerials);

      toast({
        title: 'Serial Numbers Added',
        description: `Added ${quantity} serial numbers starting with ${baseSerial}.`,
      });
      setBaseSerial('');
      setQuantity(1);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error adding serial numbers:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add serial numbers',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSingleSerial = async () => {
    if (!serialNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Serial number cannot be empty.',
      });
      return;
    }

    // Check for duplicate
    if (mockSerialNumbers.some(s => s.id === serialNumber && s.productId === product.id)) {
      toast({
        variant: 'destructive',
        title: 'Serial number already exists.',
        description: `Serial "${serialNumber}" already exists for this product.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock add
      mockSerialNumbers.push({
        id: serialNumber,
        productId: product.id,
        status: 'In Stock',
        dateAdded: new Date().toISOString(),
      });

      toast({
        title: 'Serial Number Added',
        description: `Serial "${serialNumber}" has been added.`,
      });
      setSerialNumber('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error adding serial number:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add serial number',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

const [mode, setMode] = useState<'single' | 'batch'>('single');

  useEffect(() => {
    if (isOpen) {
      setMode('single');
      setSerialNumber('');
      setBaseSerial('');
      setQuantity(1);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Serial Number
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Serial Numbers for {product.name}</DialogTitle>
          <DialogDescription>
            Add individual serial numbers or generate multiple serial numbers in batch.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('single')}
            className="flex-1"
          >
            Single Serial
          </Button>
          <Button
            variant={mode === 'batch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('batch')}
            className="flex-1"
          >
            Batch Serials
          </Button>
        </div>

        {/* Single Serial Mode */}
        {mode === 'single' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serial" className="text-right">
                Serial Number
              </Label>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="col-span-3"
                placeholder="e.g., SN-123456789"
              />
            </div>
          </div>
        )}

        {/* Batch Serial Mode */}
        {mode === 'batch' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseSerial" className="text-right">
                Base Serial
              </Label>
              <Input
                id="baseSerial"
                value={baseSerial}
                onChange={(e) => setBaseSerial(e.target.value)}
                className="col-span-3"
                placeholder="e.g., SN-001"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="col-span-3"
                placeholder="e.g., 10"
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              <p className="font-medium mb-1">Preview:</p>
              <p>This will generate serial numbers like:</p>
              <p className="font-mono">
                {baseSerial ? `${baseSerial}-001, ${baseSerial}-002, ..., ${baseSerial}-${String(quantity).padStart(3, '0')}` : 'Enter base serial first'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={mode === 'single' ? handleAddSingleSerial : handleAddBatchSerials}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : mode === 'single' ? (
              'Add Serial'
            ) : (
              `Add ${quantity} Serials`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SerialNumberRow({ serial, productId }: { serial: SerialNumber, productId: string }) {
    const { toast } = useToast();

  const getStatusVariant = (status: SerialNumber['status']) => {
    switch (status) {
      case 'In Stock':
        return 'default';
      case 'Sold':
        return 'secondary';
      case 'Returned':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete serial number "${serial.id}"? This action cannot be undone and may affect your stock count.`)) {
        return;
    }

    try {
      // Remove from mock array
      const index = mockSerialNumbers.findIndex(s => s.id === serial.id && s.productId === productId);
      if (index !== -1) {
        mockSerialNumbers.splice(index, 1);
      }

        toast({
            title: "Serial Number Deleted",
            description: `Serial number "${serial.id}" has been removed.`
        });
    } catch (error: any) {
        console.error("Error deleting serial number:", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error.message || "Could not delete the serial number."
        });
    }
  }

  return (
    <TableRow>
      <TableCell className="font-mono">{serial.id}</TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(serial.status)}>{serial.status}</Badge>
      </TableCell>
      <TableCell>{format(new Date(serial.dateAdded), 'PP p')}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={serial.status === 'Sold'}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SerialSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
        </TableRow>
    )
}

export default function SerialNumbersPage() {
  const params = useParams();
  const productId = params.productId as string;

  const product = mockProducts.find(p => p.id === productId);
  const serialNumbers = mockSerialNumbers.filter((s: SerialNumber) => s.productId === productId);
  const isLoading = false;

  const inStockCount = serialNumbers.filter((s: SerialNumber) => s.status === 'In Stock').length || 0;
  const stockMismatch = product && product.stock !== inStockCount;

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The product you are looking for does not exist.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/inventory">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <CardTitle>Manage Serials for {product.name}</CardTitle>
                </div>
                <CardDescription>
                Add, view, and manage unique serial numbers for this product.
                Current Stock: <Badge variant="outline">{product.stock}</Badge>.
                In-Stock Serials: <Badge variant="outline">{inStockCount}</Badge>.
                </CardDescription>
            </div>
            <AddSerialNumberDialog product={product} />
        </div>
      </CardHeader>
      <CardContent>
        {stockMismatch && (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stock Count Mismatch!</AlertTitle>
                <AlertDescription>
                    The total stock quantity ({product.stock}) does not match the number of "In Stock" serial numbers ({inStockCount}). Please review your serials or perform a stock adjustment.
                </AlertDescription>
            </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead><span className='sr-only'>Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serialNumbers && serialNumbers.length > 0 ? (
              serialNumbers.map((serial) => (
                <SerialNumberRow key={serial.id} serial={serial} productId={product.id} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No serial numbers have been added for this product yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          A total of {serialNumbers?.length || 0} serial numbers recorded for this product.
        </div>
      </CardFooter>
    </Card>
  );
}
