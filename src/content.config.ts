import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { MONEY_VOCAB, DAO_VOCAB, AUTH_CHANNELS } from './lib/categories.mjs';

// 字段权威定义：本文件（zod schema）；编辑口径见 knowledge/条目模型.md
// category 词表真源：src/lib/categories.mjs（按支柱分表；superRefine 按 pillar 校验，坏值 build 即报错）

const stageEnum = z.enum(['在校', '应届毕业', '毕业1-3年']);
const statusEnum = z.enum(['有效', '已变更', '已过期']);
const common = {
  title: z.string(),
  stage: z.array(stageEnum).min(1),
  region: z.string(), // 全国 / 国际 / 城市:××
  category: z.string(),
  value_level: z.string(), // 钱=价值量级；道=影响量级
  source_name: z.string(),
  verified_date: z.string().regex(/^\d{4}-\d{2}$/, '格式 YYYY-MM'),
  status: statusEnum,
  notes: z.string().optional(),
};

// 钱条目（支柱①②③）
const money = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/money' }),
  schema: z.object({
    ...common,
    pillar: z.enum(['gov', 'corporate', 'platform']),
    eligibility: z.string(),
    steps: z.array(z.string()).min(1),
    materials: z.array(z.string()).default([]),
    official_url: z.string().url(),
    deadline_or_validity: z.string(),
    deadline_dates: z
      .array(z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()]))
      .default([]),
    tiers: z
      .array(
        z.object({
          label: z.string(),
          amount_min: z.number(),
          amount_max: z.number(),
          note: z.string().optional(),
        })
      )
      .default([]),
    offline_required: z.boolean().optional(),
    stacking_tips: z.string().optional(),
    // ↓ 以下为竞品逆向落地的可选增强字段（编辑口径见 knowledge/条目模型.md）
    difficulty: z.enum(['难', '中', '易']).optional(),
    confidence: z.enum(['高', '中']).optional(),
    risk_tags: z.array(z.string()).default([]),
    price_history: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}$/, '格式 YYYY-MM'),
          price: z.number(),
          months: z.number().optional(),
          note: z.string().optional(),
        })
      )
      .default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    // 认证渠道（/tools/auth 认证导航的数据源）：benefits 条目标注学生认证走哪条渠道
    auth_channel: z.array(z.enum(AUTH_CHANNELS)).default([]),
  })
    .superRefine((data, ctx) => {
      const vocab = MONEY_VOCAB[data.pillar] ?? [];
      if (!vocab.includes(data.category)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: `category「${data.category}」不在 ${data.pillar} 词表（合法值：${vocab.join('、')}）；加值先改 src/lib/categories.mjs`,
        });
      }
    }),
});

// 道条目（支柱④⑤⑥⑦）
const dao = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dao' }),
  schema: z.object({
    ...common,
    pillar: z.enum(['pits', 'learn', 'life', 'earn']),
    scene: z.string(),
    // pitfall/howto 允许作者写 **强调**，渲染层不渲染加粗——schema 统一剥除（卡片与详情均为纯文本插值）
    pitfall: z.string().transform((s) => s.replace(/\*\*/g, '')),
    howto: z.string().transform((s) => s.replace(/\*\*/g, '')),
    key_timing: z.string().optional(),
    source_refs: z
      .array(
        z.object({
          label: z.string(),
          type: z.enum(['官方', '权威媒体', '经验帖']),
          url: z.string().url().optional(),
        })
      )
      .min(1),
  })
    .superRefine((data, ctx) => {
      const vocab = DAO_VOCAB[data.pillar] ?? [];
      if (!vocab.includes(data.category)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: `category「${data.category}」不在 ${data.pillar} 词表（合法值：${vocab.join('、')}）；加值先改 src/lib/categories.mjs`,
        });
      }
    }),
});

// 攻略（跨支柱长文）
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    stage: z.array(stageEnum).min(1),
    pillars: z.array(z.string()).default([]),
    updated: z.string().regex(/^\d{4}-\d{2}$/, '格式 YYYY-MM'),
  }),
});

export const collections = { money, dao, guides };
