'use client';

import { ChevronsUpDown, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

import { useNewCount } from './use-new-count';
import { MobileNewCountSheet } from './mobile-new-count-sheet';

export function NewCountDialog({ onCreated }: { onCreated: () => void }) {
  const {
    open,
    setOpen,
    isMobile,
    isSubmitting,
    name,
    setName,
    notes,
    setNotes,
    warehouseId,
    setWarehouseId,
    shelfLocationIds,
    setShelfLocationIds,
    warehouses,
    shelves,
    handleClose,
    handleSubmit,
  } = useNewCount({ onCreated });

  return (
    <>
      <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Start New Count
      </Button>

      {/* ── Mobile bottom-sheet: only mounts when truly on a small screen ── */}
      <MobileNewCountSheet
        open={open && isMobile} onClose={handleClose} onSubmit={handleSubmit}
        name={name} setName={setName}
        notes={notes} setNotes={setNotes}
        warehouseId={warehouseId} setWarehouseId={setWarehouseId}
        shelfLocationIds={shelfLocationIds} setShelfLocationIds={setShelfLocationIds}
        warehouses={warehouses} shelves={shelves}
        isSubmitting={isSubmitting}
      />

      {/* ── Desktop modal: only opens on sm+ so its Radix overlay never shows on mobile ── */}
      <Dialog open={open && !isMobile} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="hidden sm:flex flex-col w-full max-w-lg rounded-2xl gap-0 p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-6 pt-6 pb-2">
              <DialogHeader>
                <DialogTitle>Start Stock Count</DialogTitle>
                <DialogDescription>
                  Takes a snapshot of current inventory so you can physically count
                  items while business operations continue.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 py-4 grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="sc-name-d">Count Name / Reference</Label>
                <Input
                  id="sc-name-d"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q1 Annual Count, End of Month"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warehouse <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger><SelectValue placeholder="All Warehouses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Shelves <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-[40px] px-3 py-2 font-normal">
                        <div className="flex flex-wrap gap-1 items-center">
                          {shelfLocationIds.length > 0
                            ? shelfLocationIds.map((id) => {
                                const s = shelves.find((s) => s.id === id);
                                return (
                                  <Badge key={id} variant="secondary" className="font-normal flex items-center gap-1">
                                    {s?.name || id}
                                    <X className="h-3 w-3 cursor-pointer hover:text-destructive"
                                      onClick={(e) => { e.stopPropagation(); setShelfLocationIds((p) => p.filter((i) => i !== id)); }} />
                                  </Badge>
                                );
                              })
                            : <span className="text-muted-foreground">All Shelves</span>}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search shelves..." />
                        <CommandList>
                          <CommandEmpty>No shelf found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => setShelfLocationIds(
                              shelfLocationIds.length === shelves.length ? [] : shelves.map((s) => s.id)
                            )}>
                              <Checkbox checked={shelfLocationIds.length === shelves.length && shelves.length > 0} className="mr-2" />
                              Select All
                            </CommandItem>
                            {shelves.map((shelf) => (
                              <CommandItem key={shelf.id} onSelect={() =>
                                setShelfLocationIds((p) =>
                                  p.includes(shelf.id) ? p.filter((id) => id !== shelf.id) : [...p, shelf.id]
                                )
                              }>
                                <Checkbox checked={shelfLocationIds.includes(shelf.id)} className="mr-2" />
                                {shelf.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sc-notes-d">Notes <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Textarea id="sc-notes-d" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..." rows={3} />
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <DialogFooter className="flex-row gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Taking Snapshot…' : 'Take Snapshot'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
