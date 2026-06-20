'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { usePosSetup } from './use-pos-setup';
import { BusinessSetupCard } from './BusinessSetupCard';
import { GeneralSettingsCard } from './GeneralSettingsCard';
import { TransactionConfirmationsCard } from './TransactionConfirmationsCard';
import { BatchCostingCard } from './BatchCostingCard';
import { BirComplianceCard } from './BirComplianceCard';
import { SecuritySettingsCard } from './SecuritySettingsCard';
import { TerminalCard } from './TerminalCard';
import { CustomerDisplayCard } from './CustomerDisplayCard';
import { DataManagementGrid } from './DataManagementGrid';

export default function PosSetupPage() {
  const { settings, set, isLoading, isSaving, isUploading, logoPreview, handleSave, handleLogoUpload, fetchSettings } = usePosSetup();

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
        <Button onClick={() => handleSave()} disabled={isSaving}>
          {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Settings'}
        </Button>
      </div>

      <div className="space-y-4">
        <BusinessSetupCard settings={settings} set={set} logoPreview={logoPreview} isUploading={isUploading} onLogoUpload={handleLogoUpload} />
        <GeneralSettingsCard settings={settings} set={set} />
        <TransactionConfirmationsCard settings={settings} set={set} />
        <BatchCostingCard settings={settings} set={set} />
        <BirComplianceCard settings={settings} set={set} />
        <SecuritySettingsCard settings={settings} set={set} />
        <TerminalCard currentTerminalId={settings.currentTerminalId} currentTerminalName={settings.currentTerminalName} set={set} />
        <CustomerDisplayCard settings={settings} set={set} />
        <DataManagementGrid onRefresh={fetchSettings} />
      </div>
    </div>
  );
}
