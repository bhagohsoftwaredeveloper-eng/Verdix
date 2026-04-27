
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, AlertCircle, CheckCircle2, Save, RefreshCw, Upload, Download, HardDrive, Clock, FileText, Globe, Key, Lock, Link as LinkIcon, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getApiUrl } from '@/lib/api-config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BackupFile = {
  name: string;
  size: number;
  created: string;
};

type BackupSchedule = {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
  dayOfWeek?: number;
};

export default function DataManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'error'>('none');
  const [statusMessage, setStatusMessage] = useState('');

  // Export states
  const [exporting, setExporting] = useState(false);
  const [customerExporting, setCustomerExporting] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [customerImportFile, setCustomerImportFile] = useState<File | null>(null);
  const [customerImporting, setCustomerImporting] = useState(false);
  const [supplierExporting, setSupplierExporting] = useState(false);
  const [supplierImportFile, setSupplierImportFile] = useState<File | null>(null);
  const [supplierImporting, setSupplierImporting] = useState(false);

  // Backup states
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [schedule, setSchedule] = useState<BackupSchedule>({
    enabled: false,
    frequency: 'daily',
    time: '23:00',
    dayOfWeek: 0
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'stock_pilot'
  });

  // API Config states
  const [apiConfig, setApiConfig] = useState({
    url: '',
    key: '',
    secret: ''
  });
  const [savingApiConfig, setSavingApiConfig] = useState(false);

  // Reset Data states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetAction, setResetAction] = useState<'clear_sales' | 'reset_references' | 'clear_inventory' | 'clear_master_data' | 'factory_reset' | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(getApiUrl('/data-management/export/products'));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to export');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your product list has been downloaded.",
      });
      
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const uploadProducts = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch(getApiUrl('/data-management/import/products'), {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        setImportFile(null);
        // Optional: Reset file input value if we had a ref
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "Network error during upload",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCustomerExport = async () => {
    setCustomerExporting(true);
    try {
      const res = await fetch(getApiUrl('/data-management/export/customers'));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to export');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your customer list has been downloaded.",
      });
      
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCustomerExporting(false);
    }
  };

  const handleCustomerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCustomerImportFile(e.target.files[0]);
    }
  };

  const uploadCustomers = async () => {
    if (!customerImportFile) return;

    setCustomerImporting(true);
    const formData = new FormData();
    formData.append('file', customerImportFile);

    try {
      const res = await fetch(getApiUrl('/data-management/import/customers'), {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        setCustomerImportFile(null);
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "Network error during upload",
        variant: "destructive",
      });
    } finally {
      setCustomerImporting(false);
    }
  };

  const handleSupplierExport = async () => {
    setSupplierExporting(true);
    try {
      const res = await fetch(getApiUrl('/data-management/export/suppliers'));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to export');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'suppliers.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your supplier list has been downloaded.",
      });
      
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSupplierExporting(false);
    }
  };

  const handleSupplierFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSupplierImportFile(e.target.files[0]);
    }
  };

  const uploadSuppliers = async () => {
    if (!supplierImportFile) return;

    setSupplierImporting(true);
    const formData = new FormData();
    formData.append('file', supplierImportFile);

    try {
      const res = await fetch(getApiUrl('/data-management/import/suppliers'), {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        setSupplierImportFile(null);
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "Network error during upload",
        variant: "destructive",
      });
    } finally {
      setSupplierImporting(false);
    }
  };

  useEffect(() => {
    // Fetch current config
    const fetchConfig = async () => {
      try {
        const res = await fetch(getApiUrl('/settings/database'));
        if (res.ok) {
          const data = await res.json();
          setDbConfig(prev => ({
            ...prev,
            host: data.host,
            port: data.port,
            user: data.user,
            database: data.database,
            password: data.hasPassword ? '' : '' 
          }));
        }
      } catch (error) {
        console.error('Failed to load database config', error);
      }
    };
    
    fetchConfig();
    fetchBackups();
    fetchSchedule();
    fetchApiConfig();
  }, []);

  const fetchApiConfig = async () => {
    try {
      const res = await fetch(getApiUrl('/settings/api-connection'));
      if (res.ok) {
        const data = await res.json();
        setApiConfig(data);
      }
    } catch (error) {
      console.error('Failed to load API config', error);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch(getApiUrl('/settings/backup/files'));
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (error) {
       console.error('Failed to load backups', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch(getApiUrl('/settings/backup/schedule'));
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      }
    } catch (error) {
       console.error('Failed to load schedule', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDbConfig(prev => ({ ...prev, [name]: value }));
    if (connectionStatus !== 'none') {
      setConnectionStatus('none');
      setStatusMessage('');
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('none');
    setStatusMessage('');

    try {
      const res = await fetch(getApiUrl('/settings/database'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dbConfig, action: 'test' })
      });

      const data = await res.json();

      if (res.ok) {
        setConnectionStatus('success');
        setStatusMessage(data.message);
        toast({
          title: "Connection Successful",
          description: "Successfully connected to the database.",
          variant: "default",
        });
      } else {
        setConnectionStatus('error');
        setStatusMessage(data.message);
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage('Network error occurred');
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/settings/database'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dbConfig, action: 'save' })
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Settings Saved",
          description: data.message,
        });
      } else {
        toast({
          title: "Error Saving",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch(getApiUrl('/settings/backup/manual'), { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Backup Created",
          description: "Database backup created successfully.",
        });
        fetchBackups();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch(getApiUrl('/settings/backup/schedule'), { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      
      if (res.ok) {
        toast({
          title: "Schedule Saved",
          description: "Backup schedule updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save schedule",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const downloadBackup = (filename: string) => {
    window.location.href = getApiUrl(`/settings/backup/download/${filename}`);
  };

  const openRestoreDialog = (filename: string) => {
    setBackupToRestore(filename);
    setRestoreConfirmText('');
    setRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!backupToRestore) return;
    setRestoringBackup(true);
    try {
      const res = await fetch(getApiUrl('/settings/backup/restore'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: backupToRestore })
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Restore Successful",
          description: data.message,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore database",
        variant: "destructive",
      });
    } finally {
      setRestoringBackup(false);
      setRestoreDialogOpen(false);
      setBackupToRestore(null);
      setRestoreConfirmText('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleApiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiConfig(prev => ({ ...prev, [name]: value }));
  };

  const saveApiConfiguration = async () => {
    setSavingApiConfig(true);
    try {
      const res = await fetch(getApiUrl('/settings/api-connection'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiConfig)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "API Settings Saved",
          description: data.message,
        });
      } else {
        toast({
          title: "Error Saving",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API settings",
        variant: "destructive",
      });
    } finally {
      setSavingApiConfig(false);
    }
  };

  const openResetDialog = (action: 'clear_sales' | 'reset_references' | 'clear_inventory' | 'clear_master_data' | 'factory_reset') => {
    setResetAction(action);
    setResetConfirmText('');
    setResetDialogOpen(true);
  };

  const handleResetData = async () => {
    if (!resetAction) return;
    
    setResetLoading(true);
    try {
      const res = await fetch(getApiUrl('/data-management/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resetAction })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Reset Successful",
          description: data.message,
        });
      } else {
         throw new Error(data.error || "Reset failed");
      }
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
      setResetDialogOpen(false);
      setResetAction(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data Management</h2>
        <Badge variant="outline" className="text-sm">
          <Database className="mr-1 h-4 w-4" />
          System Data
        </Badge>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">Database Connection</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="import-export">Import & Export</TabsTrigger>
          <TabsTrigger value="api-connection">API Integration</TabsTrigger>
          <TabsTrigger value="reset">Reset Data</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>
                Configure the connection details for your MySQL database. 
                <br />
                <span className="text-destructive font-medium">Warning:</span> Changing these settings requires a server restart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionStatus === 'success' && (
                <Alert className="border-green-500 bg-green-50 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}
              {connectionStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input 
                    id="host" 
                    name="host" 
                    value={dbConfig.host} 
                    onChange={handleInputChange} 
                    placeholder="localhost" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input 
                    id="port" 
                    name="port" 
                    value={dbConfig.port} 
                    onChange={handleInputChange} 
                    placeholder="3306" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user">Username</Label>
                  <Input 
                    id="user" 
                    name="user" 
                    value={dbConfig.user} 
                    onChange={handleInputChange} 
                    placeholder="root" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password"
                    value={dbConfig.password} 
                    onChange={handleInputChange} 
                    placeholder="Use existing if empty" 
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Leave empty to keep the current password.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="database">Database Name</Label>
                  <Input 
                    id="database" 
                    name="database" 
                    value={dbConfig.database} 
                    onChange={handleInputChange} 
                    placeholder="stock_pilot" 
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={testConnection} 
                disabled={isTesting || loading}
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Testing...
                  </>
                ) : (
                  <>Test Connection</>
                )}
              </Button>
              <Button 
                onClick={saveConfiguration} 
                disabled={isTesting || loading}
              >
                {loading ? (
                  <>
                     <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
             <Card>
              <CardHeader>
                <CardTitle>Automatic Backup Schedule</CardTitle>
                <CardDescription>
                  Configure when to automatically backup your database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="backup-enabled" className="flex flex-col gap-1">
                    <span>Enable Scheduled Backups</span>
                    <span className="font-normal text-xs text-muted-foreground">Backups will run automatically</span>
                  </Label>
                  <Switch 
                    id="backup-enabled" 
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
                
                <div className="space-y-2">
                   <Label>Frequency</Label>
                   <Select 
                      value={schedule.frequency} 
                      onValueChange={(val: 'daily' | 'weekly') => setSchedule(prev => ({ ...prev, frequency: val }))}
                      disabled={!schedule.enabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                   </Select>
                </div>

                {schedule.frequency === 'weekly' && (
                   <div className="space-y-2">
                     <Label>Day of Week</Label>
                     <Select 
                        value={schedule.dayOfWeek?.toString()} 
                        onValueChange={(val) => setSchedule(prev => ({ ...prev, dayOfWeek: parseInt(val) }))}
                        disabled={!schedule.enabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                )}

                <div className="space-y-2">
                   <Label>Time (24h)</Label>
                   <Input 
                      type="time" 
                      value={schedule.time} 
                      onChange={(e) => setSchedule(prev => ({ ...prev, time: e.target.value }))}
                      disabled={!schedule.enabled}
                   />
                </div>
              </CardContent>
              <CardFooter>
                 <Button onClick={saveSchedule} disabled={savingSchedule} className="ml-auto">
                    {savingSchedule ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />} 
                    Save Schedule
                 </Button>
              </CardFooter>
             </Card>

             <Card>
              <CardHeader>
                <CardTitle>Manual Backup</CardTitle>
                <CardDescription>
                  Create an immediate backup or manage existing files.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                   className="w-full" 
                   variant="outline" 
                   onClick={createBackup}
                   disabled={creatingBackup}
                >
                   {creatingBackup ? (
                      <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Creating Backup...</>
                   ) : (
                      <><HardDrive className="mr-2 h-4 w-4" /> Create Backup Now</>
                   )}
                </Button>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Backups</h4>
                  <div className="border rounded-md divide-y max-h-[250px] overflow-y-auto">
                     {backups.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                           No backups found.
                        </div>
                     ) : (
                        backups.map((file) => (
                           <div key={file.name} className="flex items-center justify-between p-3 text-sm">
                              <div className="flex items-center gap-2 overflow-hidden">
                                 <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                 <div className="flex flex-col truncate">
                                    <span className="truncate font-medium">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                       {format(new Date(file.created), 'MMM d, yyyy HH:mm')} • {formatFileSize(file.size)}
                                    </span>
                                 </div>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => openRestoreDialog(file.name)}
                                  className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                  title="Restore this backup"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => downloadBackup(file.name)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
                </div>
              </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import & Export</CardTitle>
              <CardDescription>
                Manage your data in bulk using CSV files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Products Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Products</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="font-medium flex items-center">
                      <Download className="mr-2 h-4 w-4 text-blue-500" /> Export Products
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Download your entire product list as a CSV file.
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleExport}
                      disabled={exporting}
                    >
                      {exporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4 text-blue-500" />} 
                      Export CSV
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="font-medium flex items-center">
                      <Upload className="mr-2 h-4 w-4 text-green-500" /> Import Products
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add new products via CSV upload. Duplicate SKUs will be skipped.
                    </div>
                    <div className="flex gap-2">
                       <Input 
                          type="file" 
                          accept=".csv" 
                          onChange={handleFileUpload}
                          disabled={importing}
                       />
                       <Button onClick={uploadProducts} disabled={!importFile || importing}>
                          {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Import'}
                       </Button>
                    </div>
                  </div>
                </div>
              </div>

                {/* Customers Section */}
                <div className="space-y-4">
                 <h3 className="text-lg font-medium border-b pb-2">Customers</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg space-y-3">
                       <div className="font-medium flex items-center text-blue-600">
                         <Download className="mr-2 h-4 w-4" /> Export Customers
                       </div>
                       <div className="text-sm text-muted-foreground">
                         Download your entire customer list as a CSV file.
                       </div>
                       <Button 
                         variant="outline" 
                         className="w-full"
                         onClick={handleCustomerExport}
                         disabled={customerExporting}
                       >
                         {customerExporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                         Export CSV
                       </Button>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3">
                       <div className="font-medium flex items-center text-green-600">
                         <Upload className="mr-2 h-4 w-4" /> Import Customers
                       </div>
                       <div className="text-sm text-muted-foreground">
                         Add/Update customers via CSV. Use `id` as unique identifier.
                       </div>
                       <div className="flex gap-2">
                          <Input 
                             type="file" 
                             accept=".csv" 
                             onChange={handleCustomerFileUpload}
                             disabled={customerImporting}
                          />
                          <Button onClick={uploadCustomers} disabled={!customerImportFile || customerImporting} variant="secondary">
                             {customerImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Import'}
                          </Button>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Suppliers Section */}
                <div className="space-y-4">
                 <h3 className="text-lg font-medium border-b pb-2">Suppliers</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg space-y-3">
                       <div className="font-medium flex items-center text-blue-600">
                         <Download className="mr-2 h-4 w-4" /> Export Suppliers
                       </div>
                       <div className="text-sm text-muted-foreground">
                         Download your entire supplier list as a CSV file.
                       </div>
                       <Button 
                         variant="outline" 
                         className="w-full"
                         onClick={handleSupplierExport}
                         disabled={supplierExporting}
                       >
                         {supplierExporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                         Export CSV
                       </Button>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3">
                       <div className="font-medium flex items-center text-green-600">
                         <Upload className="mr-2 h-4 w-4" /> Import Suppliers
                       </div>
                       <div className="text-sm text-muted-foreground">
                         Add/Update suppliers via CSV. Use `name` as unique identifier.
                       </div>
                       <div className="flex gap-2">
                          <Input 
                             type="file" 
                             accept=".csv" 
                             onChange={handleSupplierFileUpload}
                             disabled={supplierImporting}
                          />
                          <Button onClick={uploadSuppliers} disabled={!supplierImportFile || supplierImporting} variant="secondary">
                             {supplierImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Import'}
                          </Button>
                       </div>
                    </div>
                  </div>
                </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Connection Setup</CardTitle>
              <CardDescription>
                Configure the connection details for the external API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">API URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="api-url" 
                      name="url" 
                      className="pl-9"
                      value={apiConfig.url} 
                      onChange={handleApiInputChange} 
                      placeholder="https://api.example.com" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="api-key" 
                      name="key" 
                      className="pl-9"
                      value={apiConfig.key} 
                      onChange={handleApiInputChange} 
                      placeholder="Enter your API Key" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-secret">API Secret</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="api-secret" 
                      name="secret" 
                      type="password"
                      className="pl-9"
                      value={apiConfig.secret} 
                      onChange={handleApiInputChange} 
                      placeholder="Enter your API Secret" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveApiConfiguration} disabled={savingApiConfig}>
                {savingApiConfig ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" /> Save Connection
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="reset" className="space-y-4">
          <Card>
             <CardHeader>
               <CardTitle>Danger Zone</CardTitle>
               <CardDescription>
                 Destructive actions to reset system data. These actions cannot be undone.
               </CardDescription>
             </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="border border-red-200 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center justify-between">
                     <div>
                         <h3 className="text-lg font-medium text-red-900 dark:text-red-200">Clear Sales Data</h3>
                         <p className="text-sm text-red-700 dark:text-red-300">
                            Deletes all sales transactions (POS, Orders, Invoices), payments, shifts, readings, and related approval queue items.
                         </p>
                     </div>
                     <Button variant="destructive" onClick={() => openResetDialog('clear_sales')}>
                        <Trash2 className="mr-2 h-4 w-4" /> Clear Sales
                     </Button>
                  </div>
                </div>

                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-medium text-orange-900 dark:text-orange-200">Reset Transaction References</h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                           Resets all transaction counters and terminal OR numbers to default values.
                        </p>
                     </div>
                     <Button variant="outline" className="border-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300" onClick={() => openResetDialog('reset_references')}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset References
                     </Button>
                  </div>
                </div>

                <div className="border border-red-200 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center justify-between">
                     <div>
                         <h3 className="text-lg font-medium text-red-900 dark:text-red-200">Delete Inventory</h3>
                         <p className="text-sm text-red-700 dark:text-red-300">
                            Deletes ALL products, stock history, adjustments, transfers, counts, and product shelves.
                         </p>
                     </div>
                     <Button variant="destructive" onClick={() => openResetDialog('clear_inventory')}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Inventory
                     </Button>
                  </div>
                </div>

                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-medium text-orange-900 dark:text-orange-200">Clear Master Data</h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                           Deletes all Customers, Suppliers, Categories, Brands, Units, and Shelf Locations.
                        </p>
                     </div>
                     <Button variant="outline" className="border-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300" onClick={() => openResetDialog('clear_master_data')}>
                        <Database className="mr-2 h-4 w-4" /> Clear Master Data
                     </Button>
                  </div>
                </div>

                <div className="border-2 border-destructive rounded-lg p-6 bg-destructive/5">
                  <div className="flex items-center justify-between">
                     <div className="flex-1 mr-4">
                         <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <h3 className="text-xl font-bold text-destructive">Full Factory Reset</h3>
                         </div>
                         <p className="text-sm font-medium text-muted-foreground">
                            This will wipe ALL data from the system except for existing user accounts and basic system settings. 
                            The system will be returned to its initial empty state.
                         </p>
                     </div>
                     <Button variant="destructive" size="lg" className="px-8 shadow-lg shadow-destructive/20" onClick={() => openResetDialog('factory_reset')}>
                        <HardDrive className="mr-2 h-5 w-5" /> FACTORY RESET
                     </Button>
                  </div>
                </div>

              </CardContent>
           </Card>
         </TabsContent>
       </Tabs>
 
       <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
         <AlertDialogContent className="max-w-md">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Confirm Destructive Action
             </AlertDialogTitle>
             <AlertDialogDescription className="text-base text-foreground font-medium pt-2">
               {resetAction === 'clear_sales' && "This will permanently delete all sales history, shift records, and transaction logs including approval items related to sales."}
               {resetAction === 'reset_references' && "This will reset all transaction counters and terminal OR numbers. This may cause collision if you have existing records."}
               {resetAction === 'clear_inventory' && "This will permanently delete ALL products, stock movements, transfers, and warehouse management data."}
               {resetAction === 'clear_master_data' && "This will permanently delete all customer and supplier records, product categories, and brand definitions."}
               {resetAction === 'factory_reset' && "CRITICAL: This will wipe the ENTIRE database (Transactions, Products, Customers, Suppliers, etc.). This action is IRREVERSIBLE."}
             </AlertDialogDescription>
             <div className="py-4 space-y-2">
                 <p className="text-sm text-muted-foreground">
                    This action cannot be undone. To prevent accidental data loss, please type <span className="font-bold text-destructive underline">CONFIRM</span> below.
                 </p>
                 <Input 
                    id="confirm-text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Type CONFIRM here"
                    className="border-destructive/50 focus-visible:ring-destructive"
                    autoComplete="off"
                 />
             </div>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="font-semibold">Cancel and Keep My Data</AlertDialogCancel>
             <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-8"
                onClick={handleResetData}
                disabled={resetConfirmText !== 'CONFIRM' || resetLoading}
             >
               {resetLoading ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
               ) : (
                  "Yes, Proceed with Reset"
               )}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">Restore Database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite your current database with the data from <span className="font-bold">{backupToRestore}</span>. 
              All data added after this backup was created will be permanently lost.
            </AlertDialogDescription>
            <div className="py-2">
                <Label htmlFor="restore-confirm-text" className="text-xs text-muted-foreground mb-1 block">
                   Type <span className="font-bold text-orange-600">RESTORE</span> to proceed
                </Label>
                <Input 
                   id="restore-confirm-text"
                   value={restoreConfirmText}
                   onChange={(e) => setRestoreConfirmText(e.target.value)}
                   placeholder="Type RESTORE"
                   autoComplete="off"
                />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
               className="bg-orange-600 text-white hover:bg-orange-700"
               onClick={handleRestore}
               disabled={restoreConfirmText !== 'RESTORE' || restoringBackup}
            >
              {restoringBackup ? "Restoring..." : "Confirm Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
