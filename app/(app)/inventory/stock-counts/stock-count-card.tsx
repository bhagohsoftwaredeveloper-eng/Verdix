import { format } from 'date-fns';
import { Calendar, ChevronRight, ClipboardList, Eye, MapPin, Play, User } from 'lucide-react';

import { LocationLabel, statusClass } from './status-utils';

export function StockCountCard({ count, onOpen }: { count: any; onOpen: (id: string) => void }) {
  return (
    <div
      onClick={() => onOpen(count.id)}
      className="group relative bg-card border border-border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer hover:shadow-md hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <p className="font-semibold text-sm leading-tight truncate">{count.name}</p>
        </div>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ${statusClass(count.status)}`}>
          {count.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{count.createdAt ? format(new Date(count.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate"><LocationLabel count={count} /></span>
        </div>
        <div className="flex items-center gap-1.5 col-span-2">
          <User className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{count.createdBy}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <span className="text-xs text-muted-foreground">
          {count.status === 'in_progress' ? 'Resume counting' : 'View report'}
        </span>
        <div className="flex items-center gap-1 text-primary text-xs font-medium">
          {count.status === 'in_progress'
            ? <><Play className="h-3.5 w-3.5" /><span>Continue</span></>
            : <><Eye className="h-3.5 w-3.5" /><span>View</span></>}
          <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-5 w-20 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-3 w-32 col-span-2 bg-muted rounded" />
      </div>
      <div className="h-px bg-muted" />
      <div className="h-3 w-20 bg-muted rounded ml-auto" />
    </div>
  );
}
