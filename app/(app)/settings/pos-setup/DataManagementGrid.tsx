'use client';

import { forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CreditCard, Users } from 'lucide-react';
import { ManageTransactionReferenceDialog } from './manage-transaction-reference/ManageTransactionReferenceDialog';
import { ManagePaymentTermsDialog } from './manage-payment-terms/ManagePaymentTermsDialog';
import { ManagePaymentMethodsDialog } from '../../sales/manage-payment-methods/ManagePaymentMethodsDialog';
import { ManageSalesPersonsDialog } from './manage-sales-persons/ManageSalesPersonsDialog';

interface Props { onRefresh: () => void; }

const ManageBtn = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  (props, ref) => (
    <Button ref={ref} variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80" {...props}>
      <span className="text-xs font-medium">Manage</span>
    </Button>
  )
);
ManageBtn.displayName = 'ManageBtn';

export function DataManagementGrid({ onRefresh }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transaction Reference</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">Configure transaction number format and prefix</CardDescription>
          <div className="flex justify-end">
            <ManageTransactionReferenceDialog onUpdated={onRefresh} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payment Terms</CardTitle>
          <span className="h-4 w-4 text-muted-foreground text-sm font-semibold leading-none flex items-center justify-center">₱</span>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">Configure payment terms and conditions</CardDescription>
          <div className="flex justify-end">
            <ManagePaymentTermsDialog onPaymentTermsUpdated={onRefresh} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">POS Payment Type</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">Manage accepted payment methods</CardDescription>
          <div className="flex justify-end">
            <ManagePaymentMethodsDialog onChange={onRefresh} trigger={<ManageBtn />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Person</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">Manage sales representatives</CardDescription>
          <div className="flex justify-end">
            <ManageSalesPersonsDialog onChange={onRefresh} trigger={<ManageBtn />} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
