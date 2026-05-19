"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Loader2, Package2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ShelfLocation } from "@/lib/types";

interface ManageShelfLocationsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLocationAdded?: (locationId?: string) => void;
  trigger?: React.ReactNode;
}

export function ManageShelfLocationsDialog({ open, onOpenChange, onLocationAdded, trigger }: ManageShelfLocationsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [locations, setLocations] = useState<ShelfLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (dialogOpen) {
      fetchLocations();
    } else {
      resetForm();
    }
  }, [dialogOpen]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/shelf-locations');
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load shelf locations." });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const isEditing = !!editingId;
      const url = isEditing ? `/api/shelf-locations/${editingId}` : '/api/shelf-locations';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isActive: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: "Success", description: data.message || `Shelf location ${isEditing ? 'updated' : 'added'}.` });
        resetForm();
        fetchLocations();
        if (onLocationAdded) {
          onLocationAdded(isEditing ? editingId : data.data?.id);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Operation failed." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (location: ShelfLocation) => {
    setEditingId(location.id);
    setName(location.name);
    setDescription(location.description || "");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shelf location?")) return;

    try {
      const response = await fetch(`/api/shelf-locations/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();

      if (data.success) {
        toast({ title: "Success", description: "Shelf location deleted." });
        fetchLocations();
        if (onLocationAdded) onLocationAdded();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete shelf location." });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <div onClick={() => handleOpenChange(true)} className="cursor-pointer inline-block">{trigger}</div>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Shelf Locations</DialogTitle>
          <DialogDescription>Add, edit, or remove shelf locations for inventory organization.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end items-start mb-4 bg-muted/30 p-3 sm:p-4 rounded-lg border">
          <div className="flex-1 w-full space-y-2">
            <Label htmlFor="shelf-name">Name</Label>
            <Input
              id="shelf-name"
              placeholder="e.g. A1, Back Room Shell"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 w-full space-y-2">
            <Label htmlFor="shelf-desc">Description</Label>
            <Input
              id="shelf-desc"
              placeholder="e.g. Top shelf in back left"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto pt-2 sm:pt-0">
            <Button type="submit" disabled={isSaving} className="flex-1 sm:flex-none">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Update" : "Add"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm} className="flex-1 sm:flex-none">Cancel</Button>
            )}
          </div>
        </form>

        <div className="border rounded-md overflow-hidden bg-background">
          <div className="max-h-[300px] overflow-y-auto min-h-[150px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[110px] text-center">Products</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground bg-muted/10">
                      Loading shelf locations...
                    </TableCell>
                  </TableRow>
                ) : locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground bg-muted/10">
                      No shelf locations found. Add one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((loc) => {
                    const count = Number((loc as any).product_count ?? 0);
                    return (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell>{loc.description || <span className="text-muted-foreground text-xs italic">No description</span>}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            count === 0
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Package2 className="h-3 w-3" />
                          {count} {count === 1 ? "product" : "products"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(loc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive focus:text-destructive" onClick={() => handleDelete(loc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
