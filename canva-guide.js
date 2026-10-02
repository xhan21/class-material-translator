(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('guide-translations').textContent);
  const select = document.getElementById('guide-language');
  const source = document.getElementById('source-code');
  const status = document.getElementById('copy-status');
  const key = 'canva-guide:language:v1';
  let language = 'ja';
  let statusKey = 'messages.ready';
  const supported = code => Object.hasOwn(data, code);
  const get = (object, path) => path.split('.').reduce((value, part) => value[part], object);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  function rich(text) {
    return escape(text).replace(/\{([a-zA-Z]+)\}/g, (_, token) => {
      const value = data[language].tokens[token];
      if (value === undefined) throw new Error(`Unknown guide token: ${token}`);
      if (token === 'author') return `<a href="https://xuhan.jp/" target="_blank" rel="noopener noreferrer">${escape(value)}</a>`;
      return `<bdi class="ui-label" translate="no">${escape(value)}</bdi>`;
    });
  }
  function renderStatus() {
    status.textContent = get(data[language], statusKey);
  }
  function showStatus(next) {
    statusKey = next;
    renderStatus();
  }
  function applyLanguage(next, save = false) {
    language = supported(next) ? next : 'ja';
    const strings = data[language];
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = strings.title;
    document.querySelector('meta[name="description"]').content = strings.course.replace('{author}', strings.tokens.author);
    document.querySelectorAll('[data-guide-key]').forEach(element => {
      element.innerHTML = rich(get(strings, element.dataset.guideKey));
    });
    source.setAttribute('aria-label', strings.codeLabel);
    document.querySelector('nav').setAttribute('aria-label', strings.navLabel);
    select.value = language;
    renderStatus();
    if (save) {
      try { localStorage.setItem(key, language); } catch { /* Works when iframe storage is unavailable. */ }
    }
  }
  function browserLanguage() {
    for (const candidate of navigator.languages || [navigator.language || 'ja']) {
      const tag = candidate.toLowerCase();
      if (tag.startsWith('zh')) return /(?:hant|tw|hk|mo)/.test(tag) ? 'zh-Hant' : 'zh';
      const base = tag.split('-')[0];
      if (supported(base)) return base;
    }
    return 'ja';
  }
  let initial = browserLanguage();
  try {
    const saved = localStorage.getItem(key);
    if (supported(saved)) initial = saved;
  } catch { /* A saved preference is optional. */ }
  select.addEventListener('change', () => applyLanguage(select.value, true));
  document.getElementById('copy-code').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source.value);
      showStatus('messages.copied');
    } catch {
      document.getElementById('source-details').open = true;
      source.focus();
      source.select();
      showStatus('messages.manual');
    }
  });
  document.getElementById('download-code').addEventListener('click', () => {
    let url;
    let link;
    try {
      url = URL.createObjectURL(new Blob([source.value], { type:'text/javascript;charset=utf-8' }));
      link = document.createElement('a');
      link.href = url;
      link.download = 'canva-reading-panel.user.js';
      document.body.append(link);
      link.click();
      showStatus('messages.saved');
    } catch {
      document.getElementById('source-details').open = true;
      showStatus('messages.saveFailed');
    } finally {
      if (link) link.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  });
  applyLanguage(initial);
  document.getElementById('guide-language-bar').hidden = false;
})();
