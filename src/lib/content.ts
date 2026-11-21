import { getCollection, type CollectionEntry } from 'astro:content';

export type AnyEntry = CollectionEntry<'money'> | CollectionEntry<'dao'>;

export interface SiteContent {
  money: CollectionEntry<'money'>[];
  dao: CollectionEntry<'dao'>[];
  guides: CollectionEntry<'guides'>[];
  entries: AnyEntry[];
  lastVerified: string;
  cities: string[];
  cityCounts: Record<string, number>;
  counts: {
    money: number;
    dao: number;
    guides: number;
    entries: number;
    total: number;
    pillars: number;
  };
}

export async function loadSiteContent(): Promise<SiteContent> {
  const [money, dao, guides] = await Promise.all([
    getCollection('money'),
    getCollection('dao'),
    getCollection('guides'),
  ]);
  const entries: AnyEntry[] = [...money, ...dao];
  const lastVerified = entries.map((e) => e.data.verified_date).sort().at(-1) ?? '—';
  const cities = [
    ...new Set(
      money
        .map((e) => e.data.region)
        .filter((r) => r.startsWith('城市:'))
        .map((r) => r.slice(3))
    ),
  ].sort((a, b) => a.localeCompare(b, 'zh'));
  const cityCounts = Object.fromEntries(
    cities.map((c) => [c, money.filter((e) => e.data.region === `城市:${c}`).length])
  );
  return {
    money,
    dao,
    guides,
    entries,
    lastVerified,
    cities,
    cityCounts,
    counts: {
      money: money.length,
      dao: dao.length,
      guides: guides.length,
      entries: entries.length,
      total: entries.length + guides.length,
      pillars: 7,
    },
  };
}

export function countByPillar(entries: AnyEntry[], pillar: string): number {
  return entries.filter((e) => e.data.pillar === pillar).length;
}

export function entriesByPillar(entries: AnyEntry[], pillar: string): AnyEntry[] {
  return entries.filter((e) => e.data.pillar === pillar);
}

// 相关条目：同支柱 > 同类别 > 同地域 > 同阶段
export function relatedEntries(all: AnyEntry[], current: AnyEntry, limit = 4): AnyEntry[] {
  const sameEntry = (e: AnyEntry) => e.id === current.id && e.collection === current.collection;
  return all
    .filter((e) => !sameEntry(e))
    .map((e) => {
      let score = 0;
      if (e.data.pillar === current.data.pillar) score += 4;
      if (e.data.category === current.data.category) score += 2;
      if (e.data.region === current.data.region) score += 1;
      if (e.data.stage.some((s) => current.data.stage.includes(s))) score += 1;
      return { entry: e, score };
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.entry.data.verified_date.localeCompare(a.entry.data.verified_date)
    )
    .slice(0, limit)
    .map((x) => x.entry);
}
