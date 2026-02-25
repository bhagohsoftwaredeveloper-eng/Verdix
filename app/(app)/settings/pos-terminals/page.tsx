'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import {
  MoreVertical,
  Network,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AddPosTerminalDialog } from './add-pos-terminal-dialog';
import { EditPosTerminalDialog } from './edit-pos-terminal-dialog';

interface PosTerminal {
  id: string;
  ipAddress: string | null;
  terminalDescription: string | null;
  serialNumber: string | null;
  min: string | null;
  permitNo: string | null;
  printOfficialReceipt: string | null;
  orNextReference: string | null;
  inventoryLocation: string | null;
  lastActive: string | null;
  createdAt: string;
}

export default function PosTerminalsPage() {
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<PosTerminal | null>(null);
  const [currentTerminalId, setCurrentTerminalId] = useState<string | null>(null);
  const [terminalToDelete, setTerminalToDelete] = useState<{ id: string; description: string } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [localIp, setLocalIp] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTerminals();
    const termId = localStorage.getItem('pos_terminal_id');
    setCurrentTerminalId(termId);

    // Heartbeat for current machine
    if (termId) {
        // Initial heartbeat
        fetch(getApiUrl('/pos-terminals'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: termId })
        });
    }

    // Refresh list every 30 seconds to update statuses
    const refreshInterval = setInterval(fetchTerminals, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchTerminals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/pos-terminals'));
      const result = await response.json();
      if (result.success) {
        setTerminals(result.data);
      }
    } catch (error) {
      console.error('Error fetching terminals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load POS terminals',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (terminal: PosTerminal) => {
    setSelectedTerminal(terminal);
    setIsEditDialogOpen(true);
  };

  const handleConnect = (terminal: PosTerminal) => {
    localStorage.setItem('pos_terminal_id', terminal.id);
    setCurrentTerminalId(terminal.id);
    toast({
      title: 'Connected',
      description: `This computer is now linked to ${terminal.terminalDescription || terminal.ipAddress}`,
    });
    // Update last activity so it shows online immediately
    fetch(getApiUrl('/pos-terminals'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: terminal.id })
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to disconnect this computer from its current terminal?')) {
        localStorage.removeItem('pos_terminal_id');
        setCurrentTerminalId(null);
        toast({ 
            title: 'Terminal Disconnected', 
            description: 'This machine is no longer linked to any terminal.' 
        });
    }
  };

  const isOnline = (lastActive: string | null) => {
    if (!lastActive) return false;
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    // Consider online if active within last 5 minutes
    return (now.getTime() - lastActiveDate.getTime()) < 5 * 60 * 1000;
  };

  const handleDelete = async () => {
    if (!terminalToDelete) return;

    try {
      const response = await fetch(getApiUrl(`/pos-terminals?id=${terminalToDelete.id}`), {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Terminal Deleted',
          description: `Terminal has been successfully deleted.`,
        });
        fetchTerminals();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete terminal.',
        });
      }
    } catch (error) {
      console.error('Error deleting terminal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete terminal. Please try again.',
      });
    } finally {
      setTerminalToDelete(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">POS Terminals</h2>
          <p className="text-muted-foreground">
            Manage your POS terminal devices and configurations
          </p>
          {currentTerminalId && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
                  <Monitor className="h-4 w-4" />
                  Currently Connected: <span className="font-bold">{terminals.find(t => t.id === currentTerminalId)?.terminalDescription || 'Linked'}</span>
              </div>
          )}
        </div>
        <div className="flex gap-2">
            {currentTerminalId && (
                <Button 
                    variant="outline" 
                    onClick={handleReset}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                    Reset Connection
                </Button>
            )}
            <AddPosTerminalDialog onTerminalAdded={fetchTerminals} />
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : terminals.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Monitor className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No terminals found</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first POS terminal.</p>
              <AddPosTerminalDialog onTerminalAdded={fetchTerminals} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {terminals.map((terminal) => (
                <Card 
                  key={terminal.id} 
                  className={`overflow-hidden transition-all hover:shadow-md border-2 ${
                    terminal.id === currentTerminalId ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                  }`}
                  onClick={() => handleEdit(terminal)}
                >
                  <CardHeader className="pb-3 space-y-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${isOnline(terminal.lastActive) ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {isOnline(terminal.lastActive) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(terminal)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setTerminalToDelete({
                                id: terminal.id,
                                description: terminal.terminalDescription || terminal.ipAddress || 'this terminal',
                              })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-2">
                      <CardTitle className="text-xl flex items-center gap-2">
                        {terminal.terminalDescription || 'Unnamed Terminal'}
                        {terminal.id === currentTerminalId && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 border-none font-bold text-[10px]">
                            CURRENT
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                        <Network className="h-3 w-3" />
                        {terminal.ipAddress || 'No IP Address'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Serial Number</span>
                          <span className="font-medium truncate">{terminal.serialNumber || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">MIN</span>
                          <span className="font-medium truncate">{terminal.min || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Permit No</span>
                          <span className="font-medium truncate">{terminal.permitNo || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Receipt</span>
                          <span className="font-medium truncate">{terminal.printOfficialReceipt === 'Yes' ? 'Official' : 'Registry'}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 flex flex-col border-t mt-2">
                         <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight mb-1 flex items-center gap-1">
                           <Plus className="h-2 w-2" /> Inventory Location
                         </span>
                         <span className="text-sm font-medium">{terminal.inventoryLocation || 'Main Store'}</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex gap-2">
                      {terminal.id !== currentTerminalId ? (
                        <Button 
                          className="w-full h-9 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(terminal);
                          }}
                        >
                          Connect to this Machine
                        </Button>
                      ) : (
                        <Button 
                          className="w-full h-9 pointer-events-none" 
                          variant="secondary"
                        >
                          Already Connected
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedTerminal && (
        <EditPosTerminalDialog
          terminal={selectedTerminal}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onTerminalUpdated={fetchTerminals}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!terminalToDelete} onOpenChange={(open) => !open && setTerminalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the terminal "{terminalToDelete?.description}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
