'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, RefreshCw } from 'lucide-react';

interface Props {
  title: string;
  exportDescription: string;
  importDescription: string;
  exportLoading: boolean;
  onExport: () => void;
  importFile: File | null;
  importLoading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export function CsvImportExportSection({ title, exportDescription, importDescription, exportLoading, onExport, importFile, importLoading, onFileChange, onImport }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium border-b pb-2">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 border rounded-lg space-y-3">
          <div className="font-medium flex items-center text-blue-600">
            <Download className="mr-2 h-4 w-4" /> Export {title}
          </div>
          <div className="text-sm text-muted-foreground">{exportDescription}</div>
          <Button variant="outline" className="w-full" onClick={onExport} disabled={exportLoading}>
            {exportLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </div>
        <div className="p-4 border rounded-lg space-y-3">
          <div className="font-medium flex items-center text-green-600">
            <Upload className="mr-2 h-4 w-4" /> Import {title}
          </div>
          <div className="text-sm text-muted-foreground">{importDescription}</div>
          <div className="flex gap-2">
            <Input type="file" accept=".csv" onChange={onFileChange} disabled={importLoading} />
            <Button onClick={onImport} disabled={!importFile || importLoading} variant="secondary">
              {importLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Import'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
