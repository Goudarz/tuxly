import { getCollection, getEntry } from 'astro:content';
import { slugify } from './persian';
import type { Event } from './entities';

/**
 * Speakers are derived from events, not stored as their own content files.
 *
 * The alternative — a file per speaker — means every event with a new name
 * needs a file created first or the build fails. That friction is exactly
 * what stops speakers from being credited at all. Here a name in an event
 * is enough, and the page appears on its own.
 *
 * Identity comes from `slugify`, which normalises Persian before slugging,
 * so «سینا بی‌مثل» and «سینا بی مثل» resolve to one person rather than two.
 * Anyone who deserves a fuller page can set `author` on the performer and
 * be linked to their author profile instead.
 */

export interface SpeakerTalk {
  event: Event;
  talk?: string;
  organizerName?: string;
  organizerUrl?: string;
}

export interface Speaker {
  slug: string;
  /** Most recent spelling wins, so a corrected name propagates. */
  name: string;
  role?: string;
  url?: string;
  /** Set when the performer points at an author entry. */
  authorId?: string;
  talks: SpeakerTalk[];
}

const live = <T extends { data: { draft?: boolean } }>(e: T) =>
  import.meta.env.PROD ? !e.data.draft : true;

/** Every speaker across every published event, newest talk first. */
export async function getSpeakers(): Promise<Speaker[]> {
  const events = await getCollection('events', live);
  events.sort((a, b) => b.data.startsAt.valueOf() - a.data.startsAt.valueOf());

  const map = new Map<string, Speaker>();

  for (const event of events) {
    const organizer = event.data.organizer ? await getEntry(event.data.organizer) : undefined;
    const organizerName =
      organizer?.data.nameFa ?? organizer?.data.name ?? event.data.organizerName;
    const organizerUrl = organizer
      ? `/communities/${organizer.id.split('/').pop()}`
      : undefined;

    for (const performer of event.data.performers) {
      const slug = slugify(performer.name);
      if (!slug) continue;

      let speaker = map.get(slug);
      if (!speaker) {
        // Events are newest first, so the first spelling seen is the newest.
        speaker = {
          slug,
          name: performer.name,
          role: performer.role,
          url: performer.url,
          authorId: performer.author?.id,
          talks: [],
        };
        map.set(slug, speaker);
      }
      // Later events may fill in details the newest one omitted.
      speaker.role ??= performer.role;
      speaker.url ??= performer.url;
      speaker.authorId ??= performer.author?.id;

      speaker.talks.push({ event, talk: performer.talk, organizerName, organizerUrl });
    }
  }

  return [...map.values()].sort((a, b) => b.talks.length - a.talks.length);
}

export async function getSpeaker(slug: string): Promise<Speaker | undefined> {
  return (await getSpeakers()).find((s) => s.slug === slug);
}

/**
 * Where a speaker's name should link.
 *
 * An author profile when one is linked, otherwise the generated speaker
 * page. External links stay in the card body — a name should lead somewhere
 * on this site, so the reader can see the rest of their talks.
 */
export function speakerUrl(speaker: { slug: string; authorId?: string }): string {
  return speaker.authorId
    ? `/people/${speaker.authorId}`
    : `/speakers/${encodeURIComponent(speaker.slug)}`;
}

/** Talks given at events organised by one community, newest first. */
export async function getTalksForOrganizer(entityId: string): Promise<
  Array<{ event: Event; name: string; slug: string; talk?: string; authorId?: string }>
> {
  const events = await getCollection('events', live);
  const out = [];

  for (const event of events) {
    if (event.data.organizer?.id !== entityId) continue;
    for (const performer of event.data.performers) {
      out.push({
        event,
        name: performer.name,
        slug: slugify(performer.name),
        talk: performer.talk,
        authorId: performer.author?.id,
      });
    }
  }

  return out.sort((a, b) => b.event.data.startsAt.valueOf() - a.event.data.startsAt.valueOf());
}
