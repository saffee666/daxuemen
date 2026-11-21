// 雷达演示 iframe 的就绪/超时/重载控制
const frames = document.querySelectorAll<HTMLElement>('[data-demo-frame]');
const reloaders = new WeakMap<HTMLElement, () => void>();

frames.forEach((frame) => {
  const iframe = frame.querySelector<HTMLIFrameElement>('iframe');
  const loading = frame.querySelector<HTMLElement>('[data-demo-loading]');
  const loadingText = frame.querySelector<HTMLElement>('[data-demo-loading-text]');
  const fallback = frame.querySelector<HTMLElement>('[data-demo-fallback]');

  if (!iframe || !loading) return;

  const initialText = loadingText?.textContent ?? '正在加载界面演示…';
  let timer = 0;
  let ready = false;

  function showFallback(message: string) {
    frame.dataset.state = 'timeout';
    if (loadingText) loadingText.textContent = message;
    if (fallback) fallback.hidden = false;
  }

  function startTimer() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!ready) showFallback('加载较慢，可直接打开演示页');
    }, 8000);
  }

  function markReady() {
    ready = true;
    frame.dataset.state = 'ready';
    loading.hidden = true;
    if (fallback) fallback.hidden = true;
    window.clearTimeout(timer);
  }

  function reset() {
    ready = false;
    frame.dataset.state = 'loading';
    loading.hidden = false;
    if (loadingText) loadingText.textContent = initialText;
    if (fallback) fallback.hidden = true;
    startTimer();
  }

  function reload() {
    reset();
    iframe.src = iframe.src;
  }

  reloaders.set(frame, reload);

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== iframe.contentWindow) return;
    const data = event.data as { type?: string; message?: string } | null;
    if (!data) return;
    if (data.type === 'radar-demo-ready') markReady();
    if (data.type === 'radar-demo-error') {
      showFallback('演示加载出错，可直接打开演示页');
      frame.dataset.state = 'error';
    }
  });

  reset();
});

document.querySelectorAll<HTMLButtonElement>('[data-demo-reload]').forEach((button) => {
  button.addEventListener('click', () => {
    const scoped = button.closest<HTMLElement>('[data-demo-frame]');
    const frame = scoped ?? document.querySelector<HTMLElement>('[data-demo-frame]');
    if (frame) reloaders.get(frame)?.();
  });
});
