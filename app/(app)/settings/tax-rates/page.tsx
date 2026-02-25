
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { Loader2, Pencil, Trash2, Check } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AddTaxRateDialog } from './add-tax-rate-dialog';
import { EditTaxRateDialog } from './edit-tax-rate-dialog';
import { TaxRate } from '@/lib/types';

export default function TaxRatesPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [taxRateToDelete, setTaxRateToDelete] = useState<TaxRate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/settings/tax-rates'));
      const data = await response.json();
      if (Array.isArray(data)) {
        setTaxRates(data);
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tax rates',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!taxRateToDelete) return;

    try {
      const response = await fetch(getApiUrl(`/settings/tax-rates/${taxRateToDelete.id}`), {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Deleted',
          description: 'Tax rate has been successfully deleted.',
        });
        fetchTaxRates();
      } else {
        throw new Error(result.error || 'Failed to delete tax rate');
      }
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete tax rate',
      });
    } finally {
      setTaxRateToDelete(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tax Rates</h2>
          <p className="text-muted-foreground">
            Manage tax rates applicable across the system
          </p>
        </div>
        <AddTaxRateDialog onTaxRateAdded={fetchTaxRates} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Rates List</CardTitle>
              <CardDescription>View and manage all registered tax rates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Name</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No tax rates found. Click "Add Tax Rate" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    taxRates.map((rate) => (
                      <TableRow 
                        key={rate.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleEdit(rate)}
                      >
                        <TableCell className="font-medium">{rate.name}</TableCell>
                        <TableCell>{rate.rate}%</TableCell>
                        <TableCell>{rate.description || '-'}</TableCell>
                        <TableCell>
                          {rate.isDefault ? (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" /> Default
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(rate);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaxRateToDelete(rate);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedTaxRate && (
        <EditTaxRateDialog
          taxRate={selectedTaxRate}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onTaxRateUpdated={fetchTaxRates}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taxRateToDelete} onOpenChange={(open) => !open && setTaxRateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tax rate "{taxRateToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
