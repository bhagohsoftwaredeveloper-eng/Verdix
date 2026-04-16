'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Building2, Settings, FileText, Monitor, Users, CreditCard, Lock, Undo, Printer, ClipboardCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ManageTransactionReferenceDialog } from './manage-transaction-reference-dialog';
import { getApiUrl } from '@/lib/api-config';

import { ManageSalesPersonsDialog } from './manage-sales-persons-dialog';
import { ManagePaymentTermsDialog } from './manage-payment-terms-dialog';
import { ManagePaymentMethodsDialog } from '../../sales/ManagePaymentMethodsDialog';
import { TerminalSettingsDialog } from './terminal-settings-dialog';

interface PosSettings {
  businessName: string;
  operatedBy?: string | null;
  logoPath: string | null;
  transactionPrefix: string;
  address: string | null;
  contactNumber: string | null;
  tin: string | null;
  email: string | null;
  currentTerminalId?: string | null;
  currentTerminalName?: string | null;
  enableLineVoidAuth?: boolean;
  lineVoidAuthUsername?: string | null;
  lineVoidAuthPassword?: string | null;
  enableVoidReturnAuth?: boolean;
  voidAuthUsername?: string | null;
  voidAuthPassword?: string | null;
  enableReturnAuth?: boolean;
  returnAuthUsername?: string | null;
  returnAuthPassword?: string | null;
  enableRecentSalesAuth?: boolean;
  recentSalesAuthUsername?: string | null;
  recentSalesAuthPassword?: string | null;
  paperSize?: '58mm' | '80mm';
  printMode?: 'browser' | 'escpos' | 'usb' | 'native';
  enableNegativeInventory?: boolean;
  enableCashCountAuth?: boolean;
  cashCountAuthUsername?: string | null;
  cashCountAuthPassword?: string | null;
  showQuantityInSearch?: boolean;
  enablePriceEditAuth?: boolean;
  priceEditAuthUsername?: string | null;
  priceEditAuthPassword?: string | null;
  enableTaxRatesAuth?: boolean;
  taxRatesAuthUsername?: string | null;
  taxRatesAuthPassword?: string | null;
  isTrainingMode?: boolean;
  printTwoReceipts?: boolean;
  nativePrinterName?: string | null;
  requireAdjustmentConfirmation?: boolean;
  requireTransferConfirmation?: boolean;
  requirePurchaseOrderConfirmation?: boolean;
  requireReceiveConfirmation?: boolean;
  requireBadOrderConfirmation?: boolean;
  requireStockCountApproval?: boolean;
}

