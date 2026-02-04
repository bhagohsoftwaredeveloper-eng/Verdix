
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Separator } from '@/components/ui/separator';

interface ZReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type ZReadingData = {
    id: string;
    date: string;
    reportDate: Date;
    businessName: string;
    address: string;
    grossSales: number;
    returns: number;
    discounts: number;
    netSales: number;
    vatSales: number;
    vatAmount: number;
    vatExempt: number;
    zeroRated: number;
    nonVat: number;
    paymentMethods: Array<{ name: string; amount: number }>;
    transactionCount: number;
    startingCash: number;
    cashSales: number;
    cashInDrawer: number;
    cashierName?: string;
    terminalId?: string;
    minSaleId?: string;
    maxSaleId?: string;
    previousReading: number;
    runningTotal: number;
  };

const printZReading = (data: ZReadingData, paperSize: '58mm' | '80mm' = '58mm') => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Dynamic width based on settings
    const pageSize = paperSize === '80mm' ? '80mm' : '58mm';
    const containerWidth = paperSize === '80mm' ? '68mm' : '42mm'; // reduced further to prevent cut-off
    const fontSize = paperSize === '80mm' ? '12px' : '10px';

    const receiptContent = `
        <html>
        <head>
            <title>Z-Reading Report</title>
            <style>
                @page {
                    margin: 0;
                    size: ${pageSize} auto;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                }
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: ${fontSize};
                    color: #000000 !important;
                    font-weight: 600;
                    -webkit-font-smoothing: antialiased;
                    -webkit-print-color-adjust: exact;
                }
                .receipt-container {
                    width: 100%;
                    max-width: ${containerWidth};
                    margin: 0;
                    padding: 0 2px;
                    box-sizing: border-box;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-4 { margin-bottom: 16px; }
                .mt-2 { margin-top: 8px; }
                .mt-4 { margin-top: 16px; }
                .border-b { border-bottom: 1px dashed black; }
                .border-t { border-top: 1px dashed black; }
                .flex { display: flex; justify-content: space-between; }
                .space-y-1 > div { margin-bottom: 2px; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="text-center mb-4">
                    <div class="font-bold uppercase" style="font-size: ${paperSize === '80mm' ? '14px' : '12px'};">${data.businessName}</div>
                    <div style="white-space: pre-wrap;">${data.address}</div>
                </div>

                <div class="flex mb-1">
                    <span>Terminal:</span>
                    <span>${data.terminalId}</span>
                </div>
                <div class="flex mb-1">
                    <span>Date:</span>
                    <span>${format(new Date(data.reportDate), 'MM/dd/yyyy')}</span>
                </div>
                
                <div class="mb-4">
                     <div>Transaction summary:</div>
                     <div>${data.minSaleId?.split('-').pop() || '0000'} - ${data.maxSaleId?.split('-').pop() || '0000'}</div>
                </div>

                <div class="border-b mb-2"></div>

                <div class="space-y-1 mb-4">
                    <div class="flex">
                        <span>GROSS SALES</span>
                        <span>${data.grossSales.toFixed(2)}</span>
                    </div>
                    <div class="flex mt-2">
                        <span>RETURNS</span>
                        <span>${data.returns.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>REGULAR DISCOUNT</span>
                        <span>${data.discounts.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>SENIOR DISCOUNT</span>
                        <span>0.00</span>
                    </div>
                    <div class="flex">
                        <span>PWD DISCOUNT</span>
                        <span>0.00</span>
                    </div>
                    
                    <div class="flex font-bold mt-2">
                        <span>NET SALES</span>
                        <span>${data.netSales.toFixed(2)}</span>
                    </div>
                </div>

                <div class="space-y-1 mb-2">
                    <div class="flex">
                        <span>VAT SALES</span>
                        <span>${data.vatSales.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>12% VAT</span>
                        <span>${data.vatAmount.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>VAT-EXEMPT SALES</span>
                        <span>${data.vatExempt.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>ZERO-RATED SALES</span>
                        <span>${data.zeroRated.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>NON-VAT SALES</span>
                        <span>${data.nonVat.toFixed(2)}</span>
                    </div>
                </div>

                <div class="border-b mb-2"></div>

                <div class="text-center mb-1">TERMINAL CASH POSITION</div>
                <div class="flex mb-4">
                    <span>CASH</span>
                    <span>${data.cashInDrawer.toFixed(2)}</span>
                </div>

                <div class="text-center mb-1">CASHIERS CASH POSITION</div>
                <div class="text-center mb-2">==== ${data.cashierName || 'admin'} ====</div>
                <div class="flex mb-2">
                    <span>CASH</span>
                    <span>${data.cashInDrawer.toFixed(2)}</span>
                </div>

                <div class="border-b mb-2"></div>

                <div class="space-y-1">
                    <div class="flex">
                        <span>NO. OF TRANSACTIONS</span>
                        <span>${data.transactionCount.toFixed(2)}</span> 
                    </div>
                    <div class="flex">
                        <span>PREVIOUS READING</span>
                        <span>${data.previousReading.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>NET SALES</span>
                        <span>${data.netSales.toFixed(2)}</span>
                    </div>
                    <div class="flex">
                        <span>RUNNING TOTAL</span>
                        <span>${data.runningTotal.toFixed(2)}</span>
                    </div>
                </div>

                 <div class="mt-4 text-center">
                    <div>Bhagoh Business Software Provider</div>
                    <div>Cebu City</div>
                </div>

                <div class="border-b mt-4 mb-2"></div>
                
                <div class="text-center font-bold">Z READING END OF DAY REPORT</div>
                <div class="text-center" style="font-size: 8px; color: #666; margin-top: 4px;">ID: ${data.id}</div>
            </div>
        </body>
        </html>
    `;

    doc.open();
    doc.write(receiptContent);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
}

