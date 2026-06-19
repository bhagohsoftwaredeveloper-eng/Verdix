'use client';

import { PlusCircle, Pencil, Loader2, Wand2 } from 'lucide-react';

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
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Product } from '@/lib/types';

import { ManageCategoriesDialog } from '../categories/ManageCategoriesDialog';
import { ManageBrandsDialog } from '../brands/ManageBrandsDialog';
import { ManageDepartmentsDialog } from '../departments/ManageDepartmentsDialog';
import { ManageSubcategoriesDialog } from '../subcategories/ManageSubcategoriesDialog';
import { ManageUnitOfMeasureDialog } from '../units-of-measure/ManageUnitOfMeasureDialog';
import { ManageSuppliersDialog } from '../suppliers/ManageSuppliersDialog';
import { ManageWarehousesDialog } from '../../sales/ManageWarehousesDialog';
import { ManageShelfLocationsDialog } from '../shelf-locations/ManageShelfLocationsDialog';

import { useEditProductForm } from './use-edit-product-form';
import { EditProductFormProvider } from './edit-product-form-context';
import { BasicInfoTab } from './tabs/basic-info-tab';
import { InventoryTab } from './tabs/inventory-tab';
import { ConversionTab } from './tabs/conversion-tab';
import { PriceLevelsTab } from './tabs/price-levels-tab';
import { LoyaltyTab } from './tabs/loyalty-tab';

export function EditProductDialog({
  product,
  onProductUpdated,
  productOptions,
  onOptionsRefresh,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: {
  product: Product;
  onProductUpdated?: () => void;
  productOptions?: any;
  onOptionsRefresh?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const controller = useEditProductForm({
    product,
    onProductUpdated,
    productOptions,
    onOptionsRefresh,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
  });
  const {
    isOpen, setIsOpen,
    isSubmitting,
    form,
    dialogs, setDialogs,
    tabErrors,
    markupSource,
    saveChanges,
    refreshBrands,
    refreshDepartments,
    refreshCategories,
    refreshSubcategories,
    refreshSuppliers,
    refreshWarehouses,
    refreshUnits,
    handleShelfLocationAdded,
  } = controller;

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {trigger ? (
          <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
        ) : externalOpen !== undefined ? null : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit product</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit this product</p>
            </TooltipContent>
          </Tooltip>
        )}
        <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col overflow-hidden !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the details for {product.name}.
            </DialogDescription>
          </DialogHeader>
          <EditProductFormProvider controller={controller}>
            <div className="flex-1 overflow-y-auto px-4 py-1">
              <Form {...form}>
                <form id="edit-product-form" onSubmit={form.handleSubmit(saveChanges, (errors) => console.log('Form validation errors:', errors))}>
                  <div className="h-full">
                    <Tabs defaultValue="basic" className="w-full h-full">
                      <TabsList className="w-full h-auto justify-start rounded-none border-b bg-transparent p-0">
                        <TabsTrigger
                          value="basic"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                        >
                          Basic Info
                          {tabErrors.basic && <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-destructive" />}
                        </TabsTrigger>
                        <TabsTrigger
                          value="inventory"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                        >
                          Inventory
                          {tabErrors.inventory && <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-destructive" />}
                        </TabsTrigger>
                        <TabsTrigger
                          value="price-levels"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                        >
                          Price Levels
                          {tabErrors.priceLevels && <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-destructive" />}
                        </TabsTrigger>
                        <TabsTrigger
                          value="conversion"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                        >
                          Conversion
                          {tabErrors.conversion && <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-destructive" />}
                        </TabsTrigger>
                        <TabsTrigger
                          value="loyalty"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                        >
                          Loyalty
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="basic" className="space-y-4 p-6">
                        <BasicInfoTab />
                      </TabsContent>
                      <TabsContent value="inventory" className="space-y-4 p-6">
                        <InventoryTab />
                      </TabsContent>
                      <TabsContent value="conversion" className="space-y-4 p-6">
                        <ConversionTab />
                      </TabsContent>
                      <TabsContent value="price-levels" className="space-y-4 p-6">
                        <PriceLevelsTab />
                      </TabsContent>
                      <TabsContent value="loyalty" className="space-y-4 p-6">
                        <LoyaltyTab />
                      </TabsContent>
                    </Tabs>
                  </div>
                </form>
              </Form>
            </div>
          </EditProductFormProvider>
          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {markupSource && (
              <span className="text-xs text-muted-foreground mr-auto ml-2 flex items-center">
                <Wand2 className="mr-1 h-3 w-3" />
                {markupSource}
              </span>
            )}
            <Button type="submit" form="edit-product-form" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>

        {/* Lifted Manage Dialogs */}
        <ManageBrandsDialog
          trigger={null}
          open={dialogs.brands}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, brands: open }))}
          onBrandAdded={refreshBrands}
        />
        <ManageDepartmentsDialog
          trigger={null}
          open={dialogs.departments}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, departments: open }))}
          onDepartmentAdded={refreshDepartments}
        />
        <ManageCategoriesDialog
          trigger={null}
          open={dialogs.categories}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, categories: open }))}
          onCategoryAdded={refreshCategories}
        />
        <ManageSubcategoriesDialog
          trigger={null}
          open={dialogs.subcategories}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, subcategories: open }))}
          onSubcategoryAdded={refreshSubcategories}
        />
        <ManageSuppliersDialog
          trigger={null}
          open={dialogs.suppliers}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, suppliers: open }))}
          onSupplierAdded={refreshSuppliers}
        />
        <ManageWarehousesDialog
          open={dialogs.warehouses}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, warehouses: open }))}
          onChange={refreshWarehouses}
        />
        <ManageShelfLocationsDialog
          open={dialogs.shelfLocations}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, shelfLocations: open }))}
          onLocationAdded={handleShelfLocationAdded}
        />
        <ManageUnitOfMeasureDialog
          trigger={null}
          open={dialogs.units}
          onOpenChange={(open) => setDialogs(prev => ({ ...prev, units: open }))}
          onUnitAdded={refreshUnits}
        />
      </Dialog>
    </TooltipProvider>
  );
}
