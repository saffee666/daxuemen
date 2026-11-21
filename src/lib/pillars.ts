// 支柱元数据：knowledge/产品-大学门道.md（三层框架 7 支柱；组线=信息差类型：社会支持=资源差，校园门道=路径差）

export interface PillarMeta {
  num: string;
  key: string;
  name: string;
  line: '社会支持' | '校园门道';
  desc: string;
  short: string;
  intro: string;
  audience: string;
  freq: string;
}

export const MONEY_PILLARS: Record<string, PillarMeta> = {
  gov: {
    num: '①',
    key: 'gov',
    name: '政府的钱',
    line: '社会支持',
    desc: '奖助学金、就业创业补贴、人才引进——申领指南',
    short: '奖助学金 / 就业创业补贴 / 人才引进',
    intro: '从国家到城市，把「你有资格拿的钱」按申报窗口整理好；每条都回官方原文核对。',
    audience: '在校生、应届毕业生、毕业 1–3 年',
    freq: '按申报窗口期核对',
  },
  corporate: {
    num: '②',
    key: 'corporate',
    name: '企业的让利',
    line: '社会支持',
    desc: '学生价、教育优惠——一张学生证能换什么',
    short: '学生价 / 教育优惠 / 软件与设备',
    intro: '软件、云服务、设备、出行、住宿——企业愿意为学生身份让多少利，一次盘清。',
    audience: '在校生（需学籍/学生证认证）',
    freq: '按学期核对',
  },
  platform: {
    num: '③',
    key: 'platform',
    name: '平台的预算',
    line: '社会支持',
    desc: '外卖券、打车券、会员折扣——叠加姿势',
    short: '外卖 / 打车 / 会员 / 电商学生价',
    intro: '平台营销预算里的学生价、红包和会员折扣，重点讲清怎么叠、什么时候用。',
    audience: '在校生',
    freq: '按月核对',
  },
};

export const DAO_PILLARS: Record<string, PillarMeta> = {
  pits: {
    num: '④',
    key: 'pits',
    name: '避坑',
    line: '校园门道',
    desc: '野鸡竞赛、无效证书、租房兼职陷阱、升学时间点',
    short: '竞赛 / 证书 / 租房 / 兼职 / 升学',
    intro: '把「看起来是机会、实际是坑」的东西提前拆开：主办方、收费、合同、时间线。',
    audience: '在校生、应届毕业生',
    freq: '按学期核对',
  },
  learn: {
    num: '⑤',
    key: 'learn',
    name: '学习',
    line: '校园门道',
    desc: '绩点逻辑、学习方法、工具、时间管理',
    short: '绩点 / 方法 / 工具 / 时间管理',
    intro: '大学的学习规则和高中不一样：先讲清绩点怎么算，再讲怎么学、用什么工具。',
    audience: '在校生',
    freq: '按学年核对',
  },
  life: {
    num: '⑥',
    key: 'life',
    name: '生活',
    line: '校园门道',
    desc: '独立生活、城市生存、医保交通、心理人际',
    short: '租房 / 医保 / 交通 / 心理 / 人际',
    intro: '第一次独立生活要办的事、要避的坑：租房、医保、交通、维权、心理求助。',
    audience: '在校生、刚毕业',
    freq: '按学年核对',
  },
  earn: {
    num: '⑦',
    key: 'earn',
    name: '开源挣钱',
    line: '校园门道',
    desc: '奖学金策略、竞赛变现、实习、合规副业',
    short: '奖学金 / 竞赛 / 实习 / 合规副业',
    intro: '在学生身份允许的范围内，把奖学金、竞赛、实习和副业变成可持续的收入。',
    audience: '在校生、应届毕业生',
    freq: '按学期核对',
  },
};

export const ALL_PILLARS: Record<string, PillarMeta> = { ...MONEY_PILLARS, ...DAO_PILLARS };

// 攻略 frontmatter 历史写法是「① 政府的钱」，这里统一解析回支柱 key；
// 历史旧名（含已废弃的「之道」后缀与失配写法）走别名表兜底，显示层永不静默回落
const LEGACY_ALIASES: Record<string, string> = {
  '套路与避坑': 'pits',
  '④ 套路与避坑': 'pits',
  '学习之道': 'learn',
  '⑤ 学习之道': 'learn',
  '生活之道': 'life',
  '⑥ 生活之道': 'life',
  '生活的答案': 'life',
  '⑥ 生活的答案': 'life',
  '开源之道': 'earn',
  '⑦ 开源之道': 'earn',
};

export function resolvePillarKey(label: string): string | undefined {
  const direct = Object.values(ALL_PILLARS).find(
    (p) => label === p.key || label === p.name || label === `${p.num} ${p.name}`
  )?.key;
  return direct ?? LEGACY_ALIASES[label];
}

export const STAGES = ['在校', '应届毕业', '毕业1-3年'] as const;
