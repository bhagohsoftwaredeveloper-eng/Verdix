import { PackagePlus } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6 py-12">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <PackagePlus className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">No items yet</h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Search for products above to add them to this adjustment batch.
      </p>
    </div>
  );
}
