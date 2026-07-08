'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { ImportWizard } from '@/components/import-wizard/ImportWizard';
import type { EntityKey } from '@/lib/import/entity-schemas';

interface Props {
  exporting: boolean; onExport: () => void;
  customerExporting: boolean; onCustomerExport: () => void;
  supplierExporting: boolean; onSupplierExport: () => void;
}

const ENTITIES: { key: EntityKey; title: string; exportDesc: string }[] = [
  { key: 'products', title: 'Products', exportDesc: 'Download your entire product list as a CSV file.' },
  { key: 'customers', title: 'Customers', exportDesc: 'Download your entire customer list as a CSV file.' },
  { key: 'suppliers', title: 'Suppliers', exportDesc: 'Download your entire supplier list as a CSV file.' },
];

export function ImportExportTab({
  exporting, onExport, customerExporting, onCustomerExport, supplierExporting, onSupplierExport,
}: Props) {
  const [wizard, setWizard] = useState<EntityKey | null>(null);
  const exportState: Record<EntityKey, { loading: boolean; onExport: () => void }> = {
    products: { loading: exporting, onExport },
    customers: { loading: customerExporting, onExport: onCustomerExport },
    suppliers: { loading: supplierExporting, onExport: onSupplierExport },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import & Export</CardTitle>
        <CardDescription>Manage your data in bulk using CSV or Excel files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ENTITIES.map(({ key, title, exportDesc }) => (
          <div key={key} className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">{title}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="font-medium flex items-center text-blue-600"><Download className="mr-2 h-4 w-4" /> Export {title}</div>
                <div className="text-sm text-muted-foreground">{exportDesc}</div>
                <Button variant="outline" className="w-full" onClick={exportState[key].onExport} disabled={exportState[key].loading}>
                  {exportState[key].loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export CSV
                </Button>
              </div>
              <div className="p-4 border rounded-lg space-y-3">
                <div className="font-medium flex items-center text-green-600"><Upload className="mr-2 h-4 w-4" /> Import {title}</div>
                <div className="text-sm text-muted-foreground">Guided import from CSV or Excel with column mapping and preview.</div>
                <Button className="w-full" variant="secondary" onClick={() => setWizard(key)}>
                  <Upload className="mr-2 h-4 w-4" /> Import from file
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      {wizard && (
        <ImportWizard entity={wizard} open={!!wizard} onOpenChange={(v) => !v && setWizard(null)} />
      )}
    </Card>
  );
}
