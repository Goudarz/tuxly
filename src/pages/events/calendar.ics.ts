import type { APIContext } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { SITE } from '../../consts';

/**
 * Subscribable calendar feed of every event.
 *
 * The per-event .ics file copies one event once. This feed is meant to be
 * *subscribed* to: Proton, Nextcloud, Thunderbird and Outlook all
 * accept an iCalendar URL and re-fetch it, so new events appear without
 * anyone doing anything.
 */

const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * Fold to 75 octets per line, counted in UTF-8 bytes rather than
 * characters — Persian text is two bytes per character, so counting
 * characters would produce lines twice the legal length.
 */
function fold(line: string): string {
  if (new TextEncoder().encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = '';
  let size = 0;

  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    // Continuation lines start with a space, which costs one of the 75.
    const limit = out.length === 0 ? 75 : 74;
    if (size + charSize > limit) {
      out.push(current);
      current = char;
      size = charSize;
    } else {
      current += char;
      size += charSize;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

export async function GET(context: APIContext) {
  const base = (context.site ?? new URL(SITE.url)).origin;
  const events = await getCollection('events', ({ data }) => !data.draft);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${SITE.nameLatin}//${SITE.url}//FA`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`${SITE.name} — رویدادها`)}`,
    `X-WR-CALDESC:${esc('رویدادهای نرم‌افزار آزاد و متن‌باز، داخلی و بین‌المللی')}`,
    'X-WR-TIMEZONE:Asia/Tehran',
    // Hint to subscribers: no need to poll more than twice a day.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];

  for (const event of events) {
    const d = event.data;
    const slug = event.id.split('/').pop()!;
    const pageUrl = new URL(`/events/${slug}`, base).href;

    const organizer = d.organizer ? await getEntry(d.organizer) : undefined;
    const organizerName = organizer?.data.nameFa ?? organizer?.data.name ?? d.organizerName;

    // No end time given: assume two hours rather than emitting an
    // open-ended event, which some clients render as all-day.
    const end = d.endsAt ?? new Date(d.startsAt.getTime() + 2 * 60 * 60 * 1000);

    const location =
      d.mode === 'online'
        ? (d.onlineUrl ?? 'آنلاین')
        : [d.venue, d.address, d.city, d.country].filter(Boolean).join('، ');

    const description = [
      d.summary,
      organizerName ? `برگزارکننده: ${organizerName}` : '',
      d.priceNote ? `هزینه: ${d.priceNote}` : '',
      d.language ? `زبان: ${d.language}` : '',
      d.registerUrl ? `${d.registerLabel ?? 'نام‌نویسی'}: ${d.registerUrl}` : '',
      d.onlineUrl && d.mode !== 'in-person' ? `پیوند اتصال: ${d.onlineUrl}` : '',
      '',
      pageUrl,
    ]
      .filter(Boolean)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${slug}@tuxly.ir`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(d.startsAt)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(d.title)}`,
      `DESCRIPTION:${esc(description)}`,
      `LOCATION:${esc(location)}`,
      `URL:${pageUrl}`,
      `CATEGORIES:${esc(d.topics.join(','))}`,
      `STATUS:${d.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
      'TRANSP:TRANSPARENT',
      ...(organizerName ? [`ORGANIZER;CN=${esc(organizerName)}:mailto:${SITE.email}`] : []),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  // CRLF is mandatory; plain \n breaks strict parsers, Outlook among them.
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
