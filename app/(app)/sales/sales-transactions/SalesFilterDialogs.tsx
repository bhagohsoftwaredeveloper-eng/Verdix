'use client';

import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { TerminalSelector } from '@/components/TerminalSelector';

interface Props {
  // payment type
  paymentTypeDialogOpen: boolean;
  setPaymentTypeDialogOpen: (v: boolean) => void;
  tempPaymentType: string;
  setTempPaymentType: (v: string) => void;
  onApplyPaymentType: () => void;
  // terminal
  terminalDialogOpen: boolean;
  setTerminalDialogOpen: (v: boolean) => void;
  tempTerminalId: string;
  setTempTerminalId: (v: string) => void;
  onApplyTerminal: () => void;
  // date range
  dateRangeDialogOpen: boolean;
  setDateRangeDialogOpen: (v: boolean) => void;
  tempDateRange: DateRange | undefined;
  setTempDateRange: (v: DateRange | undefined) => void;
  onApplyDateRange: () => void;
  // sales status
  salesStatusDialogOpen: boolean;
  setSalesStatusDialogOpen: (v: boolean) => void;
  tempSalesStatus: string;
  setTempSalesStatus: (v: string) => void;
  onApplySalesStatus: () => void;
  // customer
  customerDialogOpen: boolean;
  setCustomerDialogOpen: (v: boolean) => void;
  tempCustomer: string;
  setTempCustomer: (v: string) => void;
  onApplyCustomer: () => void;
  // cashier
  cashierDialogOpen: boolean;
  setCashierDialogOpen: (v: boolean) => void;
  tempCashier: string;
  setTempCashier: (v: string) => void;
  onApplyCashier: () => void;
  users: any[];
  // sales group
  salesGroupDialogOpen: boolean;
  setSalesGroupDialogOpen: (v: boolean) => void;
  tempSalesGroup: string;
  setTempSalesGroup: (v: string) => void;
  onApplySalesGroup: () => void;
  // reference number
  referenceNumberDialogOpen: boolean;
  setReferenceNumberDialogOpen: (v: boolean) => void;
  tempReferenceNumber: string;
  setTempReferenceNumber: (v: string) => void;
  onApplyReferenceNumber: () => void;
  // transaction from
  transactionFromDialogOpen: boolean;
  setTransactionFromDialogOpen: (v: boolean) => void;
  tempTransactionFrom: string;
  setTempTransactionFrom: (v: string) => void;
  onApplyTransactionFrom: () => void;
}