function ZReadingReportView({ onBack }: { onBack: () => void }) {
    const [data, setData] = useState<ZReadingData | null>(null);
    const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch POS settings for paper size
                const settingsRes = await fetch('/api/pos-settings');
                const settingsData = await settingsRes.json();
                if (settingsData.success && settingsData.data.paperSize) {
                    setPaperSize(settingsData.data.paperSize);
                }

                // Fetch 'current' period preview essentially
                const response = await fetch(`/api/sales/z-reading?mode=current`);
                const result = await response.json();

                if (result.success && result.data.length > 0) {
                    setData({
                        ...result.data[0],
                        reportDate: new Date(result.data[0].reportDate)
                    });
                } else {
                    // It's possible to have no data if no sales yet, but API should handle it.
                    // If strictly no data returns, maybe show empty state
                     toast({
                        title: "Notice",
                        description: "No pending sales found for Z-Reading.",
                    });
                     // We might still want to show the structure but with 0s? 
                     // The API returns 0 values if no sales found but mode=current.
                }
            } catch (error) {
                console.error("Error loading Z-Reading:", error);
                toast({
                    title: "Error",
                    description: "An unexpected error occurred.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    const handlePrintAndFinalize = async () => {
        try {
            setIsLoading(true); // Lock UI
            const response = await fetch('/api/sales/z-reading', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    terminalId: data?.terminalId || 'Counter 1',
                    cashierName: data?.cashierName || 'Admin' 
                })
            });

            const result = await response.json();

            if (result.success && result.data.length > 0) {
                const finalizedData = {
                    ...result.data[0],
                     reportDate: new Date(result.data[0].reportDate)
                };

                // Update display with the FINALIZED data (e.g. reading number, exact timestamp)
                setData(finalizedData);
                
                // Allow a small tick for state update before printing
                setTimeout(() => {
                    printZReading(finalizedData, paperSize); // Use the new print function
                    toast({
                        title: "Z-Reading Finalized",
                        description: "The report has been saved and sent to the printer.",
                    });
                    onBack();
                }, 500);

            } else {
                 toast({
                    title: "Error",
                    description: "Failed to finalize Z-Reading.",
                    variant: "destructive"
                });
                setIsLoading(false);
            }
        } catch (error) {
             console.error("Error finalizing Z-Reading:", error);
                toast({
                    title: "Error",
                    description: "An unexpected error occurred while saving.",
                    variant: "destructive"
                });
             setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating Z-Reading Report...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground">No data available for today.</p>
                <Button onClick={onBack}>Go Back</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white">
             {/* Header Actions */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <DialogTitle>Z-Reading Report</DialogTitle>
                </div>
                <Button onClick={handlePrintAndFinalize}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            </div>

            {/* Scrollable Report Area - Screen Preview Only */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div 
                    className="mx-auto bg-white shadow-sm printable-area" 
                    style={{ 
                        fontFamily: "'Arial', 'Helvetica', sans-serif",
                        width: paperSize === '80mm' ? '68mm' : '42mm',
                        fontSize: paperSize === '80mm' ? '12px' : '10px',
                        fontWeight: 600,
                        padding: '4px 2px'
                    }}
                >
                    
                    {/* Header */}
                    <div className="text-center mb-4 space-y-1">
                        <div className="font-bold text-sm uppercase">{data.businessName}</div>
                        <div className="whitespace-pre-wrap px-4">{data.address}</div>
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between mb-1">
                        <span>Terminal:{data.terminalId}</span>
                        <span>Date:{format(data.reportDate, 'MM/dd/yyyy')}</span>
                    </div>
                    
                    <div className="mb-4">
                         <div>Transaction summary:</div>
                         <div>{data.minSaleId?.split('-').pop() || '0000'} - {data.maxSaleId?.split('-').pop() || '0000'}</div>
                    </div>

                    <Separator className="my-2 border-dashed border-gray-400" />

                    {/* Sales Breakdown */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>GROSS SALES</span>
                            <span>{data.grossSales.toFixed(2)}</span>
                        </div>
                        <div className="h-2"></div>
                        <div className="flex justify-between">
                            <span>RETURNS</span>
                            <span>{data.returns.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>REGULAR DISCOUNT</span>
                            <span>{data.discounts.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>SENIOR DISCOUNT</span>
                            <span>0.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>PWD DISCOUNT</span>
                            <span>0.00</span>
                        </div>
                        <div className="h-2"></div>
                         <div className="flex justify-between font-bold">
                            <span>NET SALES</span>
                            <span>{data.netSales.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="h-4"></div>

                    {/* VAT Analysis */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>VAT SALES</span>
                            <span>{data.vatSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>12% VAT</span>
                            <span>{data.vatAmount.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>VAT-EXEMPT SALES</span>
                            <span>{data.vatExempt.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>ZERO-RATED SALES</span>
                            <span>{data.zeroRated.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>NON-VAT SALES</span>
                            <span>{data.nonVat.toFixed(2)}</span>
                        </div>
                    </div>

                    <Separator className="my-2 border-dashed border-gray-400" />

                    {/* Terminal Cash Position */}
                    <div className="text-center mb-1">TERMINAL CASH POSITION</div>
                    <div className="flex justify-between mb-4">
                        <span>CASH</span>
                        <span>{data.cashInDrawer.toFixed(2)}</span>
                    </div>

                    <div className="text-center mb-1">CASHIERS CASH POSITION</div>
                    <div className="text-center mb-2">==== {data.cashierName || 'admin'} ====</div>
                    <div className="flex justify-between mb-2">
                        <span>CASH</span>
                         <span>{data.cashInDrawer.toFixed(2)}</span>
                    </div>

                    <Separator className="my-2 border-dashed border-gray-400" />

                    {/* Footer Totals */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>NO. OF TRANSACTIONS</span>
                            <span>{data.transactionCount.toFixed(2)}</span> 
                        </div>
                        <div className="flex justify-between">
                            <span>PREVIOUS READING</span>
                            <span>{data.previousReading.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>NET SALES</span>
                            <span>{data.netSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>RUNNING TOTAL</span>
                            <span>{data.runningTotal.toFixed(2)}</span>
                        </div>
                    </div>

                     <div className="mt-8 text-center space-y-1">
                        <div>Bhagoh Business Software Provider</div>
                        <div>Cebu City</div>
                    </div>

                    <Separator className="my-4 border-dashed border-gray-400" />
                    
                    <div className="text-center font-bold">Z READING END OF DAY REPORT</div>
                     <div className="text-center text-[10px] mt-2 text-muted-foreground">ID: {data.id}</div>
                </div>
            </div>
            {/* Hidden Footer for spacing in normal view, but used in print if needed, though we styled printable area above */}
        </div>
    );
}

export function ZReadingDialog({
  isOpen,
  onOpenChange,
}: ZReadingDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        setIsAuthDialogOpen(true);
    } else {
        setIsAuthDialogOpen(false);
        setShowReport(false);
    }
  }, [isOpen]);
  
  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    setShowReport(true);
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
        setShowReport(false);
    }
    onOpenChange(open);
  }

  return (
      <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
        <DialogContent className="sm:max-w-md">
            {showReport ? (
                <ZReadingReportView onBack={() => onOpenChange(false)} />
            ) : (
                <AdminAuthDialog 
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            )}
            {!showReport && (
                <DialogHeader>
                    <DialogTitle>Z-Reading Authorization</DialogTitle>
                    <DialogDescription>
                        Admin password is required to generate the final end-of-day report. This action will reset daily totals.
                    </DialogDescription>
                </DialogHeader>
            )}
        </DialogContent>
      </Dialog>
  );
}
