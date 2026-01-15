'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { addChildProduct, getProducts } from './actions';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Wand2 } from 'lucide-react';

export function QuickAddChildDialog({ parentProduct, baseStock, onChildAdded, products }: { parentProduct?: Product, baseStock?: number, onChildAdded: () => void, products: Product[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [childName, setChildName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(parentProduct?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [localProducts, setLocalProducts] = useState(products);

  const { toast } = useToast();

  // Fetch latest products when dialog opens
  useEffect(() => {
    if (isOpen) {
      getProducts().then(setLocalProducts);
    }
  }, [isOpen]);

  // Get available units from selected parent's conversion factors
  const selectedParent = parentProduct || localProducts.find((p: Product) => p.id === selectedParentId);
  const availableUnits = selectedParent?.conversionFactors || [];

  // Reset unit if it's not available in current parent's units
  useEffect(() => {
    if (unitOfMeasure && !availableUnits.some(cf => cf.unit === unitOfMeasure)) {
      setUnitOfMeasure('');
    }
  }, [availableUnits, unitOfMeasure]);

  // Auto-select first unit when parent changes and no unit is selected
  useEffect(() => {
    if (availableUnits.length > 0 && !unitOfMeasure) {
      setUnitOfMeasure(availableUnits[0].unit);
    }
  }, [availableUnits]);

  // Calculate price, cost, and quantity based on selected unit
  useEffect(() => {
    if (unitOfMeasure && selectedParent && selectedParent.conversionFactors && selectedParent.price !== undefined && selectedParent.cost !== undefined) {
      const cf = selectedParent.conversionFactors.find((cf: any) => cf.unit === unitOfMeasure);
      if (cf) {
        const factor = cf.factor;
        setPrice((selectedParent.price / factor).toFixed(2));
        setCost((selectedParent.cost / factor).toFixed(2));

        // Use baseStock if provided (from child product), otherwise use parent stock
        const stockToUse = baseStock ?? selectedParent.stock;

        // Conditional stock calculation
        let calculatedQuantity;
        if (stockToUse > factor) {
          calculatedQuantity = Math.floor(stockToUse / factor);
        } else {
          calculatedQuantity = Math.floor(stockToUse * factor);
        }
        setQuantity(calculatedQuantity.toString());
      }
    } else {
      setQuantity('');
    }
  }, [unitOfMeasure, selectedParent, baseStock]);



  const generateSku = () => {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const brandPart = selectedParent?.brand?.substring(0, 3).toUpperCase() || 'BRD';
    const namePart = childName?.substring(0, 3).toUpperCase() || 'PRO';
    setSku(`${brandPart}-${namePart}-${randomPart}`);
  };

  const generateBarcode = () => {
    const randomNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setBarcode(randomNumber);
  };

  const handleSave = async () => {
    if (!selectedParent || !childName.trim() || !sku.trim() || !description.trim() || !unitOfMeasure || !price || !cost) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'All fields must be filled out.',
      });
      return;
    }

    const numericPrice = parseFloat(price);
    const numericCost = parseFloat(cost);

    setIsSaving(true);
    try {
      // Calculate child stock based on parent quantity and conversion factor for new product
      const cf = selectedParent.conversionFactors?.find((cf: any) => cf.unit === unitOfMeasure);
      let calculatedStock = 0;
      if (cf) {
        // Use baseStock if provided (from child product), otherwise use parent stock
        const stockToUse = baseStock ?? selectedParent.stock;

        if (stockToUse > cf.factor) {
          calculatedStock = Math.floor(stockToUse / cf.factor);
        } else {
          calculatedStock = Math.floor(stockToUse * cf.factor);
        }
      }

      const result = await addChildProduct(selectedParent.id, {
        name: childName,
        brand: selectedParent.brand,
        sku: sku,
        barcode: barcode,
        description: description,
        category: selectedParent.category,
        subcategory: selectedParent.subcategory,
        unitOfMeasure,
        stock: calculatedStock,
        reorderPoint: 0,
        price: numericPrice,
        cost: numericCost,
      });

      if (result.success) {
        toast({
          title: 'Child Product Added',
          description: `Successfully added ${childName} to ${selectedParent.name}.`,
        });
        onChildAdded();
        setIsOpen(false);
        // Reset form
        setChildName('');
        setSku('');
        setBarcode('');
        setDescription('');
        setUnitOfMeasure('');
        setPrice('');
        setCost('');
        setQuantity('');
        setSelectedParentId('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error adding child product:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add child product. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only">Add child product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Child Product</DialogTitle>
          <DialogDescription>
            Add a new child product unit{parentProduct ? ` to ${parentProduct.name}` : ''}.
          </DialogDescription>

        </DialogHeader>
        <div className="grid grid-cols-1 items-center gap-2 py-4 justify-center">
          {!parentProduct && (
            <>
              <Label htmlFor="parentSelect" className="text-right ml-4">
                Parent
              </Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent product" />
                </SelectTrigger>
                <SelectContent>
                  {localProducts.filter(p => p.conversionFactors && p.conversionFactors.length > 0).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">
                SKU
              </Label>
              <div className="relative">
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., COKE-PC"
                  className="pr-10"
                  readOnly={true}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={generateSku}
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="sr-only">Generate SKU</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">
                Barcode (UPC)
              </Label>
              <div className="relative">
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g., 123456789012"
                  className="pr-10"
                  readOnly={true}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={generateBarcode}
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="sr-only">Generate Barcode</span>
                </Button>
              </div>
            </div>
          </div>

          <Label htmlFor="childName">
           Product Name
          </Label>
          <Input
            id="childName"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="e.g., Piece, Box of 5"
          />

          <Label htmlFor="description" className="text-left ml-4">
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., A single piece of cola candy"
          />

          <Label htmlFor="unitOfMeasure" className="text-left ml-4">
            Unit
          </Label>
          <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map(cf => (
                <SelectItem key={cf.unit} value={cf.unit}>
                  {cf.factor} {cf.unit} (per {selectedParent?.unitOfMeasure || 'unit'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              readOnly={true}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                readOnly={true}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">
                Cost
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                readOnly={true}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Adding...' : 'Add Child Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
