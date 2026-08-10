import type { APIContext } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { SITE } from '../../../consts';

/**
 * iCalendar file per event, so readers can add it to any calendar app.
 *
 * Written by hand rather than pulled from a library: RFC 5545 is strict but
 * small, and the rules that actually matter are CRLF line endings, 75-octet
 * line folding, and escaping commas, semicolons and newlines. A dependency
 * would be more code than this.
 */

export async function getStaticPaths() {
  const events = await getCollection('events', ({ data }) => !data.draft);
  return events.map((event) => ({
    params: { slug: event.id.split('/').pop()! },
    props: { event },
  }));
}

/** Escape per RFC 5545 §3.3.11. Backslash first, or it double-escapes. */
const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** UTC timestamp, basic format: 20260912T133000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * Fold to 75 octets per line. Counted in UTF-8 bytes, not characters —
 * Persian text is 2 bytes per character, so a character count would produce
 * lines twice the legal length.
 */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

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
  const { event } = context.props as {
    event: Awaited<ReturnType<typeof getCollection<'events'>>>[number];
  };
  const d = event.data;
  const slug = event.id.split('/').pop()!;
  const pageUrl = new URL(`/events/${slug}`, context.site ?? SITE.url).href;

  const organizer = d.organizer ? await getEntry(d.organizer) : undefined;
  const organizerName = organizer?.data.nameFa ?? organizer?.data.name ?? d.organizerName;

  // No end time given: assume two hours rather than emitting an open-ended
  // event, which some calendars render as all-day.
  const end = d.endsAt ?? new Date(d.startsAt.getTime() + 2 * 60 * 60 * 1000);

  const location =
    d.mode === 'online'
      ? (d.onlineUrl ?? 'Online')
      : [d.venue, d.address, d.city, d.country].filter(Boolean).join('، ');

  const description = [
    d.summary,
    organizerName ? `برگزارکننده: ${organizerName}` : '',
    d.price ? `هزینه: ${d.price}` : '',
    d.language ? `زبان: ${d.language}` : '',
    d.registerUrl ? `ثبت‌نام: ${d.registerUrl}` : '',
    d.onlineUrl && d.mode !== 'in-person' ? `پیوند اتصال: ${d.onlineUrl}` : '',
    '',
    pageUrl,
  ]
    .filter(Boolean)
    .join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${SITE.nameLatin}//${SITE.url}//FA`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
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
    'TRANSP:OPAQUE',
    ...(organizerName ? [`ORGANIZER;CN=${esc(organizerName)}:mailto:${SITE.email}`] : []),
    // Reminder one hour before. Widely supported and rarely unwelcome.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(d.title)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // CRLF is mandatory; plain \n breaks strict parsers, Outlook among them.
  const body = lines.map(fold).join('\r\n') + '\r\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="tuxly-${slug}.ics"`,
    },
  });
}
