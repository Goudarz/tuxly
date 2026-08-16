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

/** Grouped by month, for the full listing. */
export async function getAnniversariesByMonth(): Promise<
  Array<{ month: number; items: Anniversary[] }>
> {
  const all = await getAnniversaries();
  const months = new Map<number, Anniversary[]>();
  for (const a of all) {
    if (!months.has(a.month)) months.set(a.month, []);
    months.get(a.month)!.push(a);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a - b)
    .map(([month, items]) => ({ month, items }));
}
