'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SystemSettings } from '@/lib/types';
import { getApiUrl } from '@/lib/api-config';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

const PRIORITY_LABELS: Record<string, string> = {
  subcategory: 'Subcategory Markup',
  category: 'Category Markup',
  brand: 'Brand Markup',
  supplier: 'Supplier Markup',
};

export default function PricingSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/pos-settings'));
      const result = await response.json();
      
      if (result.success) {
        setSettings({
            ...result.data,
            markupPriority: result.data.markupPriority || ["subcategory", "category", "brand", "supplier"]
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load pricing settings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      
      const response = await fetch(getApiUrl('/pos-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'Pricing settings have been updated successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save pricing settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !settings?.markupPriority) return;

    const items = Array.from(settings.markupPriority);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSettings({
      ...settings,
      markupPriority: items,
    });
  };

  if (isLoading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Pricing Configuration</h2>
            <p className="text-muted-foreground">
                Manage how product prices are calculated.
            </p>
        </div>
        <div className="flex items-center space-x-2">
            <Link href="/settings">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </Link>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
                </>
            ) : (
                'Save Changes'
            )}
            </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Markup Automation
            </CardTitle>
            <CardDescription>Configure automatic price calculation logic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="auto-markup">Enable Automatic Markup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate selling price based on cost and markup rules when adding products.
                </p>
              </div>
              <Switch
                id="auto-markup"
                checked={settings.enableAutomaticMarkup ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, enableAutomaticMarkup: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-markup">Global Default Markup (%)</Label>
              <Input
                id="default-markup"
                type="number"
                min="0"
                step="0.01"
                value={settings.defaultMarkupPercentage || 0}
                onChange={(e) => setSettings({ ...settings, defaultMarkupPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Fallback markup percentage if no specific category, brand, or supplier markup applies.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Markup Priority</CardTitle>
            <CardDescription>
              Drag to reorder. The top-most available markup will be applied.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="priority-list">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {settings.markupPriority?.map((item, index) => (
                        <Draggable key={item} draggableId={item} index={index}>
                          {(provided) => (
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
      </div>
    </div>
  );
}
