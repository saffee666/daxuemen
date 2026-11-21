// 时效徽标：knowledge/条目模型.md D3——build 时计算，零运行时
export interface Freshness {
  label: string;
  level: 'ok' | 'warn' | 'stale';
}

export function freshness(verifiedDate: string, now = new Date()): Freshness {
  const d = new Date(`${verifiedDate}-01T00:00:00`);
  const months = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months >= 12) return { label: '疑似过期', level: 'stale' };
  if (months >= 6) return { label: '待核对', level: 'warn' };
  return { label: '近期核对', level: 'ok' };
}

export function latestVerified(dates: string[]): string {
  return dates.slice().sort().at(-1) ?? '—';
}

export function nextReview(verifiedDate: string, months = 6): string {
  const d = new Date(`${verifiedDate}-01T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function freshnessNote(level: Freshness['level']): string {
  if (level === 'stale') return '超过 12 个月未核对，仅保留供回溯';
  if (level === 'warn') return '超过 6 个月未核对，建议以官方渠道复核';
  return '6 个月内核对过';
}
