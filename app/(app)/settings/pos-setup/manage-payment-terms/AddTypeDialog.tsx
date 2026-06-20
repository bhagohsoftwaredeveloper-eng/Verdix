'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTypeName: string;
  onNewTypeNameChange: (v: string) => void;
  customTypes: any[];
  isLoadingTypes: boolean;
  onAdd: () => void;
  onDeleteType: (id: string, name: string) => void;
}

export function AddTypeDialog({ open, onOpenChange, newTypeName, onNewTypeNameChange, customTypes, isLoadingTypes, onAdd, onDeleteType }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Type</DialogTitle>
          <DialogDescription>Enter a name for the new payment term type</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <label htmlFor="newType" className="text-sm font-medium">New Type Name</label>
            <Input
              id="newType"
              value={newTypeName}
              onChange={e => onNewTypeNameChange(e.target.value)}
              placeholder="e.g., Net 90, Prepaid"
              className="h-10"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
            />
          </div>
          <Button type="button" onClick={onAdd} disabled={!newTypeName.trim()} className="h-10">
            <Plus className="h-4 w-4 mr-2" />Add
          </Button>
        </div>

        <div className="border rounded-md">
          <div className="max-h-[150px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Existing Types</TableHead>
                  <TableHead className="text-right w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTypes ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : customTypes.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No types available</TableCell></TableRow>
                ) : customTypes.map(type => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => onDeleteType(type.id, type.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onNewTypeNameChange(''); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
