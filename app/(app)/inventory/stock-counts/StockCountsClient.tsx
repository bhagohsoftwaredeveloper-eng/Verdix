'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Plus, Eye, Play, Check, ChevronsUpDown, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StockCountsClient() {
  const [counts, setCounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchCounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory/stock-counts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCounts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stock counts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Input placeholder="Search counts..." className="w-full sm:w-80" />
        <NewCountDialog onCreated={fetchCounts} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name/Reference</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : counts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No stock counts found.
                </TableCell>
              </TableRow>
            ) : (
              counts.map((count) => (
                <TableRow key={count.id}>
                  <TableCell>
                    {count.createdAt ? format(new Date(count.createdAt), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">{count.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {count.warehouseName || count.shelfName || count.shelfNames ? (
                      <span className="flex flex-col text-xs">
                        {count.warehouseName && <span>WH: {count.warehouseName}</span>}
                        {count.shelfName && <span>Shelf: {count.shelfName}</span>}
                        {count.shelfNames && count.shelfNames.length > 0 && (
                          <span className="truncate max-w-[150px]" title={count.shelfNames.join(', ')}>
                            Shelves: {count.shelfNames.join(', ')}
                          </span>
                        )}
                      </span>
                    ) : (
                      'Global'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      count.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : count.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {count.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{count.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/inventory/stock-counts/${count.id}`)}
                    >
                      {count.status === 'in_progress' ? (
                        <><Play className="h-4 w-4 mr-2" /> Continue</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-2" /> View</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewCountDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [shelfLocationIds, setShelfLocationIds] = useState<string[]>([]);
  
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);
  const [shelves, setShelves] = useState<{id: string, name: string}[]>([]);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetch('/api/warehouses?activeOnly=true')
        .then(res => res.json())
        .then(data => {
          if (data.success) setWarehouses(data.data);
        })
        .catch(console.error);

      fetch('/api/shelf-locations')
        .then(res => res.json())
        .then(data => {
          if (data.success) setShelves(data.data);
        })
        .catch(console.error);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/inventory/stock-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          notes, 
          createdBy: 'Admin',
          warehouseId: warehouseId !== 'all' ? warehouseId : undefined,
          shelfLocationIds: shelfLocationIds.length > 0 ? shelfLocationIds : undefined
        }),
      });

      if (!res.ok) throw new Error('Failed to create count');

      const data = await res.json();
      toast({ title: 'Stock count initialized successfully' });
      setOpen(false);
      setName('');
      setNotes('');
      setWarehouseId('all');
      setShelfLocationIds([]);
      onCreated();
      // Optionally route directly to it
      router.push(`/inventory/stock-counts/${data.data.id}`);

    } catch (error) {
      console.error(error);
      toast({ title: 'An error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Start New Count
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start Stock Count</DialogTitle>
            <DialogDescription>
              This refers to a snapshot of the current inventory. You can physically count items while business operations continue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Count Name/Reference</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q1 Annual Count, End of Month"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warehouse (Optional)</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shelves (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-auto min-h-[40px] px-3 py-2 font-normal"
                    >
                      <div className="flex flex-wrap gap-1 items-center">
                        {shelfLocationIds.length > 0 ? (
                          shelfLocationIds.map((id) => {
                            const shelf = shelves.find((s) => s.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="mr-1 mb-1 font-normal flex items-center gap-1">
                                {shelf?.name || id}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShelfLocationIds(prev => prev.filter(i => i !== id));
                                  }}
                                />
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground">All Shelves</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search shelves..." />
                      <CommandList>
                        <CommandEmpty>No shelf found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              if (shelfLocationIds.length === shelves.length) {
                                setShelfLocationIds([]);
                              } else {
                                setShelfLocationIds(shelves.map(s => s.id));
                              }
                            }}
                          >
                            <Checkbox 
                              checked={shelfLocationIds.length === shelves.length && shelves.length > 0} 
                              className="mr-2"
                            />
                            Select All
                          </CommandItem>
                          {shelves.map((shelf) => (
                            <CommandItem
                              key={shelf.id}
                              onSelect={() => {
                                setShelfLocationIds((prev) =>
                                  prev.includes(shelf.id)
                                    ? prev.filter((id) => id !== shelf.id)
                                    : [...prev, shelf.id]
                                );
                              }}
                            >
                              <Checkbox 
                                checked={shelfLocationIds.includes(shelf.id)} 
                                className="mr-2"
                              />
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
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Taking Snapshot...' : 'Take Snapshot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
