
declare module '@point-of-sale/receipt-printer-encoder' {
    export default class ReceiptPrinterEncoder {
        constructor(options?: { language?: string; codepageMapping?: string; width?: number });
        initialize(): this;
        codepage(codepage: string): this;
        align(align: 'left' | 'center' | 'right'): this;
        bold(bold: boolean): this;
        line(text: string): this;
        newline(count?: number): this;
        text(text: string): this;
        rule(options?: { style?: 'single' | 'double'; width?: number }): this;
        table(columns: { width?: number; align?: 'left' | 'right' | 'center'; marginLeft?: number; marginRight?: number }[], data: string[][]): this;
        cut(partial?: boolean): this;
        encode(): Uint8Array;
        width(width: number): this;
        height(height: number): this;
        invert(invert: boolean): this;
        underline(underline: boolean | number): this;
        size(width: number, height: number): this;
        barcode(code: string, type: string, height?: number): this;
        qrcode(code: string, model?: number, size?: number, errorLevel?: string): this;
        image(image: any, width: number, height: number, algorithm?: string): this;
        raw(data: number[] | Uint8Array): this;
    }
}