export function SalesFilterDialogs({
  paymentTypeDialogOpen, setPaymentTypeDialogOpen, tempPaymentType, setTempPaymentType, onApplyPaymentType,
  terminalDialogOpen, setTerminalDialogOpen, tempTerminalId, setTempTerminalId, onApplyTerminal,
  dateRangeDialogOpen, setDateRangeDialogOpen, tempDateRange, setTempDateRange, onApplyDateRange,
  salesStatusDialogOpen, setSalesStatusDialogOpen, tempSalesStatus, setTempSalesStatus, onApplySalesStatus,
  customerDialogOpen, setCustomerDialogOpen, tempCustomer, setTempCustomer, onApplyCustomer,
  cashierDialogOpen, setCashierDialogOpen, tempCashier, setTempCashier, onApplyCashier, users,
  salesGroupDialogOpen, setSalesGroupDialogOpen, tempSalesGroup, setTempSalesGroup, onApplySalesGroup,
  referenceNumberDialogOpen, setReferenceNumberDialogOpen, tempReferenceNumber, setTempReferenceNumber, onApplyReferenceNumber,
  transactionFromDialogOpen, setTransactionFromDialogOpen, tempTransactionFrom, setTempTransactionFrom, onApplyTransactionFrom,
}: Props) {
  return (
    <>
      <Dialog open={paymentTypeDialogOpen} onOpenChange={setPaymentTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Payment Type</DialogTitle><DialogDescription>Select the payment type to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Payment Type</Label><Select value={tempPaymentType} onValueChange={setTempPaymentType}><SelectTrigger className="mt-2"><SelectValue placeholder="Select payment type" /></SelectTrigger><SelectContent><SelectItem value="all">All Payment Types</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="GCash">GCash</SelectItem><SelectItem value="Maya">Maya</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Account">Account</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentTypeDialogOpen(false)}>Cancel</Button><Button onClick={onApplyPaymentType}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Terminal</DialogTitle><DialogDescription>Select the terminal to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Terminal</Label><div className="mt-2"><TerminalSelector terminalId={tempTerminalId} onTerminalChange={setTempTerminalId} showAllOption={true} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setTerminalDialogOpen(false)}>Cancel</Button><Button onClick={onApplyTerminal}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent className="sm:max-w-fit max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Filter by Date Range</DialogTitle><DialogDescription>Select a date range to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-2">
            <Label>Date Range</Label>
            <div className="mt-2 flex justify-center"><Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={1} className="rounded-md border" /></div>
            {tempDateRange?.from && (<p className="text-sm text-muted-foreground text-center mt-2">{tempDateRange.to ? <>Selected: {format(tempDateRange.from, 'LLL dd, y')} - {format(tempDateRange.to, 'LLL dd, y')}</> : <>Selected: {format(tempDateRange.from, 'LLL dd, y')}</>}</p>)}
          </div>
          <DialogFooter className="flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setTempDateRange(undefined)}>Clear Date</Button><Button variant="outline" size="sm" onClick={() => setDateRangeDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={onApplyDateRange}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={salesStatusDialogOpen} onOpenChange={setSalesStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Sales Status</DialogTitle><DialogDescription>Select the sales status to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Sales Status</Label><Select value={tempSalesStatus} onValueChange={setTempSalesStatus}><SelectTrigger className="mt-2"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem><SelectItem value="Returned">Returned</SelectItem><SelectItem value="Void">Void</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setSalesStatusDialogOpen(false)}>Cancel</Button><Button onClick={onApplySalesStatus}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Customer</DialogTitle><DialogDescription>Enter customer name to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="customer">Customer Name</Label><Input id="customer" placeholder="Enter customer name..." className="mt-2" value={tempCustomer} onChange={(e) => setTempCustomer(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button><Button onClick={onApplyCustomer}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cashierDialogOpen} onOpenChange={setCashierDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Cashier</DialogTitle><DialogDescription>Enter cashier name to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Cashier Name</Label><Select value={tempCashier} onValueChange={setTempCashier}><SelectTrigger className="mt-2"><SelectValue placeholder="Select cashier" /></SelectTrigger><SelectContent><SelectItem value="all">All Cashiers</SelectItem>{users.map((user: any) => (<SelectItem key={user.uid} value={user.displayName || user.username}>{user.displayName || user.username}</SelectItem>))}</SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setCashierDialogOpen(false)}>Cancel</Button><Button onClick={onApplyCashier}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={salesGroupDialogOpen} onOpenChange={setSalesGroupDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Sales Group</DialogTitle><DialogDescription>Select the sales group to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Sales Group</Label><Select value={tempSalesGroup} onValueChange={setTempSalesGroup}><SelectTrigger className="mt-2"><SelectValue placeholder="Select sales group" /></SelectTrigger><SelectContent><SelectItem value="all">All Groups</SelectItem><SelectItem value="Retail">Retail</SelectItem><SelectItem value="Wholesale">Wholesale</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="In-Store">In-Store</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setSalesGroupDialogOpen(false)}>Cancel</Button><Button onClick={onApplySalesGroup}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={referenceNumberDialogOpen} onOpenChange={setReferenceNumberDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Reference Number</DialogTitle><DialogDescription>Enter reference number to filter transactions.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="referenceNumber">Reference Number</Label><Input id="referenceNumber" placeholder="Enter reference number..." className="mt-2" value={tempReferenceNumber} onChange={(e) => setTempReferenceNumber(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setReferenceNumberDialogOpen(false)}>Cancel</Button><Button onClick={onApplyReferenceNumber}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transactionFromDialogOpen} onOpenChange={setTransactionFromDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Transaction From</DialogTitle><DialogDescription>Select the transaction source to filter.</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Transaction From</Label><Select value={tempTransactionFrom} onValueChange={setTempTransactionFrom}><SelectTrigger className="mt-2"><SelectValue placeholder="Select source" /></SelectTrigger><SelectContent><SelectItem value="all">All Sources</SelectItem><SelectItem value="POS">POS</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Manual">Manual Entry</SelectItem><SelectItem value="Import">Import</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setTransactionFromDialogOpen(false)}>Cancel</Button><Button onClick={onApplyTransactionFrom}>Apply Filter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
