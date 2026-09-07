/**
 * High-Precision Code 128 (Subset B) Barcode Generator
 * Produces standards-compliant 1D barcode patterns readable by all optical laser/CCD scanners.
 */

// Code 128 Character Patterns (107 patterns, 0-106)
// Each string has 6 digits (bars and spaces alternating) summing to 11,
// except stop pattern (106) which has 7 digits summing to 13.
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106
];

export interface BarcodeBar {
  x: number;
  width: number;
  isBlack: boolean;
}

export interface EncodedBarcode {
  bars: BarcodeBar[];
  totalWidth: number;
  rawPattern: string;
}

/**
 * Encodes ASCII text into Code 128 Subset B bar widths.
 * Automatically sanitizes input and calculates Modulo 103 checksum.
 */
export function encodeCode128B(rawText: string): EncodedBarcode {
  // Strip non-printable ASCII (preserve 0x20 to 0x7E)
  let text = (rawText || '').trim();
  let clean = text.replace(/[^\x20-\x7E]/g, '');
  if (!clean) {
    clean = '10001';
  }

  const indices: number[] = [104]; // 104 = Start Code B
  let checkSum = 104;

  for (let i = 0; i < clean.length; i++) {
    const codeVal = clean.charCodeAt(i) - 32;
    indices.push(codeVal);
    checkSum += codeVal * (i + 1);
  }

  indices.push(checkSum % 103); // Checksum digit
  indices.push(106); // Stop pattern

  const rawPattern = indices.map(idx => CODE128_PATTERNS[idx] || CODE128_PATTERNS[0]).join('');

  // Convert pattern to bar coordinates
  const bars: BarcodeBar[] = [];
  let currentX = 10; // Quiet zone (left margin)

  for (let i = 0; i < rawPattern.length; i++) {
    const width = parseInt(rawPattern[i], 10);
    const isBlack = (i % 2 === 0);
    bars.push({
      x: currentX,
      width,
      isBlack
    });
    currentX += width;
  }

  currentX += 10; // Quiet zone (right margin)

  return {
    bars,
    totalWidth: currentX,
    rawPattern
  };
}
