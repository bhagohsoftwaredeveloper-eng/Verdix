
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Server, CheckCircle2, XCircle, RefreshCw, Network, Monitor } from 'lucide-react';
import { DEFAULT_API_BASE_URL, getApiUrl, formatApiUrl } from '@/lib/api-config';

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
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const savedIp = localStorage.getItem('server_ip') || '';
      setServerIp(savedIp);
      setTestResult(null);
      fetchTerminals();
      
      const savedTerminalId = localStorage.getItem('pos_terminal_id');
      // We'll set manualTerminalIp once terminals are fetched or use a separate effect
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Connection Settings
          </DialogTitle>
          <DialogDescription>
            Configure the IP address of the Admin Dashboard server. 
            Leave blank to use the default local server.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="server-ip">Server IP Address</Label>
            <Input
              id="server-ip"
              placeholder="e.g., 192.168.1.100"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Current Default: <code className="bg-muted px-1 rounded">{DEFAULT_API_BASE_URL}</code>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={testConnection}
                disabled={isTesting}
                className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>


          
          <div className="border-t pt-4 mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                POS Terminal Info
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={fetchTerminals}
                disabled={isLoadingTerminals}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingTerminals ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Network className="h-3 w-3" />
                  This Machine IP (Detected by Server)
                </span>
                <code className="bg-muted px-2 py-1 rounded text-xs w-fit">
                  {clientIp || 'Detecting...'}
                </code>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Connected Terminal</span>
                {selectedTerminal ? (
                  <div className="flex flex-col bg-primary/5 border border-primary/20 p-2 rounded">
                    <span className="font-bold text-primary">{selectedTerminal.terminalDescription}</span>
                    <span className="text-xs font-mono">{selectedTerminal.ipAddress || 'No IP configured'}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No terminal matches this machine.</span>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2 border-t pt-3">
                <Label htmlFor="manual-terminal-ip" className="text-xs font-bold uppercase text-muted-foreground">
                  Manual Terminal IP (Overwrite)
                </Label>
                <div className="flex gap-2 text-[10px] text-muted-foreground mb-1 italic">
                    Enter the registered IP of the terminal you want to connect to.
                </div>
                <Input
                  id="manual-terminal-ip"
                  placeholder="e.g., 192.168.1.50"
                  value={manualTerminalIp}
                  onChange={(e) => setManualTerminalIp(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save & Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
