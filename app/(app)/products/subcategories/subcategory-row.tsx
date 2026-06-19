'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';

import { SubcategoryDialog } from './subcategory-dialog';

export function SubcategoryRow({
  subcategory,
  onUpdate,
  onDelete,
}: {
  subcategory: Category;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const hasProducts = subcategory.productCount !== undefined && subcategory.productCount > 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{subcategory.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SubcategoryDialog subcategory={subcategory} onSave={(name) => onUpdate(subcategory.id, name)}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Pencil className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
              <span className="sr-only">Edit</span>
            </Button>
          </SubcategoryDialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={() => onDelete(subcategory.id)}
            disabled={hasProducts}
            title={hasProducts ? "Cannot delete subcategory with products assigned" : "Delete subcategory"}
          >
            <Trash2 className={`h-4 w-4 ${hasProducts ? 'text-muted-foreground/50' : 'text-muted-foreground transition-colors hover:text-destructive'}`} />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
