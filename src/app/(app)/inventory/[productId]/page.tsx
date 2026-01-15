
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
  useDoc,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { EditProductDialog } from '@/app/(app)/products/edit-product-dialog';


function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
        </div>
    )
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const firestore = useFirestore();

  const productRef = useMemoFirebase(
    () => (firestore && productId ? doc(firestore, 'products', productId) : null),
    [firestore, productId]
  );
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  const unitsQuery = useMemoFirebase(
    () => (firestore && product?.parentId ? query(collection(firestore, 'products'), where('parentId', '==', product.parentId)) : null),
    [firestore, product]
  );
  const { data: units, isLoading: isLoadingUnits } = useCollection<Product>(unitsQuery);

  const isLoading = isLoadingProduct || isLoadingUnits;

  if (isLoading) {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-8 w-48" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                     <Skeleton className="w-full h-96 rounded-lg" />
                     <div className="flex flex-col gap-6">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                         <Skeleton className="h-16 w-full" />
                     </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The product you are looking for does not exist.</p>
           <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Link href="/products">
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-2xl font-bold">{product.name}</h1>
        </div>
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>
                        {product.description}
                    </CardDescription>
                </div>
                 <EditProductDialog product={product} />
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-8">
                <Image 
                    src={product.imageUrl}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="rounded-lg object-cover w-full aspect-square"
                />
                <div className="space-y-6 md:col-span-2">
                    <div className="grid grid-cols-2 gap-6">
                        <DetailItem label="Brand" value={product.brand} />
                        <DetailItem label="Category" value={product.category} />
                         {product.subcategory && <DetailItem label="Subcategory" value={product.subcategory} />}
                         <DetailItem label="Base SKU" value={<Badge variant="outline">{product.sku}</Badge>} />
                    </div>
                     <Separator />
                     <div className="grid grid-cols-3 gap-6">
                         <DetailItem label="Total Stock" value={`${product.stock} ${product.unitOfMeasure}(s)`} />
                         <DetailItem label="Reorder Point" value={'N/A'} />
                          <DetailItem label="Serialized" value={product.isSerialized ? 'Yes' : 'No'} />
                     </div>
                     <Separator />
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Selling Units</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Unit Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Conversion</TableHead>
                                    <TableHead>SKU</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {units && units.length > 0 ? units.map(unit => (
                                    <TableRow key={unit.id}>
                                        <TableCell className='font-medium'>{unit.name}</TableCell>
                                        <TableCell>₱{unit.price.toFixed(2)}</TableCell>
                                        <TableCell>1 {unit.name} = {unit.conversionFactor} {product.unitOfMeasure}(s)</TableCell>
                                        <TableCell><Badge variant="secondary">{unit.sku}</Badge></TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No child selling units defined.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     </div>
                </div>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">Product ID: {product.id}</p>
             </CardFooter>
        </Card>

    </div>
  );
}
