import { getCollection, getEntries, type CollectionEntry } from 'astro:content';
import { faDate } from './persian';

export type Conference = CollectionEntry<'conferences'>;
export type Talk = Conference['data']['talks'][number];
export type Figure = CollectionEntry<'figures'>;
type Appearance = Talk['speakers'][number];

const live = <T extends { data: { draft?: boolean } }>(e: T) =>
  import.meta.env.PROD ? !e.data.draft : true;

/** Newest first. */
export async function getConferences(): Promise<Conference[]> {
  const all = await getCollection('conferences', live);
  return all.sort((a, b) => b.data.startsAt.valueOf() - a.data.startsAt.valueOf());
}

export function conferenceSlug(c: Conference): string {
  return c.id.split('/').pop()!;
}

export function conferenceUrl(c: Conference): string {
  return `/conferences/${conferenceSlug(c)}`;
}

export function talkUrl(c: Conference, t: Talk): string {
  return `${conferenceUrl(c)}/${t.slug}`;
}

export function conferenceLabel(c: Conference): string {
  return c.data.nameFa ?? c.data.name;
}

/** Keynotes first, then by publish date. */
export function sortedTalks(c: Conference): Talk[] {
  return [...c.data.talks].sort(
    (a, b) => Number(b.keynote) - Number(a.keynote) || a.publishedAt.valueOf() - b.publishedAt.valueOf(),
  );
}

/**
 * «۱ تا ۲ مهر ۱۴۰۵» when both days share a month, the full pair otherwise.
 * Uses the conference's own zone: a date-only start is midnight there, and
 * shifting it to Tehran must not move it to the next day.
 */
export function conferenceDates(c: Conference): string {
  const { startsAt, endsAt } = c.data;
  if (!endsAt) return faDate(startsAt, { timeZone: 'UTC' });
  const sameMonth =
    faDate(startsAt, { timeZone: 'UTC', day: undefined }) === faDate(endsAt, { timeZone: 'UTC', day: undefined });
  if (sameMonth) {
    const day = faDate(startsAt, { timeZone: 'UTC', year: undefined, month: undefined });
    return `${day} تا ${faDate(endsAt, { timeZone: 'UTC' })}`;
  }
  return `${faDate(startsAt, { timeZone: 'UTC' })} تا ${faDate(endsAt, { timeZone: 'UTC' })}`;
}

/** "1:02:03" or "2:03" → seconds. */
export function toSeconds(stamp: string): number {
  return stamp.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
}

/** "1:03:07" → "PT1H3M7S", for schema.org. */
export function isoDuration(stamp: string): string {
  const s = toSeconds(stamp);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${sec || (!h && !m) ? `${sec}S` : ''}`;
}

/** Newest talks across every conference, for the homepage. */
export async function getLatestTalks(limit = 3): Promise<Array<{ conference: Conference; talk: Talk }>> {
  const all = (await getConferences()).flatMap((conference) =>
    conference.data.talks.map((talk) => ({ conference, talk })),
  );
  return all
    .sort((a, b) => b.talk.publishedAt.valueOf() - a.talk.publishedAt.valueOf())
    .slice(0, limit);
}

/* ---------- people ---------- */

export function figureSlug(f: Figure): string {
  return f.id.split('/').pop()!;
}

export function figureUrl(f: Figure): string {
  return `/speakers/${figureSlug(f)}`;
}

export async function getFigures(): Promise<Figure[]> {
  const all = await getCollection('figures', live);
  return all.sort((a, b) => a.data.name.localeCompare(b.data.name, 'en'));
}

/** Profiles for a list of appearances, each with its role at this event. */
export async function resolvePeople(list: Appearance[]): Promise<Array<{ figure: Figure; role: string }>> {
  if (!list.length) return [];
  const figures = await getEntries(list.map((a) => a.person));
  return figures.map((figure, i) => ({ figure, role: list[i].role ?? figure.data.role }));
}

export interface FigureRecord {
  conference: Conference;
  /** Talks given at this conference, newest first. */
  talks: Talk[];
  /** Listed among the notable people of this edition. */
  highlighted: boolean;
  /** Role at this conference, when it differs from the profile. */
  role?: string;
}

/** Every conference a figure took part in, newest conference first. */
export async function getFigureRecord(figureId: string): Promise<FigureRecord[]> {
  const out: FigureRecord[] = [];
  for (const conference of await getConferences()) {
    const d = conference.data;
    const highlight = d.highlights.find((h) => h.person.id === figureId);
    const talks = d.talks
      .filter((t) => t.speakers.some((s) => s.person.id === figureId))
      .sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf());
    if (!highlight && !talks.length) continue;
    const talkRole = talks[0]?.speakers.find((s) => s.person.id === figureId)?.role;
    out.push({ conference, talks, highlighted: !!highlight, role: highlight?.role ?? talkRole });
  }
  return out;
}
