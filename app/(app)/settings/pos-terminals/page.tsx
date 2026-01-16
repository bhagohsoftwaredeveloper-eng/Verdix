'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  createdAt: string;
}

export default function PosTerminalsPage() {
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<PosTerminal | null>(null);
  const [terminalToDelete, setTerminalToDelete] = useState<{ id: string; description: string } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pos-terminals');
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

  const handleDelete = async () => {
    if (!terminalToDelete) return;

    try {
      const response = await fetch(`/api/pos-terminals?id=${terminalToDelete.id}`, {
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
        </div>
        <AddPosTerminalDialog onTerminalAdded={fetchTerminals} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Terminal List</CardTitle>
              <CardDescription>View and manage all registered POS terminals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>IP ADDRESS</TableHead>
                    <TableHead>Terminal</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>MIN</TableHead>
                    <TableHead>PERMIT NO.</TableHead>
                    <TableHead>Print Official Receipt</TableHead>
                    <TableHead>OR Next reference</TableHead>
                    <TableHead>Inventory Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No terminals found. Click "New" to add your first terminal.
                      </TableCell>
                    </TableRow>
                  ) : (
                    terminals.map((terminal, index) => (
                      <TableRow 
                        key={terminal.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleEdit(terminal)}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{terminal.ipAddress || '-'}</TableCell>
                        <TableCell>{terminal.terminalDescription || '-'}</TableCell>
                        <TableCell>{terminal.serialNumber || '-'}</TableCell>
                        <TableCell>{terminal.min || '-'}</TableCell>
                        <TableCell>{terminal.permitNo || '-'}</TableCell>
                        <TableCell>{terminal.printOfficialReceipt || '0'}</TableCell>
                        <TableCell>{terminal.orNextReference || '-'}</TableCell>
                        <TableCell>{terminal.inventoryLocation || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(terminal);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTerminalToDelete({
                                  id: terminal.id,
                                  description: terminal.terminalDescription || terminal.ipAddress || 'this terminal',
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
