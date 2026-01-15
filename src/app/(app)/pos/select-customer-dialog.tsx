
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
import { User, PlusCircle } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { PosManageCustomersDialog } from './ManageCustomersDialog';

export const WALK_IN_CUSTOMER: Customer = {
  id: 'walk-in',
  name: 'Walk-in Customer',
  contactNumber: '',
  paymentTerms: 'Due on receipt',
};


const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30', loyaltyPoints: 125 },
  { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'Due on receipt', loyaltyPoints: 80 },
  { id: 'cust_3', name: 'Charlie Brown', contactNumber: '09193334455', paymentTerms: 'Net 15', loyaltyPoints: 500 },
  { id: 'cust_4', name: 'Diana Prince', contactNumber: '09204445566', paymentTerms: 'Net 30', loyaltyPoints: 0 },
  { id: 'cust_5', name: 'Ethan Hunt', contactNumber: '09215556677', paymentTerms: 'Net 60', loyaltyPoints: 230 },
];

interface SelectCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function SelectCustomerDialog({ isOpen, onOpenChange, onSelectCustomer }: SelectCustomerDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    // Simulate fetching customers
    setCustomers(MOCK_CUSTOMERS);
  }, []);

  const refreshCustomers = () => {
    // In a real app, you'd refetch from the database. Here we just re-set mock data.
    setCustomers(MOCK_CUSTOMERS);
  }

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Select a Customer</DialogTitle>
          <DialogDescription>
            Search for an existing customer or add a new one.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Type a customer name or contact number..." />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.name} ${customer.contactNumber}`}
                  onSelect={() => handleSelect(customer)}
                  className="flex items-center justify-between"
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
          </CommandList>
        </Command>
        <DialogFooter className="sm:justify-between">
          <PosManageCustomersDialog onCustomersUpdated={refreshCustomers} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleSelect(WALK_IN_CUSTOMER)}>Select Walk-in</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
