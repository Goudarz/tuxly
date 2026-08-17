import { getCollection, getEntry } from 'astro:content';
import { entityUrl, entityLabel, type Entity } from './entities';

/**
 * Anniversaries in free software.
 *
 * Two sources feed this, and the split matters:
 *
 *   - `firstRelease` on an entity. Already recorded because it belongs on
 *     the entity page anyway, so every distribution and project that has a
 *     birth date gets an anniversary for free — no second list to keep in
 *     step with the first.
 *   - `content/milestones.json`, for moments that are not a project's own
 *     birth: the GNU announcement, the first GPL, the founding of the OSI.
 *
 * Recurrence is derived rather than stored. A birthday is the same month
 * and day every year, so storing "repeats annually" would be recording
 * something the date already says.
 */

export type AnniversaryKind = 'founded' | 'release' | 'milestone' | 'person';

/**
 * Jalali year, month and day for an instant, in Tehran time.
 *
 * Via Intl, so no conversion library and no bundle cost.
 */
export function toJalali(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * This year's occurrence of an anniversary.
 *
 * Needed because a fixed Gregorian day is *not* a fixed Jalali day — 16
 * August was 26 Mordad in 1403 and 25 Mordad in 1404. So the Jalali date
 * has to be computed per year rather than stored once.
 *
 * Noon UTC, not midnight: it keeps the date the same on both sides of the
 * Tehran offset.
 */
export function occurrenceIn(anniversary: { month: number; day: number }, year: number): Date {
  return new Date(Date.UTC(year, anniversary.month - 1, anniversary.day, 12));
}

export interface Anniversary {
  id: string;
  /** Original date, kept whole — the year is what makes the age. */
  date: Date;
  month: number;
  day: number;
  title: string;
  kind: AnniversaryKind;
  note?: string;
  source?: string;
  entity?: Entity;
  url?: string;
}

const live = <T extends { data: { draft?: boolean } }>(e: T) =>
  import.meta.env.PROD ? !e.data.draft : true;

/** Every anniversary, sorted by month and day so the year is irrelevant. */
export async function getAnniversaries(): Promise<Anniversary[]> {
  const out: Anniversary[] = [];

  // 1. Entity birthdays, straight from data that already exists.
  for (const entity of await getCollection('entities', live)) {
    const date = entity.data.firstRelease;
    if (!date) continue;
    out.push({
      id: `entity-${entity.id}`,
      date,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      title: entityLabel(entity),
      kind: 'founded',
      entity,
      url: entityUrl(entity),
    });
  }

  // 2. Hand-written moments that belong to no single entity.
  for (const m of await getCollection('milestones')) {
    const entity = m.data.entity ? await getEntry(m.data.entity) : undefined;
    out.push({
      id: m.data.id,
      date: m.data.date,
      month: m.data.date.getUTCMonth() + 1,
      day: m.data.date.getUTCDate(),
      title: m.data.titleFa,
      kind: m.data.kind,
      note: m.data.note,
      source: m.data.source,
      entity,
      url: entity ? entityUrl(entity) : undefined,
    });
  }

  return out.sort((a, b) => a.month - b.month || a.day - b.day);
}

/** How many years old an anniversary is on a given day. */
export function ageAt(anniversary: Anniversary, on = new Date()): number {
  let age = on.getUTCFullYear() - anniversary.date.getUTCFullYear();
  // Not yet reached this year, so it is still a year younger.
  const passed =
    on.getUTCMonth() + 1 > anniversary.month ||
    (on.getUTCMonth() + 1 === anniversary.month && on.getUTCDate() >= anniversary.day);
  if (!passed) age -= 1;
  return age;
}

/** Anniversaries falling on one calendar day, whatever the year. */
export async function getAnniversariesOn(date: Date): Promise<Anniversary[]> {
  const all = await getAnniversaries();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return all.filter((a) => a.month === month && a.day === day);
}

/**
 * The next few anniversaries from a given day, wrapping past December.
 *
 * Wrapping matters: on 28 December the interesting ones are in January,
 * and a plain "later this year" filter would show nothing at all.
 */
export async function getUpcomingAnniversaries(
  from = new Date(),
  limit = 6,
): Promise<Anniversary[]> {
  const all = await getAnniversaries();
  const key = (m: number, d: number) => m * 100 + d;
  const today = key(from.getUTCMonth() + 1, from.getUTCDate());

  const ordered = [
    ...all.filter((a) => key(a.month, a.day) >= today),
    ...all.filter((a) => key(a.month, a.day) < today),
  ];
  return ordered.slice(0, limit);
}

/**
 * An anniversary with this year's Jalali date attached.
 *
 * The Jalali fields describe *this year's* occurrence, since that is the
 * only year they are true for.
 */
export interface DatedAnniversary extends Anniversary {
  jMonth: number;
  jDay: number;
  /** Turning this many years old at this year's occurrence. */
  turns: number;
}

function withJalali(a: Anniversary, year: number): DatedAnniversary {
  const { month, day } = toJalali(occurrenceIn(a, year));
  return {
    ...a,
    jMonth: month,
    jDay: day,
    turns: year - a.date.getUTCFullYear(),
  };
}

/**
 * Grouped by Jalali month, for the full listing.
 *
 * Persian months, not Gregorian: the reader plans their year in Mordad and
 * Shahrivar, so a list ordered by January is a list they have to convert
 * in their head.
 */
export async function getAnniversariesByJalaliMonth(
  year = new Date().getUTCFullYear(),
): Promise<Array<{ month: number; items: DatedAnniversary[] }>> {
  const all = (await getAnniversaries()).map((a) => withJalali(a, year));

  const months = new Map<number, DatedAnniversary[]>();
  for (const a of all) {
    if (!months.has(a.jMonth)) months.set(a.jMonth, []);
    months.get(a.jMonth)!.push(a);
  }

  return [...months.entries()]
    .sort(([a], [b]) => a - b)
    .map(([month, items]) => ({
      month,
      items: items.sort((x, y) => x.jDay - y.jDay),
    }));
}

/** Today's anniversaries, with this year's Jalali date. */
export async function getDatedAnniversariesOn(date: Date): Promise<DatedAnniversary[]> {
  return (await getAnniversariesOn(date)).map((a) => withJalali(a, date.getUTCFullYear()));
}

/** The next few, wrapping past year end, with this year's Jalali date. */
export async function getDatedUpcoming(
  from = new Date(),
  limit = 8,
): Promise<DatedAnniversary[]> {
  const year = from.getUTCFullYear();
  return (await getUpcomingAnniversaries(from, limit)).map((a) => {
    // Wrapped into next year, so its occurrence belongs to that year.
    const key = (m: number, d: number) => m * 100 + d;
    const wrapped = key(a.month, a.day) < key(from.getUTCMonth() + 1, from.getUTCDate());
    return withJalali(a, wrapped ? year + 1 : year);
  });
}
