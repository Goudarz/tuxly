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

export const SITE_TZ = 'Asia/Tehran';

/**
 * Jalali dates via Intl — adds zero bytes to the bundle and is accurate
 * from 1800 to 2256 CE. For date *arithmetic*, use jalaali-js instead.
 */
export function faDate(date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: SITE_TZ,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opts,
  }).format(date);
}

export function faDateTime(date: Date): string {
  return faDate(date, { hour: '2-digit', minute: '2-digit' });
}

/** Weekday on its own, for the date chip on event cards. */
export function faWeekday(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { timeZone: SITE_TZ, weekday: 'long' }).format(date);
}

/**
 * Date with the weekday in front: «چهارشنبه، ۲۱ مرداد ۱۴۰۵».
 *
 * Composed by hand rather than by passing `weekday` to Intl. Adding that
 * option makes ICU reorder the whole thing to «۱۴۰۵ مرداد ۲۱، چهارشنبه»,
 * which is not how Persian dates are written — the weekday leads, then
 * day, month, year.
 *
 * Worth the extra function: for anything a reader plans around, the
 * weekday is the part that lands. Most people know whether they are free
 * on Wednesday long before they work out what the 21st is.
 */
export function faDateWeekday(date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return `${faWeekday(date)}، ${faDate(date, opts)}`;
}

/** Weekday, date and time, all in Tehran time. */
export function faDateTimeWeekday(date: Date): string {
  return faDateWeekday(date, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Time only, in a named zone. Used to show an event's local time next to
 * Tehran time, so a reader abroad does not have to convert in their head.
 */
export function faTimeIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Short zone label, e.g. "UTC" or "GMT+۳:۳۰". Intl gives the localised
 * form, which is what a Persian reader expects to see.
 */
export function tzLabel(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('fa-IR', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
}

/** Offset in minutes between a zone and Tehran, at a given instant. */
export function offsetFromTehran(date: Date, timeZone: string): number {
  const read = (tz: string) => {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);
    const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  };
  return (read(timeZone) - read(SITE_TZ)) / 60000;
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
