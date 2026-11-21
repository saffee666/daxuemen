// 列表筛选：阶段 / 地域（城市含全国兜底）/ 类别，URL 可直达
const groups = document.querySelectorAll<HTMLElement>('[data-filters]');

groups.forEach((root) => {
  const grid = root.parentElement?.querySelector<HTMLElement>('[data-card-grid]');
  const cards = Array.from(grid?.querySelectorAll<HTMLElement>('[data-card]') ?? []);
  const selects = Array.from(root.querySelectorAll<HTMLSelectElement>('[data-filter]'));
  const count = root.querySelector<HTMLElement>('[data-count]');
  const countValue = count?.querySelector('strong');
  const empty = root.parentElement?.querySelector<HTMLElement>('[data-empty]');
  const reset = root.querySelector<HTMLButtonElement>('[data-filter-reset]');

  if (!cards.length || !selects.length) return;

  const valueOf = (name: string) =>
    root.querySelector<HTMLSelectElement>(`[data-filter="${name}"]`)?.value ?? '';

  function apply() {
    const stage = valueOf('stage');
    const region = valueOf('region');
    const category = valueOf('category');
    let visible = 0;

    for (const card of cards) {
      const stages = (card.dataset.stage ?? '').split(' ');
      const cardRegion = card.dataset.region ?? '';
      const cardCity = card.dataset.city ?? '';
      const okStage = !stage || stages.includes(stage);
      const okCategory = !category || card.dataset.category === category;

      let okRegion = true;
      if (region === '全国') okRegion = cardRegion === '全国';
      else if (region === '国际') okRegion = cardRegion === '国际';
      else if (region.startsWith('城市:')) {
        const city = region.slice(3);
        okRegion = cardCity === city || cardRegion === '全国';
      }

      const show = okStage && okRegion && okCategory;
      card.classList.toggle('is-hidden', !show);
      if (show) visible += 1;
    }

    if (countValue) countValue.textContent = String(visible);
    empty?.classList.toggle('is-visible', visible === 0);
  }

  function syncUrl() {
    const next = new URL(window.location.href);
    for (const select of selects) {
      const name = select.dataset.filter;
      if (!name) continue;
      if (select.value) next.searchParams.set(name, select.value);
      else next.searchParams.delete(name);
    }
    window.history.replaceState(null, '', next);
  }

  const params = new URLSearchParams(window.location.search);
  for (const select of selects) {
    const name = select.dataset.filter;
    const value = name ? params.get(name) : null;
    if (value && Array.from(select.options).some((option) => option.value === value)) {
      select.value = value;
    }
  }

  // 兼容 ?city=杭州 的短链接（等价于 region=城市:杭州）
  const cityParam = params.get('city');
  if (cityParam) {
    const target = `城市:${cityParam}`;
    for (const select of selects) {
      if (select.dataset.filter !== 'region') continue;
      if (Array.from(select.options).some((option) => option.value === target)) {
        select.value = target;
      }
    }
  }

  selects.forEach((select) => {
    select.addEventListener('change', () => {
      apply();
      syncUrl();
    });
  });

  reset?.addEventListener('click', () => {
    selects.forEach((select) => {
      select.value = '';
    });
    apply();
    syncUrl();
  });

  apply();
});
