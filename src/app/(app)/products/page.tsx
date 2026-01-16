'use client';

import Image from 'next/image';
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
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddProductDialog } from './add-product-dialog';
import { QuickAddChildDialog } from './quick-add-child-dialog';
import { ManageCategoriesDialog } from './ManageCategoriesDialog';
import { EditProductDialog } from './edit-product-dialog';
import { ManageBrandsDialog } from './ManageBrandsDialog';
import { ManageAccountsDialog } from './ManageAccountsDialog';
import { Search, ChevronDown, Trash2, PlusCircle } from 'lucide-react';
import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ViewProductDialog } from './view-product-dialog';
import { getProducts, getProductsCount, deleteProduct } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductWithChildren extends Product {
  children?: Product[];
}

function ProductRow({ product, onProductDeleted, onProductUpdated, products, depth = 0 }: { product: ProductWithChildren; onProductDeleted?: () => void, onProductUpdated?: () => void, products: Product[], depth?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const stockStatus =
    product.stock === 0
      ? 'out-of-stock'
      : product.stock < product.reorderPoint
        ? 'low-stock'
        : 'in-stock';

  const badgeVariant =
    stockStatus === 'out-of-stock'
      ? 'destructive'
      : stockStatus === 'low-stock'
        ? 'secondary'
        : 'default';
  const badgeText =
    stockStatus === 'out-of-stock'
      ? 'Out of Stock'
      : stockStatus === 'low-stock'
        ? 'Low Stock'
        : 'In Stock';

  const handleDeleteConfirm = async () => {
    const result = await deleteProduct(product.id);
    if (result.success) {
      toast({
        title: 'Product deleted',
        description: result.message,
      });
      if (onProductDeleted) onProductDeleted();
      setDeleteDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error deleting product',
        description: result.message,
      });
    }
  };

  const hasChildren = product.children && product.children.length > 0;
  const indentStyle = { paddingLeft: `${depth * 24}px` };

  return (
    <>
      <TableRow className={cn(depth > 0 && "bg-muted/20")}>
        <TableCell className="hidden sm:table-cell" style={indentStyle}>
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="group" onClick={() => setIsOpen(!isOpen)}>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
            </Button>
          ) : depth > 0 ? (
            <div className="text-sm text-muted-foreground">└</div>
          ) : (
            <div className="w-10"></div>
          )}
        </TableCell>
        <TableCell>
          <Image
            alt={product.name}
            className="aspect-square rounded-md object-cover"
            height="40"
            src={product.imageUrl || "https://picsum.photos/seed/default-product/400/300"}
            data-ai-hint={product.imageHint}
            width="40"
            />
        </TableCell>
        <TableCell className="font-medium">
          {product.name}
          {product.parentId && <div className="text-xs text-muted-foreground">Child Unit</div>}
        </TableCell>
        <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
        <TableCell className="hidden lg:table-cell">{product.barcode}</TableCell>
        <TableCell>
          <Badge variant={badgeVariant}>{badgeText}</Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell text-center">
          {product.unitOfMeasure}
        </TableCell>
        <TableCell className="hidden md:table-cell text-center">
          {product.stock}
        </TableCell>
        <TableCell className="hidden md:table-cell text-right">
          {typeof product.price === 'number' ? `₱${product.price.toFixed(2)}` : 'N/A'}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <ViewProductDialog
                  product={product}
                  onProductUpdated={onProductUpdated}
                  products={products}
                  onChildAdded={onProductDeleted}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>View product</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <EditProductDialog product={product} onProductUpdated={onProductUpdated} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit product</p>
              </TooltipContent>
            </Tooltip>
            {/* Add child product button for products that can have children */}
            {(() => {
              const parentProduct = product.parentId
                ? products.find(p => p.id === product.parentId)
                : product;
              const canAddChildren = parentProduct?.conversionFactors && parentProduct.conversionFactors.length > 0;
              return canAddChildren ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <QuickAddChildDialog
                      parentProduct={parentProduct}
                      baseStock={product.parentId ? product.stock : undefined}
                      onChildAdded={onProductDeleted || (() => {})}
                      products={[]}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add child product</p>
                  </TooltipContent>
                </Tooltip>
              ) : null;
            })()}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete product</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete product</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
      {isOpen && hasChildren && product.children!.map(child => (
        <ProductRow
          key={child.id}
          product={child}
          onProductDeleted={onProductDeleted}
          onProductUpdated={onProductUpdated}
          products={products}
          depth={depth + 1}
        />
      ))}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{product.name}" and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProductSkeleton() {
  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell w-12"><Skeleton className="h-5 w-5" /></TableCell>
      <TableCell><Skeleton className="w-10 h-10 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><div className='flex gap-2 justify-end'><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /></div></TableCell>
    </TableRow>
  );
}

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to handle page size persistence if needed, but 10 is fine
  const pageSizeInput = 10;

  const [pageSize, setPageSize] = useState(pageSizeInput || 10);
  const [totalProducts, setTotalProducts] = useState(0);

  const loadProducts = useCallback(async (page = currentPage, size = pageSize) => {
    setIsLoadingProducts(true);
    try {
      const [productsData, totalCount] = await Promise.all([
        getProducts(size, (page - 1) * size),
        getProductsCount()
      ]);
      setProducts(productsData);
      setTotalProducts(totalCount);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadProducts(currentPage, pageSize);
  }, [currentPage, pageSize, loadProducts]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const productTree = useMemo(() => {
    if (!products) return [];

    // Build a recursive tree structure
    const buildTree = (parentId: string | null = null, depth = 0): ProductWithChildren[] => {
      return products
        .filter(p => p.parentId === parentId)
        .map(p => ({
          ...p,
          children: depth < 10 ? buildTree(p.id, depth + 1) : [], // Prevent infinite recursion, max depth 10
        }));
    };

    return buildTree();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!productTree) return [];

    const term = searchTerm.toLowerCase();
    if (!term) return productTree;

    return productTree.filter(product => {
      const parentMatch = product.name.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term);

      const childMatch = product.children?.some(
        child => child.name.toLowerCase().includes(term) || child.sku?.toLowerCase().includes(term)
      );

      return parentMatch || childMatch;
    });
  }, [productTree, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Manage your products and view their inventory status.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <ManageBrandsDialog />
            <ManageCategoriesDialog />
            <ManageAccountsDialog />
            <AddProductDialog onProductAdded={() => loadProducts(currentPage, pageSize)} />
          </div>
        </div>
        <div className="pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, SKU, brand, or category..."
              className="pl-8 w-full sm:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><span className="sr-only">Expand</span></TableHead>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden lg:table-cell">Barcode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell text-center">Unit</TableHead>
                <TableHead className="hidden md:table-cell text-center">Stock</TableHead>
                <TableHead className="hidden md:table-cell text-right">Price</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProducts ? (
                Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />)
              ) : (
                filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onProductDeleted={() => loadProducts(currentPage, pageSize)}
                    onProductUpdated={() => loadProducts(currentPage, pageSize)}
                    products={products}
                  />
                ))
              )}
              {!isLoadingProducts && filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>

        {/* Pagination Controls */}
        {!isLoadingProducts && totalProducts > 0 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} products
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="page-size" className="text-sm">Rows per page:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    const newSize = parseInt(value);
                    setPageSize(newSize);
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(totalProducts / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalProducts / pageSize), prev + 1))}
                  disabled={currentPage === Math.ceil(totalProducts / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}