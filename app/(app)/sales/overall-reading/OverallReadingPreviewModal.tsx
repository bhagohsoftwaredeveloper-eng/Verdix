'use client';

import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OverallReadingPreview } from './overall-reading-preview';
import type { OverallReadingData, PrinterFormat } from './overall-reading-types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  readingData: OverallReadingData;
  printerFormat: PrinterFormat;
  setPrinterFormat: (format: PrinterFormat) => void;
  modalMode: 'view' | 'print';
  previewRef: RefObject<HTMLDivElement>;
  handlePrint: () => void;
}

export function OverallReadingPreviewModal({ isOpen, onClose, readingData, printerFormat, setPrinterFormat, modalMode, previewRef, handlePrint }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={cn(
        'bg-white w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden border border-slate-100 transition-all duration-300',
        printerFormat === '58mm' && 'max-w-[350px]',
        printerFormat === '80mm' && 'max-w-[450px]',
        printerFormat === 'A4' && 'max-w-[900px]'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Overall Reading Receipt</h2>
            <p className="text-xs text-slate-500 mt-0.5">Preview of the printed report</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100/50 p-6 flex justify-center">
          <div ref={previewRef} className="printable-area bg-white shadow-sm h-fit rounded-lg overflow-hidden border border-slate-200/60">
            <OverallReadingPreview data={readingData} printerFormat={printerFormat} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          {modalMode === 'print' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Format:</span>
                <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as PrinterFormat)}>
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="A4">A4 (Simple)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={onClose} className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700">
                  Close
                </Button>
                <Button size="sm" onClick={handlePrint} disabled={!readingData} className="bg-primary hover:bg-primary/90 text-white gap-2">
                  <Printer className="h-4 w-4" />
                  Print Now
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <Button variant="outline" size="sm" onClick={onClose} className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
