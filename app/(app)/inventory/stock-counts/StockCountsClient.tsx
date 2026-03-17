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
import { Plus, Eye, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function StockCountsClient() {
  const [counts, setCounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchCounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory/stock-counts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCounts(data);
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
                    {format(new Date(count.created_at), 'PPP')}
                  </TableCell>
                  <TableCell className="font-medium">{count.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {count.warehouse_name || count.shelf_name ? (
                      <span className="flex flex-col text-xs">
                        {count.warehouse_name && <span>WH: {count.warehouse_name}</span>}
                        {count.shelf_name && <span>Shelf: {count.shelf_name}</span>}
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
                  <TableCell>{count.created_by}</TableCell>
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
  const [shelfLocationId, setShelfLocationId] = useState<string>('all');
  
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
          shelfLocationId: shelfLocationId !== 'all' ? shelfLocationId : undefined
        }),
      });

      if (!res.ok) throw new Error('Failed to create count');

      const data = await res.json();
      toast({ title: 'Stock count initialized successfully' });
      setOpen(false);
      setName('');
      setNotes('');
      setWarehouseId('all');
      setShelfLocationId('all');
      onCreated();
      // Optionally route directly to it
      router.push(`/inventory/stock-counts/${data.id}`);

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
                <Label>Shelf (Optional)</Label>
                <Select value={shelfLocationId} onValueChange={setShelfLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Shelves" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shelves</SelectItem>
                    {shelves.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
