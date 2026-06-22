'use client';

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
import { PlusCircle, Loader2 } from 'lucide-react';
import { AddCustomerDialog } from '../add-customer/AddCustomerDialog';
import { SearchDebounce } from './SearchDebounce';
import { useSelectCustomer } from './use-select-customer';
import { WALK_IN_CUSTOMER, getInitials } from './select-customer-utils';
import type { SelectCustomerDialogProps } from './select-customer-types';

export function SelectCustomerDialog({
  isOpen,
  onOpenChange,
  onSelectCustomer
}: SelectCustomerDialogProps) {
  const {
    customers,
    isLoading,
    isAddCustomerOpen,
    setIsAddCustomerOpen,
    searchQuery,
    setSearchQuery,
    fetchCustomers,
    handleSelect,
    handleCustomerAdded,
  } = useSelectCustomer({
    isOpen,
    onOpenChange,
    onSelectCustomer,
  });

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
              onValueChange={setSearchQuery}
            />
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

export { WALK_IN_CUSTOMER } from './select-customer-utils';
