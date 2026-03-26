import { format } from 'date-fns';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  period?: string;
}

export function ReportHeader({ title, subtitle, period }: ReportHeaderProps) {
  return (
    <div className="hidden print:block mb-8">
      <div className="flex justify-between items-start border-b pb-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-primary/80">Stockpilot</h1>
          <p className="text-sm text-muted-foreground">Inventory Management System</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Generated on</p>
          <p className="font-medium">{format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
        </div>
      </div>
      
      <div className="mt-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        {period && <p className="text-sm border inline-block px-2 py-1 rounded bg-muted/20 mt-2">Period: {period}</p>}
      </div>
    </div>
  );
}
