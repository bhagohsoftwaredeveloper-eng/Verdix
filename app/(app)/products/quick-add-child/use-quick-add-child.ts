'use client';

import { useEffect, useState } from 'react';

import { dispatchStockUpdate } from '@/hooks/use-live-refresh';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

import { addChildProduct, getProducts } from '../actions';

export interface UseQuickAddChildProps {
  parentProduct?: Product;
  baseStock?: number;
  onChildAdded: () => void;
  products: Product[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Controller for the Quick Add Child dialog: owns the open state, all form
 * fields, the derived parent/units, the auto price/cost/quantity calculations,
 * the SKU/barcode generators, and the save flow.
 */
export function useQuickAddChild({
  parentProduct,
  baseStock,
  onChildAdded,
  products,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: UseQuickAddChildProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

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
        conversionFactor: cf?.factor || 1,
        stock: calculatedStock,
        reorderPoint: 0,
        price: numericPrice,
        cost: numericCost,
        warehouseId: selectedParent.warehouseId || selectedParent.warehouse,
        department: selectedParent.department,
        supplierId: selectedParent.supplier,
        vatStatus: selectedParent.vatStatus,
        incomeAccount: selectedParent.incomeAccount,
        expenseAccount: selectedParent.expenseAccount,
      });

      if (result.success) {
        toast({
          title: 'Child Product Added',
          description: `Successfully added ${childName} to ${selectedParent.name}.`,
        });
        onChildAdded();

        // Dispatch event to refresh other modules
        dispatchStockUpdate();

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

  return {
    isOpen,
    setIsOpen,
    childName,
    setChildName,
    sku,
    setSku,
    barcode,
    setBarcode,
    description,
    setDescription,
    unitOfMeasure,
    setUnitOfMeasure,
    price,
    setPrice,
    cost,
    setCost,
    quantity,
    setQuantity,
    selectedParentId,
    setSelectedParentId,
    isSaving,
    localProducts,
    selectedParent,
    availableUnits,
    generateSku,
    generateBarcode,
    handleSave,
  };
}
