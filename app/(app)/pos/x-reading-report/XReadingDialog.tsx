'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, ArrowLeft } from 'lucide-react';
import { XReadingPreview } from '../../sales/x-reading/x-reading-preview';
import { AdminAuthDialog } from '../admin-auth/AdminAuthDialog';
import { useXReadingReport } from './use-x-reading-report';
import type { XReadingDialogProps } from './x-reading-report-types';

export function XReadingDialog({ isOpen, onOpenChange, shiftId, autoShow = false, terminalName, printMode }: XReadingDialogProps) {
  const {
    isAuthDialogOpen, setIsAuthDialogOpen,
    showReport,
    reportData, businessSettings, loading,
    isPrinting,
    handlePrint, loadReportData, handleAdminAuthSuccess,
  } = useXReadingReport({ isOpen, shiftId, autoShow, terminalName, printMode });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl h-full overflow-hidden flex flex-col p-0 gap-0 [&>button]:hidden">
        {showReport ? (
          <>
            <SheetHeader className="px-4 py-3 border-b flex-none flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <SheetTitle>X-READING REPORT</SheetTitle>
              </div>
              <SheetDescription className="hidden">Report Details</SheetDescription>
              <Button size="sm" onClick={handlePrint} disabled={loading || isPrinting || !reportData}>
                {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Print
              </Button>
            </SheetHeader>

            <div className="flex-1 overflow-auto bg-muted/20 p-4 flex justify-center">
              {loading ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading report...</p>
                </div>
              ) : reportData ? (
                <div className="bg-white shadow-lg h-fit max-w-[400px] w-full">
                  <XReadingPreview data={{ ...reportData, terminalName }} businessSettings={businessSettings} />
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-500">
                  <p>No data available.</p>
                  <Button onClick={loadReportData} variant="outline" size="sm" className="mt-2 text-foreground">
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6">
            <SheetHeader className="text-left space-y-0.5">
              <SheetTitle>X-Reading Authorization</SheetTitle>
              <SheetDescription>Admin password is required to generate the report preview.</SheetDescription>
            </SheetHeader>
            <AdminAuthDialog
              isOpen={isAuthDialogOpen}
              onOpenChange={setIsAuthDialogOpen}
              onSuccess={handleAdminAuthSuccess}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
