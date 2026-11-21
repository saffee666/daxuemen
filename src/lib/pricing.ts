// 价格记录统计：会员比比「核对序列 + 当前=最低 + 月均换算」机制的本地化。
// 逆向来源：knowledge/竞品-会员比比.md；职能归位见 knowledge/竞品-职能拆解.md 分歧 #2/#5。

export interface PricePoint {
  date: string; // YYYY-MM
  price: number; // 0 表示免费
  months?: number; // 折月时长；无则不算月均
  note?: string;
}

export interface PriceStats {
  points: PricePoint[];
  current?: PricePoint;
  lowest?: PricePoint;
  isLowest: boolean;
  monthly?: { price: number; months: number };
}

export function priceStats(history: PricePoint[] | undefined): PriceStats {
  const points = [...(history ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  if (points.length === 0) return { points, isLowest: false };
  const current = points[points.length - 1];
  const lowest = points.reduce((m, p) => (p.price < m.price ? p : m), points[0]);
  const monthly = current.months ? { price: current.price, months: current.months } : undefined;
  return { points, current, lowest, isLowest: current.price <= lowest.price, monthly };
}