export default function PosSetupPage() {
  const [settings, setSettings] = useState<PosSettings>({
    businessName: '',
    operatedBy: '',
    logoPath: null,
    transactionPrefix: 'TXN',
    address: '',
    contactNumber: '',
    tin: '',
    email: '',
    currentTerminalId: null,
    currentTerminalName: null,
    enableLineVoidAuth: false,
    lineVoidAuthUsername: '',
    lineVoidAuthPassword: '',
    enableVoidReturnAuth: false,
    voidAuthUsername: '',
    voidAuthPassword: '',
    enableReturnAuth: false,
    returnAuthUsername: '',
    returnAuthPassword: '',
    enableRecentSalesAuth: false,
    recentSalesAuthUsername: '',
    recentSalesAuthPassword: '',
    paperSize: '58mm',
    printMode: 'browser',
    enableNegativeInventory: false,
    enableCashCountAuth: false,
    cashCountAuthUsername: '',
    cashCountAuthPassword: '',
    showQuantityInSearch: true,
    enablePriceEditAuth: false,
    priceEditAuthUsername: '',
    priceEditAuthPassword: '',
    enableTaxRatesAuth: false,
    taxRatesAuthUsername: '',
    taxRatesAuthPassword: '',
    isTrainingMode: false,
    printTwoReceipts: false,
    nativePrinterName: 'XP-58-P',
    requireAdjustmentConfirmation: false,
    requireTransferConfirmation: false,
    requirePurchaseOrderConfirmation: false,
    requireReceiveConfirmation: false,
    requireBadOrderConfirmation: false,
    requireStockCountApproval: false
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const isFirstLoad = useRef(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  // Fetch POS settings on mount
  useEffect(() => {
    fetchSettings();
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      handleScanPrinters();
    }
  }, []);

  const handleScanPrinters = async () => {
    const api = (window as any).electronAPI;
    if (api && api.listPrinters) {
      try {
        setIsScanningPrinters(true);
        const printers = await api.listPrinters();
        setAvailablePrinters(printers);
        // Show feedback to user
        if (printers.length > 0) {
          toast({
            title: "Printers Scanned",
            description: `Found ${printers.length} available printers.`,
          });
        } else {
          toast({
            title: "No Printers Found",
            description: "No installed Windows printers were detected.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Failed to list printers:', err);
        toast({
          title: "Scan Failed",
          description: "An error occurred while scanning for printers.",
          variant: "destructive",
        });
      } finally {
        setIsScanningPrinters(false);
      }
    }
  };

  const fetchSettings = async () => {
    isRefreshingRef.current = true;
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/pos-settings'));
      const result = await response.json();
      
      if (result.success) {
        // Get local terminal
        const termId = localStorage.getItem('pos_terminal_id');
        let termName = null;
        
        if (termId) {
             const termRes = await fetch(getApiUrl(`/pos-terminals?activeOnly=true`));
             const termData = await termRes.json();
             if (termData.success) {
                 const found = termData.data.find((t:any) => t.id === termId);
                 if (found) termName = found.terminalDescription;
             }
        }

        setSettings({ ...result.data, currentTerminalId: termId, currentTerminalName: termName });
        setLogoPreview(result.data.logoPath);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load POS settings'
      });
    } finally {
      setIsLoading(false);
      // Allow a tick for state to settle before re-enabling auto-save
      setTimeout(() => { isRefreshingRef.current = false; }, 100);
    }
  };

  const handleSaveSettings = useCallback(async (settingsToSave?: typeof settings) => {
    try {
      setIsSaving(true);
      const response = await fetch(getApiUrl('/pos-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave ?? settings)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'POS settings have been updated successfully'
        });
        // Notify POS page (other tabs/windows) that settings changed
        localStorage.setItem('pos_settings_version', Date.now().toString());
        // Auto-refresh after successful save
        await fetchSettings();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save POS settings'
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Auto-save with 1.5s debounce whenever settings change
  useEffect(() => {
    // Skip on first load or when settings are being refreshed from server
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (isRefreshingRef.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const snapshot = { ...settings };
    debounceTimer.current = setTimeout(() => {
      handleSaveSettings(snapshot);
    }, 1500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [settings]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Only PNG, JPG, and JPEG files are allowed'
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'Logo file size must be less than 2MB'
      });
      return;
    }

    try {
      setIsUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getApiUrl('/pos-settings/upload-logo'), {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setSettings(prev => ({ ...prev, logoPath: result.data.logoPath }));
        toast({
          title: 'Logo Uploaded',
          description: 'Business logo has been uploaded successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to upload logo. Please try again.'
      });
      setLogoPreview(settings.logoPath);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">POS Setup</h2>
        <Button onClick={() => handleSaveSettings()} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Business Setup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Setup
            </CardTitle>
            <CardDescription>Configure your business name and logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={settings.businessName}
                onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Enter your business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operatedBy">Operated By</Label>
              <Input
                id="operatedBy"
                value={settings.operatedBy || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, operatedBy: e.target.value }))}
                placeholder="Enter operated by (e.g., Facunla Enterprise Inc.)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={settings.address || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter business address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={settings.contactNumber || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, contactNumber: e.target.value }))}
                  placeholder="Enter contact number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tin">TIN#</Label>
                <Input
                  id="tin"
                  value={settings.tin || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, tin: e.target.value }))}
                  placeholder="Enter TIN number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Business Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted relative overflow-hidden">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Business Logo"
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or JPEG (max 2MB)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Printer Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Printer Configuration
            </CardTitle>
            <CardDescription>Configure receipt printer settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="paperSize">Paper Size</Label>
                <p className="text-sm text-muted-foreground">Select the width of your thermal paper</p>
              </div>
              <div className="w-[200px]">
                <select
                  id="paperSize"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.paperSize || '58mm'}
                  onChange={(e) => setSettings(prev => ({ ...prev, paperSize: e.target.value as any }))}
                >
                  <option value="58mm">58mm (Standard Thermal)</option>
                  <option value="80mm">80mm (Wide Thermal)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="printMode">Print Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Choose how receipts are sent to the printer
                </p>
              </div>
              <div className="w-[300px]">
                <select
                  id="printMode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.printMode || 'browser'}
                  onChange={(e) => setSettings(prev => ({ ...prev, printMode: e.target.value as any }))}
                >
                  <option value="browser">Use Installed Driver (Browser Print)</option>
                  <option value="native">Native (DLL) Printer</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  * "Native (DLL)" uses the Windows Print Spooler for maximum reliability.
                  <br />
                  * Choose your specific printer driver from the list below.
                </p>
              </div>
            </div>

            {settings.printMode === 'native' && (
              <div className="flex items-center justify-between pt-4 border-t animate-in fade-in slide-in-from-top-2">
                <div className="space-y-0.5">
                  <Label htmlFor="nativePrinterName">Select Printer</Label>
                  <p className="text-sm text-muted-foreground">Choose the installed Windows printer</p>
                </div>
                <div className="flex gap-2 w-[300px]">
                  <select
                    id="nativePrinterName"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.nativePrinterName || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, nativePrinterName: e.target.value }))}
                  >
                    <option value="">-- Select Printer --</option>
                    {availablePrinters.map(printer => (
                      <option key={printer} value={printer}>{printer}</option>
                    ))}
                  </select>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleScanPrinters}
                    disabled={isScanningPrinters}
                    title="Scan for printers"
                  >
                    <Loader2 className={`h-4 w-4 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="printTwoReceipts">Print 2 Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Print two copies of the receipt during tender
                </p>
              </div>
              <Switch
                id="printTwoReceipts"
                checked={!!settings.printTwoReceipts}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, printTwoReceipts: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* General Settings (Merged Advanced & Inventory Rules) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Configure inventory and operational preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="showQuantityInSearch">Show Quantity in Search Product</Label>
                <p className="text-sm text-muted-foreground">
                  Display product quantity in the POS product search dialog
                </p>
              </div>
              <Switch
                id="showQuantityInSearch"
                checked={!!settings.showQuantityInSearch}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showQuantityInSearch: checked }))}
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="enableNegativeInventory">Allow Negative Inventory</Label>
                <p className="text-sm text-muted-foreground">
                  Allow sales even when stock is insufficient
                </p>
              </div>
              <Switch
                id="enableNegativeInventory"
                checked={settings.enableNegativeInventory}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableNegativeInventory: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transaction Confirmations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Transaction Confirmations
            </CardTitle>
            <CardDescription>Require confirmation before processing transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireAdjustmentConfirmation">Stock Adjustment Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm before saving manual stock adjustments
                </p>
              </div>
              <Switch
                id="requireAdjustmentConfirmation"
                checked={!!settings.requireAdjustmentConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireAdjustmentConfirmation: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="requireTransferConfirmation">Stock Transfer Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm before processing shelf-to-shelf transfers
                </p>
              </div>
              <Switch
                id="requireTransferConfirmation"
                checked={!!settings.requireTransferConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireTransferConfirmation: checked }))}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="requirePurchaseOrderConfirmation">Purchase Order Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm before creating a new purchase order
                </p>
              </div>
              <Switch
                id="requirePurchaseOrderConfirmation"
                checked={!!settings.requirePurchaseOrderConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requirePurchaseOrderConfirmation: checked }))}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="requireReceiveConfirmation">Receive PO Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm before receiving stock from a purchase order
                </p>
              </div>
              <Switch
                id="requireReceiveConfirmation"
                checked={!!settings.requireReceiveConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireReceiveConfirmation: checked }))}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="requireBadOrderConfirmation">Bad Order Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm before recording items as bad orders (damages/returns)
                </p>
              </div>
              <Switch
                id="requireBadOrderConfirmation"
                checked={!!settings.requireBadOrderConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireBadOrderConfirmation: checked }))}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="requireStockCountApproval">Stock Count Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Require multi-level approval before applying stock count variances
                </p>
              </div>
              <Switch
                id="requireStockCountApproval"
                checked={!!settings.requireStockCountApproval}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireStockCountApproval: checked }))}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="requireRepackagingConfirmation">Repackaging / Break Pack Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Require multi-level approval before executing stock repackaging conversions
                </p>
              </div>
              <Switch
                id="requireRepackagingConfirmation"
                checked={!!settings.requireRepackagingConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireRepackagingConfirmation: checked }))}
              />
            </div>
          </CardContent>

        </Card>


        {/* BIR Compliance (RMO 24-2023) */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <FileText className="h-5 w-5" />
              BIR Compliance (RMO 24-2023)
            </CardTitle>
            <CardDescription>Features required for BIR Cashering / POS System compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isTrainingMode" className="text-blue-900 font-semibold">Training Mode</Label>
                <p className="text-sm text-blue-700/70">
                  Transactions made in Training Mode are tagged and excluded from official totals. 
                  <br /><span className="text-xs font-bold text-red-600 font-mono">WARNING: TURN OFF BEFORE ACTUAL DEPLOYMENT</span>
                </p>
              </div>
              <Switch
                id="isTrainingMode"
                checked={!!settings.isTrainingMode}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isTrainingMode: checked }))}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>


            <div className="flex items-center justify-between pt-4 border-t border-blue-100">
              <div className="space-y-0.5">
                <Label className="text-blue-900 font-semibold">Electronic Journal (e-Journal)</Label>
                <p className="text-sm text-blue-700/70">
                  Generate daily transaction logs for BIR audit (RMO No. 24-2023)
                </p>
              </div>
              <div className="flex gap-2">
                <Input 
                   type="date" 
                   defaultValue={new Date().toISOString().split('T')[0]} 
                   className="w-[150px] bg-white"
                   id="ejournal-date"
                />
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="border-blue-200 text-blue-700 hover:bg-blue-100"
                   onClick={() => {
                      const date = (document.getElementById('ejournal-date') as HTMLInputElement)?.value;
                      if (!date) return;
                      window.open(getApiUrl(`/sales/ejournal?date=${date}&terminalId=all`), '_blank');
                   }}
                >
                   Download .txt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Configuration (Merged all security) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage authentication for sensitive actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Line Void Auth */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableLineVoidAuth">Line Void Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials to remove an item
                  </p>
                </div>
                <Switch
                  id="enableLineVoidAuth"
                  checked={!!settings.enableLineVoidAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableLineVoidAuth: checked }))}
                />
              </div>
              {settings.enableLineVoidAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="lineVoidAuthUsername">Username</Label>
                    <Input
                      id="lineVoidAuthUsername"
                      value={settings.lineVoidAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, lineVoidAuthUsername: e.target.value }))}
                      placeholder="e.g. admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lineVoidAuthPassword">Password</Label>
                    <Input
                      id="lineVoidAuthPassword"
                      type="password"
                      value={settings.lineVoidAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, lineVoidAuthPassword: e.target.value }))}
                      placeholder="e.g. 1234"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableVoidAuth">Post Void Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials to process voids
                  </p>
                </div>
                <Switch
                  id="enableVoidAuth"
                  checked={!!settings.enableVoidReturnAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableVoidReturnAuth: checked }))}
                />
              </div>
              {settings.enableVoidReturnAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="voidAuthUsername">Username</Label>
                    <Input
                      id="voidAuthUsername"
                      value={settings.voidAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, voidAuthUsername: e.target.value }))}
                      placeholder="e.g. admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voidAuthPassword">Password</Label>
                    <Input
                      id="voidAuthPassword"
                      type="password"
                      value={settings.voidAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, voidAuthPassword: e.target.value }))}
                      placeholder="e.g. 1234"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableReturnAuth">Merchandise Credit Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials to process merchandise credit
                  </p>
                </div>
                <Switch
                  id="enableReturnAuth"
                  checked={!!settings.enableReturnAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableReturnAuth: checked }))}
                />
              </div>
              {settings.enableReturnAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="returnAuthUsername">Username</Label>
                    <Input
                      id="returnAuthUsername"
                      value={settings.returnAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, returnAuthUsername: e.target.value }))}
                      placeholder="e.g. manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="returnAuthPassword">Password</Label>
                    <Input
                      id="returnAuthPassword"
                      type="password"
                      value={settings.returnAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, returnAuthPassword: e.target.value }))}
                      placeholder="e.g. 5678"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableRecentSalesAuth">Recent Sales Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials to view history
                  </p>
                </div>
                <Switch
                  id="enableRecentSalesAuth"
                  checked={!!settings.enableRecentSalesAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableRecentSalesAuth: checked }))}
                />
              </div>
              {settings.enableRecentSalesAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="recentSalesAuthUsername">Username</Label>
                    <Input
                      id="recentSalesAuthUsername"
                      value={settings.recentSalesAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, recentSalesAuthUsername: e.target.value }))}
                      placeholder="e.g. supervisor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recentSalesAuthPassword">Password</Label>
                    <Input
                      id="recentSalesAuthPassword"
                      type="password"
                      value={settings.recentSalesAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, recentSalesAuthPassword: e.target.value }))}
                      placeholder="e.g. 4321"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableCashCountAuth">Cash Count Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials for end shift
                  </p>
                </div>
                <Switch
                  id="enableCashCountAuth"
                  checked={!!settings.enableCashCountAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableCashCountAuth: checked }))}
                />
              </div>
              {settings.enableCashCountAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="cashCountAuthUsername">Username</Label>
                    <Input
                      id="cashCountAuthUsername"
                      value={settings.cashCountAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, cashCountAuthUsername: e.target.value }))}
                      placeholder="e.g. auditor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashCountAuthPassword">Password</Label>
                    <Input
                      id="cashCountAuthPassword"
                      type="password"
                      value={settings.cashCountAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, cashCountAuthPassword: e.target.value }))}
                      placeholder="e.g. 9999"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enablePriceEditAuth">Edit Price Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials to edit item price
                  </p>
                </div>
                <Switch
                  id="enablePriceEditAuth"
                  checked={!!settings.enablePriceEditAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enablePriceEditAuth: checked }))}
                />
              </div>
              {settings.enablePriceEditAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="priceEditAuthUsername">Username</Label>
                    <Input
                      id="priceEditAuthUsername"
                      value={settings.priceEditAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, priceEditAuthUsername: e.target.value }))}
                      placeholder="e.g. manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceEditAuthPassword">Password</Label>
                    <Input
                      id="priceEditAuthPassword"
                      type="password"
                      value={settings.priceEditAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, priceEditAuthPassword: e.target.value }))}
                      placeholder="e.g. 1234"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableTaxRatesAuth">Tax Rates Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require credentials to manage tax rates
                  </p>
                </div>
                <Switch
                  id="enableTaxRatesAuth"
                  checked={!!settings.enableTaxRatesAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableTaxRatesAuth: checked }))}
                />
              </div>
              {settings.enableTaxRatesAuth && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="taxRatesAuthUsername">Username</Label>
                    <Input
                      id="taxRatesAuthUsername"
                      value={settings.taxRatesAuthUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, taxRatesAuthUsername: e.target.value }))}
                      placeholder="e.g. admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxRatesAuthPassword">Password</Label>
                    <Input
                      id="taxRatesAuthPassword"
                      type="password"
                      value={settings.taxRatesAuthPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, taxRatesAuthPassword: e.target.value }))}
                      placeholder="e.g. 1234"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Management Section */}
        {/* Terminals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">POS Terminals</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Configure which terminal this computer represents.
            </CardDescription>
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-slate-700">
                {settings.currentTerminalId ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <Monitor className="h-4 w-4" />
                    {settings.currentTerminalName || 'Linked (Loading...)'}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Not Linked to any Terminal</span>
                )}
              </div>
              {!settings.currentTerminalId && (
                <TerminalSettingsDialog
                  currentTerminalId={settings.currentTerminalId || null}
                  onTerminalChanged={(id) => {
                    setSettings(prev => ({ ...prev, currentTerminalId: id, currentTerminalName: id ? 'Updated' : null }));
                    if (id) window.location.reload();
                  }}
                />
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Link href="/settings/pos-terminals">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
                    <span className="text-xs font-medium">Manage All Terminals</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management Cards – 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Transaction Reference */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaction Reference</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Configure transaction number format and prefix
              </CardDescription>
              <div className="flex justify-end">
                <ManageTransactionReferenceDialog onUpdated={fetchSettings} />
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Terms</CardTitle>
              <span className="h-4 w-4 text-muted-foreground text-sm font-semibold leading-none flex items-center justify-center">₱</span>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Configure payment terms and conditions
              </CardDescription>
              <div className="flex justify-end">
                <ManagePaymentTermsDialog onPaymentTermsUpdated={fetchSettings} />
              </div>
            </CardContent>
          </Card>

          {/* POS Payment Type */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">POS Payment Type</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Manage accepted payment methods
              </CardDescription>
              <div className="flex justify-end">
                <ManagePaymentMethodsDialog
                  onChange={fetchSettings}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
                      <span className="text-xs font-medium">Manage</span>
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Sales Person */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Person</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Manage sales representatives
              </CardDescription>
              <div className="flex justify-end">
                <ManageSalesPersonsDialog
                  onChange={fetchSettings}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
                      <span className="text-xs font-medium">Manage</span>
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
