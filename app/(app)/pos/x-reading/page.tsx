'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from '../admin-auth-dialog';
import { Separator } from '@/components/ui/separator';
import { getApiUrl } from '@/lib/api-config';

interface XReadingData {
  id: string;
  date: string;
  reportDate: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  vatAmount: number;
  paymentMethods: Array<{ name: string; amount: number }>;
  transactionCount: number;
  startingCash: number;
  cashSales: number;
  cashInDrawer: number;
  cashierName: string;
  cashierId: string;
  terminalId: string;
  shiftStatus: string;
  businessName?: string;
  operatedBy?: string | null;
  address?: string;
  tin?: string;
  contactNumber?: string;
  email?: string;
}

function XReadingReportView({ data }: { data: XReadingData }) {
    const { toast } = useToast();

    const handlePrint = async () => {
        try {
            // Check if we should use thermal printing or browser printing
            const settingsResponse = await fetch(getApiUrl('/pos-settings'));
            if (!settingsResponse.ok) throw new Error(`API error ${settingsResponse.status}`);
            const settingsResult = await settingsResponse.json();
            const settings = settingsResult.success ? settingsResult.data : {};

            if (settings.printMode === 'escpos' || settings.printMode === 'usb') {
                const { XReadingGenerator } = await import('@/lib/x-reading-generator');
                const generator = new XReadingGenerator();
                
                // Ensure the print data has all business settings
                const printData = {
                    ...data,
                    businessName: settings.businessName,
                    operatedBy: settings.operatedBy,
                    address: settings.address,
                    tin: settings.tin,
                    contactNumber: settings.contactNumber,
                    email: settings.email
                };

                const uint8Array = generator.generate(printData);
                
                // Assuming there's a global window.electron or similar for thermal printing in this project
                if ((window as any).electron) {
                    await (window as any).electron.printThermal(uint8Array);
                    toast({
                        title: "X-Reading Printed",
                        description: "Thermal receipt has been sent to printer."
                    });
                    return;
                }
            }


            // Fallback to browser print
            window.print();
            toast({
                title: "X-Reading Printed",
                description: "Cashier shift report has been printed."
            });
        } catch (error) {
            console.error('Print error:', error);
            toast({
                title: "Print Error",
                description: "Failed to print X-reading report.",
                variant: "destructive"
            });
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-2 border-b pb-6">
                <h2 className="text-xl font-bold uppercase">{data.businessName || 'POS SYSTEM'}</h2>
                {data.operatedBy && <p className="text-sm">Operated by: {data.operatedBy}</p>}
                {data.address && <p className="text-sm">{data.address}</p>}
                {data.tin && <p className="text-sm">VAT REG TIN: {data.tin}</p>}
                {(data.contactNumber || data.email) && (
                    <p className="text-sm">
                        {data.contactNumber} {data.email && `| ${data.email}`}
                    </p>
                )}
                <div className="pt-4">
                    <h1 className="text-2xl font-bold">X-READING REPORT</h1>
                </div>
                <div className="text-sm text-muted-foreground space-y-1 pt-2">
                    <p>Report Date: {format(new Date(data.reportDate), 'PPP')}</p>
                    <p>Report Time: {format(new Date(data.reportDate), 'p')}</p>
                    <p>Cashier: {data.cashierName} ({data.terminalId})</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm">
                <div className="space-y-1">
                    <p className="flex justify-between"><span>Shift Start:</span> <span>{data.shiftStart ? format(new Date(data.shiftStart), 'MM/dd/yy p') : '-'}</span></p>
                    <p className="flex justify-between"><span>Shift End:</span> <span>{data.shiftEnd ? format(new Date(data.shiftEnd), 'MM/dd/yy p') : 'Active'}</span></p>
                </div>
                <div className="space-y-1">
                    <p className="flex justify-between"><span>Terminal ID:</span> <span>{data.terminalId}</span></p>
                    <p className="flex justify-between"><span>Status:</span> <span className="capitalize">{data.shiftStatus}</span></p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-6 border rounded-lg space-y-4">
                    <h2 className="font-semibold text-xl">Sales Summary</h2>
                    <div className="flex justify-between text-sm"><span>Gross Sales:</span> <span className="font-mono">₱{data.grossSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-destructive"><span>Returns:</span> <span className="font-mono">₱{data.returns.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-destructive"><span>Discounts:</span> <span className="font-mono">₱{data.discounts.toFixed(2)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg"><span>Net Sales:</span> <span className="font-mono">₱{data.netSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>VAT (12%):</span> <span className="font-mono">₱{data.vatAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Transaction Count:</span> <span className="font-mono">{data.transactionCount}</span></div>
                </div>

                <div className="p-6 border rounded-lg space-y-4">
                    <h2 className="font-semibold text-xl">Payment Breakdown</h2>
                    {data.paymentMethods.map((method: any) => (
                        <div key={method.name} className="flex justify-between text-sm">
                            <span>{method.name}:</span>
                            <span className="font-mono">₱{method.amount.toFixed(2)}</span>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Payments:</span> <span className="font-mono">₱{data.paymentMethods.reduce((acc: number, m: any) => acc + m.amount, 0).toFixed(2)}</span></div>
                </div>

                <div className="p-6 border rounded-lg space-y-4">
                    <h2 className="font-semibold text-xl">Cash Summary</h2>
                    <div className="flex justify-between text-sm"><span>Starting Cash:</span> <span className="font-mono">₱{data.startingCash.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Cash Sales:</span> <span className="font-mono">₱{data.cashSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Cash Received (-) / Paid (+):</span> <span className="font-mono">₱0.00</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Expected Cash in Drawer:</span> <span className="font-mono">₱{data.cashInDrawer.toFixed(2)}</span></div>
                </div>

                <div className="pt-12 pb-8 space-y-12">
                    <div className="grid grid-cols-2 gap-12 text-center">
                        <div className="space-y-1">
                            <div className="border-b border-black w-48 mx-auto h-8"></div>
                            <p className="text-sm font-bold uppercase">{data.cashierName || 'Cashier'}</p>
                            <p className="text-xs text-muted-foreground">(Cashier Signature)</p>
                        </div>
                        <div className="space-y-1">
                            <div className="border-b border-black w-48 mx-auto h-8"></div>
                            <p className="text-sm font-bold uppercase">MANAGER</p>
                            <p className="text-xs text-muted-foreground">(Manager Signature)</p>
                        </div>
                    </div>
                    
                    <div className="text-center space-y-2">
                        <p className="text-sm italic text-muted-foreground">End of X-Reading Report</p>
                        <p className="text-lg font-bold">THIS IS NOT AN OFFICIAL RECEIPT</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center space-x-4">
                <Button size="lg" onClick={handlePrint}>
                    <Printer className="mr-2 h-5 w-5" />
                    Print X-Reading
                </Button>
            </div>
        </div>
    );
}

export default function XReadingPage() {
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [xReadingData, setXReadingData] = useState<XReadingData | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Require admin auth when the page loads
        setIsAuthDialogOpen(true);
    }, []);

    const handleAdminAuthSuccess = () => {
        setIsAuthDialogOpen(false);
        setShowReport(true);
        loadXReadingData();
    };

    const loadXReadingData = async () => {
        setLoading(true);
        try {
            // Fetch business settings first
            const settingsResponse = await fetch(getApiUrl('/pos-settings'));
            if (!settingsResponse.ok) throw new Error(`API error ${settingsResponse.status}`);
            const settingsResult = await settingsResponse.json();
            const settings = settingsResult.success ? settingsResult.data : {};

            // Load the most recent active shift X-reading for the current cashier
            const response = await fetch(getApiUrl('/sales/x-reading?shiftStatus=active&limit=1'));
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                // Combine shift data with business settings
                setXReadingData({
                    ...result.data[0],
                    businessName: settings.businessName,
                    operatedBy: settings.operatedBy,
                    address: settings.address,
                    tin: settings.tin,
                    contactNumber: settings.contactNumber,
                    email: settings.email
                });
            } else {
                // If no active shift, create a new one or show a message
                toast({
                    title: "No Active Shift",
                    description: "There is no active cashier shift to report on.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error loading X-reading data:', error);
            toast({
                title: "Error",
                description: "Failed to load X-reading data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (!showReport) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <AdminAuthDialog
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            </div>
        );
    }

    return (
        <>
            {loading ? (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading X-Reading data...</span>
                    </div>
                </div>
            ) : xReadingData ? (
                <XReadingReportView data={xReadingData} />
            ) : (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-semibold">No Active Cashier Shift</h2>
                        <p className="text-muted-foreground">There is currently no active cashier shift to generate an X-Reading report for.</p>
                        <Button onClick={loadXReadingData}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            )}
            <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                <AdminAuthDialog
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            </Dialog>
        </>
    );
}
