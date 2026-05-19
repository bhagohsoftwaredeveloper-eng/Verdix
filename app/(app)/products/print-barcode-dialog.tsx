'use client';

import { useState, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { Product } from '@/lib/types';

const LABEL_SIZES = [
  { label: '40 × 25 mm',  width: 40,  height: 25, fontSize: 6 },
  { label: '50 × 25 mm',  width: 50,  height: 25, fontSize: 6 },
  { label: '58 × 40 mm',  width: 58,  height: 40, fontSize: 7 },
  { label: '60 × 40 mm',  width: 60,  height: 40, fontSize: 7 },
  { label: '100 × 50 mm', width: 100, height: 50, fontSize: 8 },
];

const BARCODE_FORMATS = [
  { label: 'CODE128 (default)', value: 'CODE128' },
  { label: 'EAN-13',            value: 'EAN13'   },
  { label: 'EAN-8',             value: 'EAN8'    },
  { label: 'UPC-A',             value: 'UPC'     },
  { label: 'CODE39',            value: 'CODE39'  },
];

function generateBarcodeDataUrl(value: string, format: string): string | null {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPrintHTML(
  product: Product,
  qty: number,
  size: (typeof LABEL_SIZES)[number],
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

// ─── Preview ──────────────────────────────────────────────────────────────────
const PREVIEW_W = 300;

function PreviewLabel({
  product,
  size,
  dataUrl,
  showName,
  showPrice,
}: {
  product: Product;
  size: (typeof LABEL_SIZES)[number];
  dataUrl: string | null;
  showName: boolean;
  showPrice: boolean;
}) {
  const previewH    = Math.round((size.height / size.width) * PREVIEW_W);
  const scale       = PREVIEW_W / (size.width * 3.78);
  const nameFontPx  = Math.round(size.fontSize * 1.33 * scale);
  const priceFontPx = Math.round((size.fontSize + 1) * 1.33 * scale);

  return (
    // Outer box — fixed size, centers the inner group
    <div
      style={{
        width: PREVIEW_W,
        height: previewH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        border: '1px solid #d1d5db',
        borderRadius: 6,
        background: '#fff',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Inner group — shrinks to content, name/barcode/price are tight */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          fontFamily: 'monospace',
        }}
      >
        {showName && (
          <div
            style={{
              fontSize: nameFontPx,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.2,
              width: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 3,
            }}
          >
            {product.name}
          </div>
        )}

        {dataUrl ? (
          <img
            src={dataUrl}
            alt="barcode preview"
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        ) : (
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '6px 0' }}>
            Invalid barcode value
          </div>
        )}

        {showPrice && typeof product.price === 'number' && (
          <div
            style={{
              fontSize: priceFontPx,
              fontWeight: 700,
              textAlign: 'center',
              marginTop: 3,
            }}
          >
            ₱{product.price.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────
interface PrintBarcodeDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintBarcodeDialog({ product, open, onOpenChange }: PrintBarcodeDialogProps) {
  const [qty, setQty]             = useState(1);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [format, setFormat]       = useState('EAN8');
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName]   = useState(true);

  const size         = LABEL_SIZES[sizeIndex];
  const barcodeValue = product.barcode || product.sku || product.id;

  const dataUrl = useMemo(
    () => (barcodeValue ? generateBarcodeDataUrl(barcodeValue, format) : null),
    [barcodeValue, format],
  );

  function handlePrint() {
    if (!dataUrl) return;
    const html = buildPrintHTML(product, qty, size, dataUrl, showName, showPrice);
    const win = window.open('', '_blank', 'width=500,height=400,left=200,top=100');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print barcodes.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  if (!barcodeValue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Barcode — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Label Size</Label>
            <Select value={sizeIndex.toString()} onValueChange={(v) => setSizeIndex(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map((s, i) => (
                  <SelectItem key={i} value={i.toString()}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Barcode Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BARCODE_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="print-qty">Quantity</Label>
            <Input
              id="print-qty"
              type="number"
              min={1}
              max={500}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(500, Number(e.target.value))))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Show on Label</Label>
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
                Product Name
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                Price
              </label>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Preview</p>
          <div className="flex justify-center">
            <PreviewLabel
              product={product}
              size={size}
              dataUrl={dataUrl}
              showName={showName}
              showPrice={showPrice}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={!dataUrl} className="gap-2">
            <Printer className="h-4 w-4" />
            Print {qty} Label{qty !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
