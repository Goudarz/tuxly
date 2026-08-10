/**
 * Persian text normalisation.
 *
 * Without this, search barely works: a user typing the Arabic kaf never
 * matches a page written with the Persian one. The same function must run
 * over both the indexed text and the user's query.
 *
 * Mappings follow PersianNormalizer in Apache Lucene.
 */

const YEH = '\u06CC'; // ی فارسی
const KAF = '\u06A9'; // ک فارسی
const HEH = '\u0647'; // ه
const ZWNJ = '\u200C'; // نیم‌فاصله

/** Diacritics and short marks, meaningless for search. */
const DIACRITICS = /[\u064B-\u0655\u0670\u06D6-\u06ED]/g;

/** Invisible direction marks users paste in by accident. */
const INVISIBLES = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const SEARCH_MAP: Record<string, string> = {
  '\u064A': YEH, // ي عربی
  '\u0649': YEH, // ى مقصوره
  '\u06D2': YEH, // ے
  '\u0643': KAF, // ك عربی
  '\u06AA': KAF, // ڪ
  '\u0629': HEH, // ة
  '\u06C0': HEH, // ۀ
  '\u06C1': HEH,
  '\u0623': '\u0627', // أ
  '\u0625': '\u0627', // إ
  '\u0622': '\u0627', // آ → ا (فقط برای جست‌وجو، نه نمایش)
  '\u0624': '\u0648', // ؤ
  '\u0626': YEH, // ئ
};

/** Arabic to Persian letters only — for display, not search. */
const DISPLAY_MAP: Record<string, string> = {
  '\u064A': YEH,
  '\u0649': YEH,
  '\u0643': KAF,
  '\u06AA': KAF,
};

/** Persian and Arabic digit ranges. */
const DIGIT_RANGES: Array<[number, number]> = [
  [0x06f0, 0x06f9], // ۰-۹ فارسی
  [0x0660, 0x0669], // ٠-٩ عربی
];

function foldDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    let mapped = ch;
    for (const [start] of DIGIT_RANGES) {
      if (code >= start && code <= start + 9) {
        mapped = String.fromCharCode(0x30 + (code - start));
        break;
      }
    }
    out += mapped;
  }
  return out;
}

/**
 * Full normalisation for indexing and querying.
 * ZWNJ becomes a plain space so both spellings collapse to one form.
 */
export function normalizeFa(input: string): string {
  if (!input) return '';
  let s = input.normalize('NFC');
  s = s.replace(INVISIBLES, '');
  s = s.replace(DIACRITICS, '');
  s = s.replace(/./gu, (ch) => SEARCH_MAP[ch] ?? ch);
  s = foldDigits(s);
  s = s.split(ZWNJ).join(' ');
  s = s.replace(/\u0640+/g, ''); // کشیده
  s = s.replace(/\s+/g, ' ').trim();
  return s.toLowerCase();
}

/** Light normalisation for display: ZWNJ and alef-madda are preserved. */
export function tidyFa(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFC')
    .replace(INVISIBLES, '')
    .replace(/./gu, (ch) => DISPLAY_MAP[ch] ?? ch);
}

/** Latin to Persian digits, for display. */
export function faDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

/** Persian thousands separator (U+066C), not the Latin comma. */
export function faNumber(n: number): string {
  return faDigits(n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u066C'));
}

/**
 * Jalali dates via Intl — adds zero bytes to the bundle and is accurate
 * from 1800 to 2256 CE. For date *arithmetic*, use jalaali-js instead.
 */
export function faDate(date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opts,
  }).format(date);
}

export function faDateTime(date: Date): string {
  return faDate(date, { hour: '2-digit', minute: '2-digit' });
}

/** Relative time ("3 days ago") for news listings. */
export function faRelative(date: Date, now = new Date()): string {
  const diff = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(diff, 'second');
}

/** Safe slug from a Persian or Latin title. */
export function slugify(input: string): string {
  return normalizeFa(input)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
