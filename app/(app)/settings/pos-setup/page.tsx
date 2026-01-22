'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Building2, Settings, FileText, Monitor, MapPin, Users, CreditCard, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ManageTransactionReferenceDialog } from './manage-transaction-reference-dialog';
import { AddSalesAreaDialog } from '../../customer/list/add-sales-area-dialog';
import { AddSalesGroupDialog } from '../../customer/list/add-sales-group-dialog';
import { ManageSalesPersonsDialog } from './manage-sales-persons-dialog';
import { ManagePaymentTermsDialog } from './manage-payment-terms-dialog';
import { ManagePaymentMethodsDialog } from '../../sales/ManagePaymentMethodsDialog';
import { TerminalSettingsDialog } from './terminal-settings-dialog';

interface PosSettings {
  businessName: string;
  logoPath: string | null;
  enableAdvancedInventory: boolean;
  transactionPrefix: string;
  address: string | null;
  contactNumber: string | null;
  tin: string | null;
  email: string | null;
  currentTerminalId?: string | null;
  currentTerminalName?: string | null;
}

export default function PosSetupPage() {
  const [settings, setSettings] = useState<PosSettings>({
    businessName: '',
    logoPath: null,
    enableAdvancedInventory: false,
    transactionPrefix: 'TXN',
    address: '',
    contactNumber: '',
    tin: '',
    email: '',
    currentTerminalId: null,
    currentTerminalName: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch POS settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pos-settings');
      const result = await response.json();
      
      if (result.success) {
        // Get local terminal
        const termId = localStorage.getItem('pos_terminal_id');
        let termName = null;
        
        if (termId) {
             const termRes = await fetch(`/api/pos-terminals?activeOnly=true`);
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
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/pos-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'POS settings have been updated successfully'
        });
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
  };

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

      const response = await fetch('/api/pos-settings/upload-logo', {
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
        <Button onClick={handleSaveSettings} disabled={isSaving}>
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

      {/* Advanced Inventory Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Features
          </CardTitle>
          <CardDescription>Enable or disable advanced POS features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="advancedInventory">Advanced Inventory</Label>
              <p className="text-sm text-muted-foreground">
                Enable batch tracking, serial numbers, and multi-location inventory
              </p>
            </div>
            <Switch
              id="advancedInventory"
              checked={settings.enableAdvancedInventory}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableAdvancedInventory: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Setup Sections */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction Reference</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Configure transaction number format and prefix
            </CardDescription>
            <ManageTransactionReferenceDialog />
          </CardContent>
        </Card>

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
                            if(id) window.location.reload(); 
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Area</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Define sales territories and regions
            </CardDescription>
            <AddSalesAreaDialog onAreaAdded={() => {}} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Group</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Organize sales teams and groups
            </CardDescription>
            <AddSalesGroupDialog onGroupAdded={() => {}} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Person</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Manage sales representatives
            </CardDescription>
            <ManageSalesPersonsDialog />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Terms</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Configure payment terms and conditions
            </CardDescription>
            <ManagePaymentTermsDialog />
          </CardContent>
        </Card>

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
  );
}
