// 工具页共用步进机：一屏一问，radio/checkbox 选择 + Enter 下一步 + focus 管理。
// 页面用法：
//   const m = initSteps(document.getElementById('steps'));
//   m.onAdvance((cur, vals) => vals.city === 'skip' ? 2 : true); // 返回 false 拦下，数字=跳步
//   m.onDone((vals) => render(vals));                            // 最后一步通过后
// 结构约定：[data-step] 一步；步内 [data-next] 下一步按钮、[data-back] 返回、[data-hint] 校验提示；
// 进度 [data-dot]；结果步加 data-result。标题 heading 加 tabindex="-1" 供 focus。

export function initSteps(root) {
  const steps = [...root.querySelectorAll('[data-step]')];
  if (steps.length === 0) return null;
  const dots = [...root.querySelectorAll('[data-dot]')];
  let cur = 0;
  let onAdvanceCb = null;
  let onDoneCb = null;

  const values = () => {
    const out = {};
    for (const name of new Set(steps.flatMap((s) => [...s.querySelectorAll('input[name]')].map((i) => i.name)))) {
      const checked = [...root.querySelectorAll(`input[name="${name}"]:checked`)];
      out[name] = checked.length > 1 ? checked.map((c) => c.value) : (checked[0]?.value ?? '');
    }
    return out;
  };

  const paint = () => {
    steps.forEach((s, k) => (s.hidden = k !== cur));
    dots.forEach((d, k) => {
      d.toggleAttribute('data-done', k < cur);
      if (k === cur) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
    const h = steps[cur].querySelector('[data-step-title]');
    if (h) h.focus();
  };

  const hint = (msg) => {
    const el = steps[cur].querySelector('[data-hint]');
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  };

  function next() {
    // 校验按 name 组判：HTML 只在组内第一个选项标 required，若只查带属性的那个，
    // 选组内其他选项会被误拦（2026-11-21 修：向导此前只有选第一项才走得通）
    const requiredNames = new Set(
      [...steps[cur].querySelectorAll('input[required]')].map((r) => r.name)
    );
    if (
      requiredNames.size > 0 &&
      ![...requiredNames].some((n) => root.querySelector(`input[name="${n}"]:checked`))
    ) {
      hint('选一项再往下；不确定就选「还不确定」。');
      return;
    }
    hint('');
    if (onAdvanceCb) {
      const verdict = onAdvanceCb(cur, values());
      if (verdict === false) return;
      if (typeof verdict === 'number') {
        cur = Math.max(0, Math.min(verdict, steps.length - 1));
        paint();
        return;
      }
    }
    if (cur === steps.length - 1) {
      if (steps[cur].hasAttribute('data-result')) return; // 结果步没有「再下一步」
      if (onDoneCb) onDoneCb(values());
      return;
    }
    const target = cur + 1;
    // 进结果步前先算结果（结果步的渲染在 onDone，不触发则 verdict/筛选永远不跑）
    if (steps[target].hasAttribute('data-result') && onDoneCb) onDoneCb(values());
    cur = target;
    paint();
  }

  steps.forEach((s) => {
    s.querySelector('[data-next]')?.addEventListener('click', next);
    s.querySelector('[data-back]')?.addEventListener('click', () => {
      cur = Math.max(0, cur - 1);
      paint();
    });
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        next();
      }
    });
  });

  paint();
  return {
    values,
    go: (n) => {
      cur = Math.max(0, Math.min(n, steps.length - 1));
      paint();
    },
    onAdvance: (cb) => (onAdvanceCb = cb),
    onDone: (cb) => (onDoneCb = cb),
  };
}
