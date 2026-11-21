// base 安全链接：部署到 GitHub Pages 子路径时统一加前缀
const BASE = import.meta.env.BASE_URL;

export function url(path: string): string {
  if (!path.startsWith('/')) return path;
  if (BASE === '/') return path;
  return `${BASE.replace(/\/$/, '')}${path}`;
}

export function cityPath(city: string): string {
  return url(`/city/${encodeURIComponent(city)}`);
}

export function entryPath(id: string): string {
  return url(`/entries/${id}`);
}

export function currentPath(pathname: string): string {
  const base = BASE.replace(/\/$/, '');
  if (!base) return pathname;
  return pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
}
