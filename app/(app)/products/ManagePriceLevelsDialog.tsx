'use client';

// Price level management
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriceLevel } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPriceLevels, addPriceLevel, updatePriceLevel, deletePriceLevel } from './actions';
import { Checkbox } from '@/components/ui/checkbox';

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="1em" 
      height="1em" 
      viewBox="0 0 24 24"
      className={className}
    >
      <path 
        fill="currentColor" 
        d="M10 18v-4H6.816c-.422 0-.645-.24-.868-.617c-.223-.377-.28-.702-.28-1.383V7H4V5h4v4h3.184c.422 0 .645.24.868.617c-.223-.377-.28.702-.28 1.383v.831c0 .68-.057 1.006-.28 1.383c-.223.377-.446.617-.868.617H12v4zm2-6.831c0-.491.062-.83.184-1.018c.123-.188.31-.35.564-.515c.254-.166.52-.28.802-.344V7h2V5h-4v3.831c.491.062.83.184 1.018.366c.188.182.35.436.515.762c.166.326.28.675.344 1.047h2v2h-2c-.062.372-.184.72-.366 1.047c-.326-.182-.58-.436-.762-.762c-.182-.326-.304-.675-.366-1.047z" 
      />
    </svg>
  );
}

function PriceLevelForm({ initialData, onSave, onCancel }: { initialData?: PriceLevel, onSave: (name: string, description: string, isDefault: boolean, percentageAdjustment: number, calculationBase: 'retail' | 'cost') => Promise<boolean>, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);
  const [calculationBase, setCalculationBase] = useState<'retail' | 'cost'>(initialData?.calculationBase || 'retail');
  const [percentageAdjustment, setPercentageAdjustment] = useState(initialData?.percentageAdjustment?.toString() || '0');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Price level name cannot be empty.',
      });
      return;
    }
    const adjustment = parseFloat(percentageAdjustment);

    if (isNaN(adjustment) || adjustment < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Markup percentage must be a valid positive number.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(name, description, isDefault, adjustment, calculationBase);
      if (success) {
        toast({
          title: initialData ? 'Price Level Updated' : 'Price Level Added',
          description: `Price level "${name}" has been successfully saved.`,
        });
        if (!initialData) {
          setName('');
          setDescription('');
          setIsDefault(false);
          setCalculationBase('retail');
          setPercentageAdjustment('0');
        }
      }
    } catch (error) {
      console.error('Failed to save price level', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save price level. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-3"
          placeholder="e.g., Wholesale"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          Description
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="col-span-3"
          placeholder="Optional description"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="adjustment" className="text-right">
          Markup %
        </Label>
        <Input
          id="adjustment"
          type="number"
          value={percentageAdjustment}
          onChange={(e) => setPercentageAdjustment(e.target.value)}
          className="col-span-3"
          placeholder="e.g., 20 for 20% markup"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="calculationBase" className="text-right">
          Base On
        </Label>
        <div className="col-span-3">
          <Select value={calculationBase} onValueChange={(val: 'retail' | 'cost') => setCalculationBase(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select calculation base" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">Retail Target Price</SelectItem>
              <SelectItem value="cost">Product Cost</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {calculationBase === 'retail' 
              ? 'Applies markup/discount on top of the calculated Retail price.' 
              : 'Applies markup/discount on top of the base Cost.'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="isDefault" className="text-right">
          Default
        </Label>
        <div className="flex items-center space-x-2 col-span-3">
          <Checkbox 
            id="isDefault" 
            checked={isDefault} 
            onCheckedChange={(checked) => setIsDefault(!!checked)}
          />
          <Label htmlFor="isDefault" className="text-sm font-normal">Apply as default for new customers</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSaving ? 'Saving...' : (initialData ? 'Update Price Level' : 'Add Price Level')}
        </Button>
      </div>
    </div>
  );
}

function PriceLevelRow({ level, onUpdated, onDeleted, onEdit }: { level: PriceLevel; onUpdated: () => void; onDeleted: () => void; onEdit: (level: PriceLevel) => void }) {
  const { toast } = useToast();

  const handleDelete = async () => {
    const result = await deletePriceLevel(level.id);
    if (result.success) {
      toast({
        title: 'Price Level Deleted',
        description: result.message,
      });
      onDeleted();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {level.name}
          {level.isDefault && (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{level.description}</TableCell>
      <TableCell className="text-center">{level.percentageAdjustment}% <br /> <span className="text-xs text-muted-foreground">on {level.calculationBase === 'cost' ? 'Cost' : 'Retail'}</span></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(level)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={level.isDefault}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PriceLevelSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManagePriceLevelsDialog({ trigger, onLevelAdded, open, onOpenChange }: { trigger?: React.ReactNode; onLevelAdded?: () => void; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [levels, setLevels] = useState<PriceLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingLevel, setEditingLevel] = useState<PriceLevel | undefined>(undefined);
  const { toast } = useToast();

  const refreshLevels = async () => {
    try {
      const loadedLevels = await getPriceLevels();
      setLevels(loadedLevels);
    } catch (error) {
      console.error('Error loading price levels', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshLevels();
  }, []);

  const handleAddLevel = async (name: string, description: string, isDefault: boolean, percentageAdjustment: number, calculationBase: 'retail' | 'cost'): Promise<boolean> => {
    const result = await addPriceLevel(name, description, isDefault, percentageAdjustment, 0, calculationBase);
    if (result.success) {
      await refreshLevels();
      onLevelAdded?.();
      setView('list');
      return true;
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
      return false;
    }
  };

  const handleUpdateLevel = async (name: string, description: string, isDefault: boolean, percentageAdjustment: number, calculationBase: 'retail' | 'cost'): Promise<boolean> => {
    if (!editingLevel) return false;
    const result = await updatePriceLevel(editingLevel.id, name, description, isDefault, percentageAdjustment, 0, calculationBase);
    if (result.success) {
      await refreshLevels();
      setView('list');
      setEditingLevel(undefined);
      return true;
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
        });
        return false;
    }
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <CurrencyIcon className="mr-2 h-4 w-4" />
      Manage Price Levels
    </Button>
  );

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>
            {view === 'list' && 'Manage Price Levels'}
            {view === 'form' && (editingLevel ? 'Edit Price Level' : 'Add New Price Level')}
          </DialogTitle>
          <DialogDescription>
            {view === 'list' && 'Configure multiple price points for your products.'}
            {view === 'form' && (editingLevel ? `Editing the price level "${editingLevel.name}".` : 'Enter details for the new price level.')}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            {view === 'list' ? (
                <>
                    <div className="flex justify-end mb-4">
                        <Button size="sm" onClick={() => { setEditingLevel(undefined); setView('form'); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Price Level
                        </Button>
                    </div>
                    <Card>
                        <CardContent className='p-0'>
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Markup</TableHead>
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && Array.from({ length: 4 }).map((_, i) => <PriceLevelSkeleton key={i} />)}
                                {!isLoading && levels.map((level) => (
                                  <PriceLevelRow 
                                    key={level.id} 
                                    level={level} 
                                    onUpdated={refreshLevels} 
                                    onDeleted={refreshLevels}
                                    onEdit={(lvl) => { setEditingLevel(lvl); setView('form'); }}
                                  />
                                ))}
                                 {!isLoading && levels.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            No price levels found. Add one to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <PriceLevelForm 
                  initialData={editingLevel} 
                  onSave={editingLevel ? handleUpdateLevel : handleAddLevel}
                  onCancel={() => { setView('list'); setEditingLevel(undefined); }}
                />
            )}
        </div>
        {view === 'list' && (
            <DialogFooter>
              <DialogTrigger asChild>
                <Button variant="outline">Close</Button>
              </DialogTrigger>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
