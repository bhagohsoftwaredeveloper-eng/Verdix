
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, PlusCircle, Loader2 } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { AddCustomerDialog } from './add-customer-dialog';
import { getApiUrl } from '@/lib/api-config';

export const WALK_IN_CUSTOMER: Customer = {
  id: 'walk-in',
  name: 'Walk-in Customer',
  contactNumber: '',
  paymentTerms: 'Due on receipt',
};

interface SelectCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function SelectCustomerDialog({ isOpen, onOpenChange, onSelectCustomer }: SelectCustomerDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = async (query = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50'); // Fetch reasonable amount for dropdown
      if (query) {
        params.append('search', query);
      }
      const response = await fetch(getApiUrl(`/customers?${params.toString()}`));
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    onOpenChange(false);
  };

  const handleCustomerAdded = (newCustomer: Customer) => {
     // Optionally refresh list or just select the new customer
     setCustomers((prev) => {
         const exists = prev.some(c => c.id === newCustomer.id);
         if (exists) return prev;
         return [newCustomer, ...prev];
     });
     handleSelect(newCustomer);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select a Customer</DialogTitle>
            <DialogDescription>
              Search for an existing customer or add a new one.
            </DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false}>
            <CommandInput 
                placeholder="Type a customer name or contact number..." 
                value={searchQuery}
                onValueChange={(val) => {
                    setSearchQuery(val);
                    // Debounce could be added here, for now just simple fetch on effect or direct call?
                    // CommandInput onValueChange updates state, we can use useEffect on searchQuery to debounce fetch.
                    // For simplicity in this step, let's just let it be efficiently handled or add a small debounce if needed.
                    // Actually, let's just add a simple check to avoid too many calls or use a key press event.
                    // Given the usually low volume, fetching on change with small timeout is fine.
                    // But to be cleaner, let's just use the `fetchCustomers` in a useEffect with debounce.
                }}
            />
             {/* Debounce Logic */}
             <SearchDebounce query={searchQuery} onSearch={fetchCustomers} />

            <CommandList>
              {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
              ) : (
                  <>
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                        {customers.map((customer) => (
                        <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.contactNumber}`}
                            onSelect={() => handleSelect(customer)}
                            className="flex items-center justify-between cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.contactNumber}</p>
                            </div>
                            </div>
                        </CommandItem>
                        ))}
                    </CommandGroup>
                  </>
              )}
            </CommandList>
          </Command>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsAddCustomerOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Customer
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => handleSelect(WALK_IN_CUSTOMER)}>Select Walk-in</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AddCustomerDialog 
        isOpen={isAddCustomerOpen} 
        onOpenChange={setIsAddCustomerOpen} 
        onCustomerAdded={handleCustomerAdded} 
      />
    </>
  );
}

// Helper for debouncing search
function SearchDebounce({ query, onSearch }: { query: string; onSearch: (q: string) => void }) {
    useEffect(() => {
        const handler = setTimeout(() => {
            onSearch(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);
    return null;
}
