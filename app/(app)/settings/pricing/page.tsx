'use client';

import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePricing } from './use-pricing';
import { MarkupAutomationCard } from './MarkupAutomationCard';
import { MarkupPriorityCard } from './MarkupPriorityCard';

export default function PricingSettingsPage() {
  const { settings, isLoading, isSaving, set, handleSave, onDragEnd } = usePricing();

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
          <p className="text-muted-foreground">Manage how product prices are calculated.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/settings">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <MarkupAutomationCard settings={settings} set={set} />
        <MarkupPriorityCard priority={settings.markupPriority ?? []} onDragEnd={onDragEnd} />
      </div>
    </div>
  );
}
