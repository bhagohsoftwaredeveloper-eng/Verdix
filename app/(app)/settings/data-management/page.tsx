'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataManagement } from './use-data-management';
import { DatabaseConnectionTab } from './DatabaseConnectionTab';
import { BackupTab } from './BackupTab';
import { ImportExportTab } from './ImportExportTab';
import { ResetDataTab } from './ResetDataTab';
import { ResetDataDialog } from './ResetDataDialog';
import { RestoreDialog } from './RestoreDialog';

export default function DataManagementPage() {
  const m = useDataManagement();

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Management</h2>
        <p className="text-muted-foreground">Manage your database, backups, imports, and system resets.</p>
      </div>

      <Tabs defaultValue="database">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="import-export">Import & Export</TabsTrigger>
          <TabsTrigger value="reset">Reset Data</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4 pt-4">
          <DatabaseConnectionTab
            dbConfig={m.dbConfig}
            connectionStatus={m.connectionStatus}
            statusMessage={m.statusMessage}
            loading={m.loading}
            isTesting={m.isTesting}
            onInputChange={m.handleInputChange}
            onTest={m.testConnection}
            onSave={m.saveConfiguration}
          />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4 pt-4">
          <BackupTab
            backups={m.backups}
            creatingBackup={m.creatingBackup}
            schedule={m.schedule}
            setSchedule={m.setSchedule}
            savingSchedule={m.savingSchedule}
            onCreateBackup={m.createBackup}
            onSaveSchedule={m.saveSchedule}
            onDownload={m.downloadBackup}
            onOpenRestore={m.openRestoreDialog}
            formatFileSize={m.formatFileSize}
          />
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4 pt-4">
          <ImportExportTab
            exporting={m.exporting} importFile={m.importFile} importing={m.importing}
            onExport={m.handleExport} onFileChange={m.handleFileUpload} onImport={m.uploadProducts}
            customerExporting={m.customerExporting} customerImportFile={m.customerImportFile} customerImporting={m.customerImporting}
            onCustomerExport={m.handleCustomerExport} onCustomerFileChange={m.handleCustomerFileUpload} onCustomerImport={m.uploadCustomers}
            supplierExporting={m.supplierExporting} supplierImportFile={m.supplierImportFile} supplierImporting={m.supplierImporting}
            onSupplierExport={m.handleSupplierExport} onSupplierFileChange={m.handleSupplierFileUpload} onSupplierImport={m.uploadSuppliers}
          />
        </TabsContent>

        <TabsContent value="reset" className="space-y-4 pt-4">
          <ResetDataTab onOpenResetDialog={m.openResetDialog} />
        </TabsContent>
      </Tabs>

      <ResetDataDialog
        open={m.resetDialogOpen}
        onOpenChange={m.setResetDialogOpen}
        resetAction={m.resetAction}
        confirmText={m.resetConfirmText}
        onConfirmTextChange={m.setResetConfirmText}
        resetWithBackup={m.resetWithBackup}
        onResetWithBackupChange={m.setResetWithBackup}
        loading={m.resetLoading}
        onConfirm={m.handleResetData}
      />

      <RestoreDialog
        open={m.restoreDialogOpen}
        onOpenChange={m.setRestoreDialogOpen}
        backupToRestore={m.backupToRestore}
        confirmText={m.restoreConfirmText}
        onConfirmTextChange={m.setRestoreConfirmText}
        restoring={m.restoringBackup}
        onConfirm={m.handleRestore}
      />
    </div>
  );
}
