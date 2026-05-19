
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Server, Settings, CheckCircle2, XCircle, RefreshCw, Network, Monitor, Printer, ScanLine } from 'lucide-react';
import { DEFAULT_API_BASE_URL, getApiUrl, formatApiUrl } from '@/lib/api-config';

type PrinterMode = 'browser' | 'escpos' | 'usb' | 'native' | 'epson';

interface ConnectionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionSettingsDialog({ open, onOpenChange }: ConnectionSettingsDialogProps) {
  const [serverIp, setServerIp] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [isLoadingTerminals, setIsLoadingTerminals] = useState(false);
  const [manualTerminalIp, setManualTerminalIp] = useState('');

  // Printer settings
  const [printerMode, setPrinterMode] = useState<PrinterMode>('native');
  const [printerName, setPrinterName] = useState('');
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [printTwoReceipts, setPrintTwoReceipts] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isDiscoveringPrinters, setIsDiscoveringPrinters] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const savedIp = localStorage.getItem('server_ip') || '';
      setServerIp(savedIp);
      setTestResult(null);
      fetchTerminals();

      const savedMode = (localStorage.getItem('pos_printer_mode') as PrinterMode) || 'native';
      const savedName = localStorage.getItem('pos_printer_name') || '';
      const savedPaper = (localStorage.getItem('pos_paper_size') as '58mm' | '80mm') || '58mm';
      const savedTwoReceipts = localStorage.getItem('pos_print_two_receipts') === 'true';
      setPrinterMode(savedMode);
      setPrinterName(savedName);
      setPaperSize(savedPaper);
      setPrintTwoReceipts(savedTwoReceipts);
      setAvailablePrinters([]);
    }
  }, [open]);

  useEffect(() => {
    if (open && terminals.length > 0) {
      const savedTerminalId = localStorage.getItem('pos_terminal_id');
      const terminal = terminals.find(t => t.id === savedTerminalId);
      if (terminal) {
        setManualTerminalIp(terminal.ipAddress || '');
      }
    }
  }, [open, terminals]);

  const fetchTerminals = async () => {
    setIsLoadingTerminals(true);
    try {
      const response = await fetch(getApiUrl('/pos-terminals?activeOnly=true'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setTerminals(result.data);
        setClientIp(result.clientIp);
      }
    } catch (error) {
      console.error('Error fetching terminals:', error);
    } finally {
      setIsLoadingTerminals(false);
    }
  };

  const discoverPrinters = async () => {
    const api = (window as any).electronAPI;
    if (!api) {
      toast({ variant: 'destructive', title: 'Not Available', description: 'Printer discovery requires the desktop app.' });
      return;
    }
    setIsDiscoveringPrinters(true);
    try {
      const list: string[] = printerMode === 'epson'
        ? (await api.listEpsonPrinters?.()) ?? []
        : (await api.listPrinters?.()) ?? [];
      setAvailablePrinters(list);
      if (list.length === 0) {
        toast({ title: 'No Printers Found', description: 'No printers were detected on this machine.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Discovery Failed', description: 'Could not retrieve printer list.' });
    } finally {
      setIsDiscoveringPrinters(false);
    }
  };

  const handleSave = () => {
    // 1. Save Server IP
    if (serverIp.trim()) {
      localStorage.setItem('server_ip', serverIp.trim());
    } else {
      localStorage.removeItem('server_ip');
    }

    // 2. Handle Manual Terminal IP Selection
    if (manualTerminalIp.trim()) {
        const matchedTerminal = terminals.find(t => t.ipAddress === manualTerminalIp.trim());
        if (matchedTerminal) {
            localStorage.setItem('pos_terminal_id', matchedTerminal.id);
        } else {
            // If user enters an IP that doesn't exist, we could either prevent save 
            // or just save it anyway. Given the requirement "to connect the terminals", 
            // let's warn but allow if they are sure? 
            // Actually, better to just warn and ask them to pick an existing one or check the IP.
            toast({
                variant: "destructive",
                title: "Terminal Not Found",
                description: "The provided IP does not match any registered terminal.",
            });
            // We'll proceed with saving server IP but maybe not terminal ID if invalid?
            // Let's just return for now to let them fix it if they entered something.
            return;
        }
    } else {
        // If they cleared the manual IP, we'll let auto-detection take over on next reload
        localStorage.removeItem('pos_terminal_id');
    }

    // 3. Save Printer Settings
    localStorage.setItem('pos_printer_mode', printerMode);
    localStorage.setItem('pos_paper_size', paperSize);
    localStorage.setItem('pos_print_two_receipts', String(printTwoReceipts));
    if (printerName.trim()) {
      localStorage.setItem('pos_printer_name', printerName.trim());
    } else {
      localStorage.removeItem('pos_printer_name');
    }

    toast({
      title: "Settings Saved",
      description: "Connection settings have been updated. The app will reload to apply changes.",
    });
    
    onOpenChange(false);
    // Reload to ensure all hooks use the new IP and terminal selection
    window.location.reload();
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Construct test URL using the new centralized helper
    const testUrl = formatApiUrl(serverIp.trim(), '/pos-settings');

    try {
      // Try to fetch a simple endpoint to verify connection
      const response = await fetch(testUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const selectedTerminalId = typeof window !== 'undefined' ? localStorage.getItem('pos_terminal_id') : null;
  const selectedTerminal = terminals.find(t => t.id === selectedTerminalId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[780px] w-full p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <DialogTitle className="text-base font-semibold leading-none">POS Terminal Settings</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Configure connection, terminal, and printer for this machine.
            </DialogDescription>
          </div>
        </div>

        {/* Body — two columns */}
        <div className="grid grid-cols-2 divide-x">

          {/* LEFT — Connection & Terminal */}
          <div className="flex flex-col gap-5 px-6 py-5">

            {/* Server Connection */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" /> Server Connection
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-ip" className="text-xs">Server IP Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="server-ip"
                    placeholder="e.g., 192.168.1.100"
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={isTesting}
                    className="h-8 shrink-0 px-3 text-xs"
                  >
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Test'}
                  </Button>
                </div>
                <div className="flex items-center gap-2 min-h-[18px]">
                  {testResult === 'success' && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                  {testResult === 'error' && (
                    <span className="flex items-center gap-1 text-[11px] text-destructive font-medium">
                      <XCircle className="h-3 w-3" /> Unreachable
                    </span>
                  )}
                  {!testResult && (
                    <span className="text-[11px] text-muted-foreground">
                      Default: <code className="bg-muted px-1 rounded">{DEFAULT_API_BASE_URL}</code>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Terminal */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5" /> POS Terminal
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={fetchTerminals}
                  disabled={isLoadingTerminals}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTerminals ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* This machine IP */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Network className="h-3 w-3" /> This Machine IP
                </span>
                <code className="bg-muted px-2 py-1 rounded text-xs w-fit font-mono">
                  {clientIp || 'Detecting...'}
                </code>
              </div>

              {/* Connected terminal badge */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Linked Terminal</span>
                {selectedTerminal ? (
                  <div className="flex flex-col bg-primary/5 border border-primary/20 px-3 py-2 rounded-md">
                    <span className="text-sm font-semibold text-primary leading-tight">{selectedTerminal.terminalDescription}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{selectedTerminal.ipAddress || 'No IP'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic bg-muted/50 px-3 py-2 rounded-md">
                    <XCircle className="h-3 w-3 shrink-0" /> No terminal linked to this machine
                  </div>
                )}
              </div>

              {/* Manual override */}
              <div className="flex flex-col gap-1.5 pt-1 border-t">
                <Label htmlFor="manual-terminal-ip" className="text-xs">
                  Override Terminal IP
                </Label>
                <Input
                  id="manual-terminal-ip"
                  placeholder="e.g., 192.168.1.50"
                  value={manualTerminalIp}
                  onChange={(e) => setManualTerminalIp(e.target.value)}
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Must match a registered terminal IP.</p>
              </div>
            </div>
          </div>

          {/* RIGHT — Printer Settings */}
          <div className="flex flex-col gap-5 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Printer Settings
            </p>

            {/* Paper Size + Print Mode side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Paper Size</Label>
                <Select value={paperSize} onValueChange={(v) => setPaperSize(v as '58mm' | '80mm')}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm — Standard</SelectItem>
                    <SelectItem value="80mm">80mm — Wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Print Mode</Label>
                <Select value={printerMode} onValueChange={(v) => { setPrinterMode(v as PrinterMode); setAvailablePrinters([]); }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="native">Native (Windows)</SelectItem>
                    <SelectItem value="epson">Epson SDK</SelectItem>
                    <SelectItem value="escpos">ESC/POS Serial</SelectItem>
                    <SelectItem value="usb">USB</SelectItem>
                    <SelectItem value="browser">Browser Print</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Printer Name — only for native / epson */}
            {(printerMode === 'native' || printerMode === 'epson') && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Printer Name</Label>
                <div className="flex gap-2">
                  {availablePrinters.length > 0 ? (
                    <Select value={printerName} onValueChange={setPrinterName}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Select printer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="e.g., XP-58-P"
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={discoverPrinters}
                    disabled={isDiscoveringPrinters}
                    title="Scan for printers"
                  >
                    {isDiscoveringPrinters
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ScanLine className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {availablePrinters.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">{availablePrinters.length} printer(s) found.</p>
                )}
              </div>
            )}

            {/* Active printer summary */}
            {printerName && (
              <div className="flex items-center gap-2 bg-muted/60 px-3 py-2 rounded-md text-xs">
                <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono font-medium truncate">{printerName}</span>
                <span className="text-muted-foreground shrink-0">· {printerMode} · {paperSize}</span>
              </div>
            )}

            {/* Print 2 Receipts */}
            <div className="flex items-center justify-between border rounded-md px-3 py-2.5 mt-auto">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-none">Print 2 Receipts</span>
                <span className="text-[11px] text-muted-foreground">Print two copies on every sale</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={printTwoReceipts}
                onClick={() => setPrintTwoReceipts(v => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${printTwoReceipts ? 'bg-primary' : 'bg-input'}`}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${printTwoReceipts ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save & Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
