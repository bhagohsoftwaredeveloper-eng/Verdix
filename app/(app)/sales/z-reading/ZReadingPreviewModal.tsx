'use client';

import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { ZReadingPreview, ZReadingData, BusinessSettings } from './z-reading-preview';
import type { PrinterFormat } from './use-z-reading-page';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedReading: ZReadingData;
  printerFormat: PrinterFormat;
  setPrinterFormat: (format: PrinterFormat) => void;
  businessSettings: BusinessSettings | null | undefined;
  previewRef: RefObject<HTMLDivElement>;
  onPrint: () => void;
}

export function ZReadingPreviewModal({ isOpen, onClose, selectedReading, printerFormat, setPrinterFormat, businessSettings, previewRef, onPrint }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-medium text-gray-700">Z-READING</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-4 flex justify-center">
          <div ref={previewRef} className="bg-white shadow-sm h-fit">
            <ZReadingPreview data={selectedReading} printerFormat={printerFormat} businessSettings={businessSettings ?? null} />
          </div>
        </div>

        <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Format:</span>
            <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as PrinterFormat)}>
              <SelectTrigger className="w-[90px] h-8 text-xs bg-white">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="80mm">80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="bg-white">Close</Button>
            <Button onClick={onPrint} disabled={!selectedReading} className="bg-[#008CCB] hover:bg-[#007cb3] text-white">
              POS Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
