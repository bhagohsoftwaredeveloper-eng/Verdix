import { cn } from '@/lib/utils';

export function DetailItem({ label, value, icon: Icon, className }: { label: string, value: React.ReactNode, icon?: any, className?: string }) {
    return (
        <div className={cn("flex flex-col gap-1.5 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-colors", className)}>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </div>
            <div className="text-base font-medium text-foreground">{value}</div>
        </div>
    )
}
