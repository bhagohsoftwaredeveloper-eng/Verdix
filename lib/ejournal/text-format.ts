export function colsFor(paperSize?: string): number {
  return paperSize === '80mm' ? 48 : 32;
}

export function money(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const total = width - text.length;
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + text + ' '.repeat(total - left);
}

export function row(left: string, right: string, width: number): string {
  const spaces = width - left.length - right.length;
  if (spaces <= 0) return `${left} ${right}`.substring(0, width);
  return `${left}${' '.repeat(spaces)}${right}`;
}

export function divider(width: number, ch: string = '-'): string {
  return ch.repeat(width);
}

export function wrap(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > width) {
      if (current) { lines.push(current); current = ''; }
      let rest = word;
      while (rest.length > width) {
        lines.push(rest.substring(0, width));
        rest = rest.substring(width);
      }
      current = rest;
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
