export function statusClass(status: string) {
  if (status === 'completed')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (status === 'cancelled')
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
}

export function LocationLabel({ count }: { count: any }) {
  if (!count.warehouseName && !count.shelfName && !count.shelfNames?.length)
    return <span>Global</span>;
  return (
    <span className="flex flex-col text-xs gap-0.5">
      {count.warehouseName && <span>WH: {count.warehouseName}</span>}
      {count.shelfName && <span>Shelf: {count.shelfName}</span>}
      {count.shelfNames?.length > 0 && (
        <span className="truncate max-w-[180px]" title={count.shelfNames.join(', ')}>
          Shelves: {count.shelfNames.join(', ')}
        </span>
      )}
    </span>
  );
}
