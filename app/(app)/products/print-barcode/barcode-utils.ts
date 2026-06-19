import JsBarcode from 'jsbarcode';

import type { Product } from '@/lib/types';

export const LABEL_SIZES = [
  { label: '40 × 25 mm',  width: 40,  height: 25, fontSize: 6 },
  { label: '50 × 25 mm',  width: 50,  height: 25, fontSize: 6 },
  { label: '58 × 40 mm',  width: 58,  height: 40, fontSize: 7 },
  { label: '60 × 40 mm',  width: 60,  height: 40, fontSize: 7 },
  { label: '100 × 50 mm', width: 100, height: 50, fontSize: 8 },
];

export type LabelSize = (typeof LABEL_SIZES)[number];

export const BARCODE_FORMATS = [
  { label: 'CODE128 (default)', value: 'CODE128' },
  { label: 'EAN-13',            value: 'EAN13'   },
  { label: 'EAN-8',             value: 'EAN8'    },
  { label: 'UPC-A',             value: 'UPC'     },
  { label: 'CODE39',            value: 'CODE39'  },
];

export function generateBarcodeDataUrl(value: string, format: string): string | null {
  const tryRender = (fmt: string): string => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: fmt,
      displayValue: true,
      fontSize: 14,
      height: 60,
      width: 2,
      margin: 10,
      textMargin: 4,
      font: 'monospace',
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  };
  try { return tryRender(format); }
  catch { try { return tryRender('CODE128'); } catch { return null; } }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPrintHTML(
  product: Product,
  qty: number,
  size: LabelSize,
  dataUrl: string,
  showName: boolean,
  showPrice: boolean,
): string {
  const namePart  = showName
    ? `<div class="name">${escapeHtml(product.name)}</div>`
    : '';
  const pricePart = showPrice && typeof product.price === 'number'
    ? `<div class="price">&#8369;${product.price.toFixed(2)}</div>`
    : '';

  // Inner .group holds the three elements tight together;
  // outer .label centers the group in the physical label area.
  const labelHtml = `
    <div class="label">
      <div class="group">
        ${namePart}
        <img class="barcode-img" src="${dataUrl}" alt="barcode" />
        ${pricePart}
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Barcode - ${escapeHtml(product.name)}</title>
<style>
  @page {
    size: ${size.width}mm ${size.height}mm;
    margin: 0;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #fff;
    font-family: monospace;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { display: flex; flex-wrap: wrap; }
  .label {
    width: ${size.width}mm;
    height: ${size.height}mm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1mm;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  /* group shrinks to fit its content — name/barcode/price are tight */
  .group {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  .name {
    font-size: ${size.fontSize}pt;
    font-weight: bold;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    line-height: 1.2;
    margin-bottom: 0.4mm;
  }
  .barcode-img {
    display: block;
    width: 100%;
    height: auto;
  }
  .price {
    font-size: ${size.fontSize + 1}pt;
    font-weight: bold;
    text-align: center;
    margin-top: 0.4mm;
    line-height: 1.2;
  }
</style>
</head>
<body>
  <div class="sheet">
    ${Array.from({ length: qty }, () => labelHtml).join('\n')}
  </div>
<script>
  window.onload = function () {
    window.print();
    setTimeout(function () { window.close(); }, 600);
  };
</script>
</body>
</html>`;
}
