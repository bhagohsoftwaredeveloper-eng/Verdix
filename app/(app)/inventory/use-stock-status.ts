type StockStatus = 'out-of-stock' | 'low-stock' | 'in-stock';
type BadgeVariant = 'destructive' | 'secondary' | 'default';

interface StockStatusResult {
  stockStatus: StockStatus;
  badgeVariant: BadgeVariant;
  /** Short label used in compact views: Out / Low / In */
  badgeTextShort: string;
  /** Full label used in card/table views: Out of Stock / Low Stock / In Stock */
  badgeTextFull: string;
}

export function useStockStatus(stock: number, reorderPoint: number): StockStatusResult {
  const stockStatus: StockStatus =
    stock === 0 ? 'out-of-stock' : stock < reorderPoint ? 'low-stock' : 'in-stock';

  const badgeVariant: BadgeVariant =
    stockStatus === 'out-of-stock' ? 'destructive' :
    stockStatus === 'low-stock'    ? 'secondary'   : 'default';

  const badgeTextShort =
    stockStatus === 'out-of-stock' ? 'Out' :
    stockStatus === 'low-stock'    ? 'Low' : 'In';

  const badgeTextFull =
    stockStatus === 'out-of-stock' ? 'Out of Stock' :
    stockStatus === 'low-stock'    ? 'Low Stock'    : 'In Stock';

  return { stockStatus, badgeVariant, badgeTextShort, badgeTextFull };
}
