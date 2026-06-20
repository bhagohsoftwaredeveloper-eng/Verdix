import type { OverallReadingPreviewProps } from './overall-reading-types';
import { OverallReadingA4 } from './OverallReadingA4';
import { OverallReadingReceipt } from './OverallReadingReceipt';

export type { OverallReadingData } from './overall-reading-types';

export function OverallReadingPreview({ data, printerFormat = '58mm' }: OverallReadingPreviewProps) {
  if (printerFormat === 'A4') {
    return <OverallReadingA4 data={data} />;
  }
  return <OverallReadingReceipt data={data} />;
}
