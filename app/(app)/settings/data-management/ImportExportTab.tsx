'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CsvImportExportSection } from './CsvImportExportSection';

interface Props {
  exporting: boolean; importFile: File | null; importing: boolean;
  onExport: () => void; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onImport: () => void;
  customerExporting: boolean; customerImportFile: File | null; customerImporting: boolean;
  onCustomerExport: () => void; onCustomerFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onCustomerImport: () => void;
  supplierExporting: boolean; supplierImportFile: File | null; supplierImporting: boolean;
  onSupplierExport: () => void; onSupplierFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSupplierImport: () => void;
}

export function ImportExportTab({
  exporting, importFile, importing, onExport, onFileChange, onImport,
  customerExporting, customerImportFile, customerImporting, onCustomerExport, onCustomerFileChange, onCustomerImport,
  supplierExporting, supplierImportFile, supplierImporting, onSupplierExport, onSupplierFileChange, onSupplierImport,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import & Export</CardTitle>
        <CardDescription>Manage your data in bulk using CSV files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CsvImportExportSection
          title="Products"
          exportDescription="Download your entire product list as a CSV file."
          importDescription="Add new products via CSV upload. Duplicate SKUs will be skipped."
          exportLoading={exporting} onExport={onExport}
          importFile={importFile} importLoading={importing} onFileChange={onFileChange} onImport={onImport}
        />
        <CsvImportExportSection
          title="Customers"
          exportDescription="Download your entire customer list as a CSV file."
          importDescription="Add/Update customers via CSV. Use `id` as unique identifier."
          exportLoading={customerExporting} onExport={onCustomerExport}
          importFile={customerImportFile} importLoading={customerImporting} onFileChange={onCustomerFileChange} onImport={onCustomerImport}
        />
        <CsvImportExportSection
          title="Suppliers"
          exportDescription="Download your entire supplier list as a CSV file."
          importDescription="Add/Update suppliers via CSV. Use `name` as unique identifier."
          exportLoading={supplierExporting} onExport={onSupplierExport}
          importFile={supplierImportFile} importLoading={supplierImporting} onFileChange={onSupplierFileChange} onImport={onSupplierImport}
        />
      </CardContent>
    </Card>
  );
}
