/**
 * Persian number and currency formatting utilities
 */

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const THOUSANDS = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function convertThreeDigit(num: number): string {
  if (num === 0) return '';
  const parts: string[] = [];

  const h = Math.floor(num / 100);
  const remainder = num % 100;
  if (h > 0) parts.push(HUNDREDS[h]);

  if (remainder >= 10 && remainder <= 19) {
    parts.push(TEENS[remainder - 10]);
  } else {
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;
    if (t > 0) parts.push(TENS[t]);
    if (o > 0) parts.push(ONES[o]);
  }

  return parts.join(' و ');
}

export function numberToPersianWords(num: number): string {
  if (num === 0) return 'صفر';
  if (isNaN(num)) return '';

  const isNegative = num < 0;
  let absNum = Math.abs(Math.floor(num));

  const chunks: number[] = [];
  while (absNum > 0) {
    chunks.push(absNum % 1000);
    absNum = Math.floor(absNum / 1000);
  }

  const parts: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkText = convertThreeDigit(chunk);
      const scale = THOUSANDS[i];
      parts.push(scale ? `${chunkText} ${scale}` : chunkText);
    }
  }

  const result = parts.join(' و ');
  return isNegative ? `منفی ${result}` : result;
}

export function formatPersianAmountWithWords(amount: number, unit = 'تومان'): { formatted: string; words: string } {
  const formatted = amount.toLocaleString('fa-IR');
  const words = `${numberToPersianWords(amount)} ${unit}`;
  return { formatted, words };
}
