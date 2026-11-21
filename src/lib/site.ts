// 站点级常量。推送到 GitHub 后填 owner/repo，纠错链接即自动生效。
export const SITE = {
  name: '大学补给站',
  tagline: '把大学四年的信息差，提前补给你。',
  description:
    '以信息差消除为核心的大学生全景式导航与决策平台：校园门道、社会支持、信息差工具三层，外加一个把群消息变成待办的本机雷达；条目全部回官方原文核对。',
  owner: '', // TODO: GitHub 用户名，如 saffee666
  repo: '', // TODO: 仓库名
  url: (import.meta.env.SITE_URL as string | undefined) || 'https://daxue.beichen.help',
};

export function repoUrl(): string | null {
  if (!SITE.owner || !SITE.repo) return null;
  return `https://github.com/${SITE.owner}/${SITE.repo}`;
}

export function correctionUrl(entryId: string, title?: string): string | null {
  if (!SITE.owner || !SITE.repo) return null;
  const label = title ? `${entryId} · ${title}` : entryId;
  return `https://github.com/${SITE.owner}/${SITE.repo}/issues/new?template=correction.yml&title=${encodeURIComponent(
    `[纠错] ${label}`
  )}`;
}
