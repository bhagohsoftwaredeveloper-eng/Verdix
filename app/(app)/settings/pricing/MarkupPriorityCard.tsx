'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const PRIORITY_LABELS: Record<string, string> = {
  subcategory: 'Subcategory Markup',
  category:    'Category Markup',
  brand:       'Brand Markup',
  supplier:    'Supplier Markup',
};

type Props = {
  priority: string[];
  onDragEnd: (result: DropResult) => void;
};

export function MarkupPriorityCard({ priority, onDragEnd }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Markup Priority</CardTitle>
        <CardDescription>Drag to reorder. The top-most available markup will be applied.</CardDescription>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="priority-list">
            {provided => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {priority.map((item, index) => (
                  <Draggable key={item} draggableId={item} index={index}>
                    {provided => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center p-3 bg-secondary/50 rounded-md border border-border cursor-grab active:cursor-grabbing hover:bg-secondary transition-colors"
                      >
                        <span className="font-medium text-sm">
                          {index + 1}. {PRIORITY_LABELS[item] || item}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
