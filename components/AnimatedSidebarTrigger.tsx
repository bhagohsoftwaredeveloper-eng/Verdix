'use client';

import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

export function AnimatedSidebarTrigger({ className, onClick, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar, state } = useSidebar();
  const expanded = state === 'expanded';

  return (
    <button
      type="button"
      aria-label={expanded ? 'Collapse sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}
      title={expanded ? 'Collapse (Ctrl+B)' : 'Expand (Ctrl+B)'}
      onClick={(e) => { onClick?.(e); toggleSidebar(); }}
      className={cn(
        'group relative flex h-8 w-8 items-center justify-center rounded-md',
        'text-foreground/70 transition-all duration-200',
        'hover:bg-sidebar-accent hover:text-foreground hover:scale-105',
        'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <span className="relative block h-4 w-5" aria-hidden>
        <span
          className={cn(
            'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300',
            expanded ? 'top-0.5' : 'top-1 rotate-45',
          )}
        />
        <span
          className={cn(
            'absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-current transition-all duration-300',
            expanded ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span
          className={cn(
            'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300',
            expanded ? 'bottom-0.5' : 'bottom-1 -rotate-45',
          )}
        />
      </span>
    </button>
  );
}
