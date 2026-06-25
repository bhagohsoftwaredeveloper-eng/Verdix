'use client';

import { Loader2 } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Supplier } from '@/lib/types';

import { useSupplierForm, type SupplierSaveHandler } from './use-supplier-form';

const SCHEDULE_OPTIONS = [
  "Daily",
  "Every Monday",
  "Every Tuesday",
  "Every Wednesday",
  "Every Thursday",
  "Every Friday",
  "Every Saturday",
  "Every Sunday",
  "Every 2 Weeks",
  ...Array.from({ length: 31 }, (_, i) => `Monthly (Day ${i + 1})`),
  "Monthly (End of Month)",
];

export function SupplierFormDialog({
  supplier,
  onSave,
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  supplier?: Supplier;
  onSave: SupplierSaveHandler;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const {
    isOpen,
    setIsOpen,
    name, setName,
    telephone, setTelephone,
    mobilePhone, setMobilePhone,
    email, setEmail,
    address, setAddress,
    company, setCompany,
    tin, setTin,
    paymentTerms, setPaymentTerms,
    orderSchedule, setOrderSchedule,
    availablePaymentTerms,
    isSaving,
    handleSave,
  } = useSupplierForm({ supplier, onSave, open: controlledOpen, onOpenChange: setControlledOpen });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Supplier Name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Company Name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tin">TIN</Label>
              <Input
                id="tin"
                value={tin}
                onChange={e => setTin(e.target.value)}
                placeholder="TIN"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="Landline"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mobilePhone">Mobile Phone</Label>
              <Input
                id="mobilePhone"
                value={mobilePhone}
                onChange={e => setMobilePhone(e.target.value)}
                placeholder="Mobile"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue placeholder="Terms" />
                </SelectTrigger>
                <SelectContent>
                  {availablePaymentTerms.length > 0 ? (
                    availablePaymentTerms.map(term => (
                      <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="CASH">CASH</SelectItem>
                      <SelectItem value="7 Days">7 Days</SelectItem>
                      <SelectItem value="15 Days">15 Days</SelectItem>
                      <SelectItem value="30 Days">30 Days</SelectItem>
                      <SelectItem value="60 Days">60 Days</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orderSchedule">Order Schedule</Label>
            <Select value={orderSchedule} onValueChange={setOrderSchedule}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="resize-none"
              rows={3}
              placeholder="Full Address"
            />
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Supplier'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
