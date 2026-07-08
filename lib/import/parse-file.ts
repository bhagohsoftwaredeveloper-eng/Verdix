import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvText(text: string): ParsedFile {
  const clean = text.replace(/^﻿/, '');
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim());
  const rows = (parsed.data ?? []).map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = row[h] == null ? '' : String(row[h]);
    return out;
  });
  return { headers, rows };
}

export function parseXlsxBuffer(buf: ArrayBuffer): ParsedFile {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, raw: false });
  if (aoa.length === 0) return { headers: [], rows: [] };
  const headers = (aoa[0] ?? []).map((h) => String(h ?? '').trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const cells = aoa[i] ?? [];
    const out: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const v = cells[idx];
      const s = v == null ? '' : String(v);
      if (s !== '') hasValue = true;
      out[h] = s;
    });
    if (hasValue) rows.push(out);
  }
  return { headers, rows };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxBuffer(await file.arrayBuffer());
  }
  return parseCsvText(await file.text());
}
