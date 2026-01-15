
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
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, writeBatch, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { Product, SerialNumber } from '@/lib/types';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertCircle, ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function AddSerialNumberDialog({ product }: { product: Product }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');

  const handleAddSerial = async () => {
    if (!serialNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Serial number cannot be empty.',
      });
      return;
    }
    if (!firestore) return;

    setIsSubmitting(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'products', product.id);
            const serialsCollectionRef = collection(firestore, `products/${product.id}/serials`);
            const newSerialRef = doc(serialsCollectionRef, serialNumber); // Use serial as ID

            // Check for duplicate serial number within the transaction
            const existingSerialDoc = await transaction.get(newSerialRef);
            if (existingSerialDoc.exists()) {
                 throw new Error(`Serial number "${serialNumber}" already exists for this product.`);
            }

            const productSnap = await transaction.get(productRef);
            if (!productSnap.exists()) {
                throw new Error("Product not found.");
            }
            const currentStock = productSnap.data().stock || 0;

            // All reads done. Now writes.
            transaction.set(newSerialRef, {
                id: serialNumber,
                productId: product.id,
                status: 'In Stock',
                dateAdded: new Date().toISOString(),
            });
            transaction.update(productRef, { stock: currentStock + 1 });
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Serial Number
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Serial Number for {product.name}</DialogTitle>
          <DialogDescription>
            Enter the unique serial number for a new unit of this product.
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddSerial} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : (
              'Add Serial'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SerialNumberRow({ serial, productId }: { serial: SerialNumber, productId: string }) {
    const firestore = useFirestore();
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
    if (!firestore) return;
    if (!confirm(`Are you sure you want to delete serial number "${serial.id}"? This action cannot be undone and may affect your stock count.`)) {
        return;
    }
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'products', productId);
            const serialRef = doc(firestore, `products/${productId}/serials`, serial.id);

            const productSnap = await transaction.get(productRef);
            if (!productSnap.exists()) {
                throw new Error("Product not found.");
            }
            const currentStock = productSnap.data().stock || 0;
            const newStock = serial.status === 'In Stock' ? Math.max(0, currentStock - 1) : currentStock;

            // All reads done. Now writes.
            transaction.delete(serialRef);
            if (serial.status === 'In Stock') {
                transaction.update(productRef, { stock: newStock });
            }
        });

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
  const firestore = useFirestore();

  const productRef = useMemoFirebase(
    () => (firestore && productId ? doc(firestore, 'products', productId) : null),
    [firestore, productId]
  );
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  const serialsRef = useMemoFirebase(
    () => (firestore && productId ? collection(firestore, `products/${productId}/serialNumbers`) : null),
    [firestore, productId]
  );
  const { data: serialNumbers, isLoading: isLoadingSerials } = useCollection<SerialNumber>(serialsRef);
  
  const inStockCount = serialNumbers?.filter(s => s.status === 'In Stock').length || 0;
  const stockMismatch = product && product.stock !== inStockCount;

  if (isLoadingProduct) {
    return <Skeleton className="h-96 w-full" />;
  }

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
            {isLoadingSerials ? (
                Array.from({length: 5}).map((_, i) => <SerialSkeleton key={i} />)
            ) : serialNumbers && serialNumbers.length > 0 ? (
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
