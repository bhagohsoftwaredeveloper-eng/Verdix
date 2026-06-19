'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';

import { CategoryDialog } from './category-dialog';

export function CategoryRow({
  category,
  onUpdate,
  onDelete,
}: {
  category: Category;
  onUpdate: (id: string, name: string, markupPercentage?: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const hasProducts = category.productCount !== undefined && category.productCount > 0;

  return (
    <TableRow>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="text-center">{category.markupPercentage !== undefined && category.markupPercentage !== null ? `${category.markupPercentage}%` : '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <CategoryDialog category={category} onSave={(name, markupPercentage) => onUpdate(category.id, name, markupPercentage)}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Pencil className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
              <span className="sr-only">Edit</span>
            </Button>
          </CategoryDialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={() => onDelete(category.id)}
            disabled={hasProducts}
            title={hasProducts ? "Cannot delete category with products assigned" : "Delete category"}
          >
            <Trash2 className={`h-4 w-4 ${hasProducts ? 'text-muted-foreground/50' : 'text-muted-foreground transition-colors hover:text-destructive'}`} />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
