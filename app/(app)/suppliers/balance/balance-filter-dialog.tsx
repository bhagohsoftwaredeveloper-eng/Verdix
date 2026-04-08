import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { SupplierFilters } from '../actions';

interface BalanceFilterDialogProps {
  filters: SupplierFilters;
  onFilterChange: (filters: SupplierFilters) => void;
  onReset: () => void;
}

export function BalanceFilterDialog({
  filters,
  onFilterChange,
  onReset,
}: BalanceFilterDialogProps) {
  const activeFiltersCount = Object.keys(filters).length;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {activeFiltersCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Filter Supplier Balances</AlertDialogTitle>
          <AlertDialogDescription>
            Narrow down the list by applying specific criteria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Select
              value={filters.paymentTerms || "all"}
              onValueChange={(value) => 
                onFilterChange({ ...filters, paymentTerms: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger id="paymentTerms">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="COD">COD</SelectItem>
                <SelectItem value="Net 7">Net 7</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 45">Net 45</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Search company..."
              value={filters.company || ""}
              onChange={(e) => 
                onFilterChange({ ...filters, company: e.target.value || undefined })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="minBalance">Min Balance</Label>
              <Input
                id="minBalance"
                type="number"
                placeholder="0"
                value={filters.minBalance || ""}
                onChange={(e) => 
                  onFilterChange({ ...filters, minBalance: e.target.value ? parseFloat(e.target.value) : undefined })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxBalance">Max Balance</Label>
              <Input
                id="maxBalance"
                type="number"
                placeholder="Any"
                value={filters.maxBalance || ""}
                onChange={(e) => 
                  onFilterChange({ ...filters, maxBalance: e.target.value ? parseFloat(e.target.value) : undefined })
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="hasBalance"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={filters.hasBalance || false}
              onChange={(e) => 
                onFilterChange({ ...filters, hasBalance: e.target.checked ? true : undefined })
              }
            />
            <Label 
              htmlFor="hasBalance" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show only outstanding balances
            </Label>
          </div>
        </div>
        <AlertDialogFooter>
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={onReset}
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Apply Filters</AlertDialogAction>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
