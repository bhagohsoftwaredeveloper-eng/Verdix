'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Upload } from 'lucide-react';
import Image from 'next/image';
import type { PosSettings } from './pos-setup-types';

type SetFn = <K extends keyof PosSettings>(key: K, value: PosSettings[K]) => void;

interface Props {
  settings: PosSettings;
  set: SetFn;
  logoPreview: string | null;
  isUploading: boolean;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BusinessSetupCard({ settings, set, logoPreview, isUploading, onLogoUpload }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Business Setup</CardTitle>
        <CardDescription>Configure your business name and logo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input id="businessName" value={settings.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Enter your business name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="operatedBy">Operated By</Label>
          <Input id="operatedBy" value={settings.operatedBy || ''} onChange={e => set('operatedBy', e.target.value)} placeholder="Enter operated by (e.g., Facunla Enterprise Inc.)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={settings.address || ''} onChange={e => set('address', e.target.value)} placeholder="Enter business address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" value={settings.contactNumber || ''} onChange={e => set('contactNumber', e.target.value)} placeholder="Enter contact number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">TIN#</Label>
            <Input id="tin" value={settings.tin || ''} onChange={e => set('tin', e.target.value)} placeholder="Enter TIN number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={settings.email || ''} onChange={e => set('email', e.target.value)} placeholder="Enter email address" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salesOrderTerms">Sales Order Terms &amp; Conditions</Label>
          <Textarea
            id="salesOrderTerms"
            value={settings.salesOrderTerms || ''}
            onChange={e => set('salesOrderTerms', e.target.value)}
            placeholder="Enter the default terms and conditions printed on sales orders, delivery notes and invoices"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">Shown in the Terms and Conditions section of the sales order / invoice printout.</p>
        </div>

        <div className="space-y-2">
          <Label>Business Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted relative overflow-hidden">
              {logoPreview ? (
                <Image src={logoPreview} alt="Business Logo" fill sizes="128px" priority className="object-contain p-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input type="file" accept="image/png,image/jpeg,image/jpg" onChange={onLogoUpload} disabled={isUploading} className="cursor-pointer" />
              <p className="text-xs text-muted-foreground">PNG, JPG or JPEG (max 2MB)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
