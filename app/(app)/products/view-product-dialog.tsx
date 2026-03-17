
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, PlusCircle } from 'lucide-react';
import { EditProductDialog } from './edit-product-dialog';
import { QuickAddChildDialog } from './quick-add-child-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    )
}


export function ViewProductDialog({ product, onProductUpdated, products, onChildAdded, trigger }: { product: Product; onProductUpdated?: () => void; products?: Product[]; onChildAdded?: () => void; trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View product</span>
                </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription>
                        {product.description}
                    </DialogDescription>
                    {product.additionalDescription && (
                        <p className="text-sm text-muted-foreground pt-2">{product.additionalDescription}</p>
                    )}
                </DialogHeader>

                <div className="space-y-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Section 1: Identity & Classification */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Classification</h3>
                                <div className="space-y-4">
                                    <DetailItem label="Brand" value={product.brand} />
                                    <DetailItem label="Category" value={product.category} />
                                    {product.subcategory && <DetailItem label="Subcategory" value={product.subcategory} />}
                                    {product.supplierName && <DetailItem label="Supplier" value={product.supplierName} />}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Codes & Inventory */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Codes & Inventory</h3>
                                <div className="space-y-4">
                                    <DetailItem label="SKU" value={<Badge variant="outline" className="font-mono">{product.sku}</Badge>} />
                                    {product.barcode && <DetailItem label="Barcode" value={<Badge variant="outline" className="font-mono">{product.barcode}</Badge>} />}
                                    <DetailItem label="Current Stock" value={<span className={product.stock <= (product.reorderPoint || 0) ? "text-destructive font-bold" : "font-bold"}>{product.stock}</span>} />
                                    <DetailItem label="Unit of Measure" value={product.unitOfMeasure} />
                                    <DetailItem label="Availability" value={<Badge variant={product.availability === 'in-stock' ? 'default' : 'destructive'}>{product.availability}</Badge>} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Financials & Logistics */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Pricing & Logistics</h3>
                                <div className="space-y-4">
                                    <DetailItem label="Retail Price" value={typeof product.price === 'number' ? `₱${product.price.toFixed(2)}` : 'N/A'} />
                                    <DetailItem label="Cost" value={product.cost && typeof product.cost === 'number' ? `₱${product.cost.toFixed(2)}` : 'N/A'} />
                                    {product.vatStatus && <DetailItem label="VAT Status" value={<Badge variant="secondary">{product.vatStatus}</Badge>} />}
                                    {product.reorderPoint && <DetailItem label="Reorder Point" value={product.reorderPoint} />}
                                    {product.warehouseName && <DetailItem label="Warehouse" value={product.warehouseName} />}
                                    {product.shelfLocationName && <DetailItem label="Shelf Location" value={product.shelfLocationName} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* More Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Additional Info</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Avg. Daily Sales" value={product.avgDailySales || 0} />
                                {product.expirationDate && <DetailItem label="Expiration Date" value={<span className="text-orange-600 font-medium">{new Date(product.expirationDate).toLocaleDateString()}</span>} />}
                                {product.createdAt && <DetailItem label="Created" value={new Date(product.createdAt).toLocaleDateString()} />}
                                {product.updatedAt && <DetailItem label="Last Updated" value={new Date(product.updatedAt).toLocaleDateString()} />}
                            </div>
                        </div>

                        {/* Accounting */}
                        {(product.incomeAccount || product.expenseAccount) && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Accounting</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {product.incomeAccount && <DetailItem label="Income Account" value={product.incomeAccount} />}
                                    {product.expenseAccount && <DetailItem label="Expense Account" value={product.expenseAccount} />}
                                </div>
                            </div>
                        )}
                    </div>

                    {( (product.priceLevels && product.priceLevels.length > 0) || (product.conversionFactors && product.conversionFactors.length > 0) ) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {product.priceLevels && product.priceLevels.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Price Levels</h3>
                                    <div className="grid gap-2">
                                        {product.priceLevels.map((pl, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                                                <span className="text-sm font-medium">Price Level {index + 1}</span>
                                                <Badge variant="outline" className="font-semibold text-primary">₱{pl.price.toFixed(2)}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const hasConversionFactors = product.conversionFactors && product.conversionFactors.length > 0;
                                const isChildProduct = product.parentId && products;
                                const parentProduct = isChildProduct ? products?.find(p => p.id === product.parentId) : null;
                                const childConversion = parentProduct?.conversionFactors?.find(cf => cf.unit === product.unitOfMeasure);

                                if (hasConversionFactors || childConversion) {
                                    return (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conversion Units</h3>
                                            <div className="grid gap-2">
                                                {hasConversionFactors && product.conversionFactors?.map((cf, index) => (
                                                    <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                                                        <span className="text-sm font-medium">{cf.unit}</span>
                                                        <Badge variant="outline" className="font-semibold">{cf.factor}x</Badge>
                                                    </div>
                                                ))}
                                                {childConversion && parentProduct && (
                                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                                                        <span className="text-sm font-medium">{parentProduct.unitOfMeasure} to {product.unitOfMeasure}</span>
                                                        <Badge variant="outline" className="font-semibold">1 = {childConversion.factor}</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                     <p className="text-xs text-muted-foreground">Product ID: {product.id}</p>
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                        {!product.parentId && product.conversionFactors && product.conversionFactors.length > 0 && products && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <QuickAddChildDialog
                                  parentProduct={product}
                                  baseStock={undefined}
                                  onChildAdded={() => {
                                    onChildAdded?.();
                                    onProductUpdated?.();
                                  }}
                                  products={products}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add child unit</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <EditProductDialog product={product} onProductUpdated={onProductUpdated} />
                     </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
