import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAnniversariesByJalaliMonth, occurrenceIn } from '../../lib/anniversaries';
import { faNumber, faYear } from '../../lib/persian';
import { SITE } from '../../consts';

/**
 * Feed of anniversaries, dated to their occurrence this year.
 *
 * Not written through `buildFeed`, which takes posts: an anniversary has no
 * post behind it and its `pubDate` is this year's occurrence rather than a
 * publication date. That difference is the whole point — a reader
 * subscribing here wants each entry to arrive on the day it happens.
 *
 * Items with a date already past this year stay in the feed. A reader
 * arriving in Mehr should still see what happened in Farvardin; dropping
 * them would make the feed emptier the later in the year you subscribe.
 */

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const KIND: Record<string, string> = {
  founded: 'آغاز',
  release: 'انتشار',
  milestone: 'نقطهٔ عطف',
  person: 'زادروز',
};

export async function GET(context: APIContext) {
  const year = new Date().getUTCFullYear();
  const months = await getAnniversariesByJalaliMonth(year);
  const all = months.flatMap((m) => m.items);

  return rss({
    title: `${SITE.name} — تقویم سالگردها`,
    description:
      'سالگرد آغاز پروژه‌ها، انتشارهای تاریخی و نقطه‌های عطف نرم‌افزار آزاد. ' +
      'هر مورد در روز خودش می‌رسد.',
    site: context.site ?? SITE.url,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData:
      `<language>fa-ir</language>` +
      `<atom:link href="${new URL('/anniversaries/rss.xml', SITE.url).href}" rel="self" type="application/rss+xml"/>`,
    items: all.map((a) => {
      const when = occurrenceIn(a, year);
      const age = year - a.date.getUTCFullYear();

      /*
       * Milestone titles usually already name the kind — «انتشار NetBSD» —
       * so prefixing it again gives «انتشار انتشار NetBSD». Entity
       * birthdays are bare names and do need the prefix.
       */
      const label = KIND[a.kind] ?? '';
      const subject = label && !a.title.startsWith(label) ? `${label} ${a.title}` : a.title;

      const parts = [
        `${faNumber(a.jDay)} ${MONTHS[a.jMonth - 1]} — ${faNumber(age)} سال از ${subject} می‌گذرد.`,
        a.note ?? '',
        `تاریخ اصلی: ${faYear(a.date.getUTCFullYear())} میلادی.`,
      ].filter(Boolean);

      return {
        title: `${faNumber(age)} سالگی ${a.title}`,
        description: parts.join(' '),
        // This year's occurrence, so the item lands on the right day.
        pubDate: when,
        // Entities have their own page; the rest point at the calendar.
        link: a.url ?? '/anniversaries',
        categories: [KIND[a.kind] ?? 'سالگرد'],
      };
    }),
  });
}
