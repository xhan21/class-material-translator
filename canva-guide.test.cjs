const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, 'canva-translation-guide.html'), 'utf8');
const raw = html.match(/<script id="guide-translations" type="application\/json">([\s\S]*?)<\/script>/)[1];
const translations = JSON.parse(raw);
const runtime = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const source = fs.readFileSync(path.join(__dirname, 'canva-reading-panel.user.js'), 'utf8');
const ui = JSON.parse(fs.readFileSync(path.join(__dirname, 'canva-panel-ui.json'), 'utf8'));
const byPath = (object, key) => key.split('.').reduce((v, part) => v[part], object);

function harness({ languages = ['ja'], stored = null, storageDenied = false, clipboardDenied = false, downloadDenied = false } = {}) {
  const state = { saved: stored, copies: [], downloads: [], revoked: [] };
  class Element {
    constructor(key) { this.dataset = key ? { guideKey: key } : {}; this.events = {}; this.attributes = {}; this.innerHTML = ''; }
    addEventListener(type, callback) { this.events[type] = callback; }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() { this.focused = true; }
    select() { this.selected = true; }
    click() { if (downloadDenied) throw new Error('download blocked'); state.downloads.push(this); }
    remove() { this.removed = true; }
  }
  const nodes = [...html.matchAll(/data-guide-key="([^"]+)"/g)].map(match => new Element(match[1]));
  const ids = Object.fromEntries(['guide-language', 'source-code', 'copy-status', 'copy-code', 'download-code', 'source-details', 'guide-language-bar'].map(id => [id, new Element()]));
  for (const id of ['copy-code', 'download-code']) {
    ids[id] = nodes.find(node => node.dataset.guideKey === (id === 'copy-code' ? 'copy' : 'download'));
  }
  ids['source-code'].value = source;
  ids['source-details'].open = false;
  ids['guide-language-bar'].hidden = true;
  ids['guide-translations'] = { textContent: raw };
  const meta = {}, nav = new Element(), timers = [];
  const document = {
    documentElement: {}, title: '',
    getElementById: id => ids[id],
    querySelector: selector => selector === 'nav' ? nav : meta,
    querySelectorAll: selector => { assert.equal(selector, '[data-guide-key]'); return nodes; },
    createElement: tag => { assert.equal(tag, 'a'); return new Element(); },
    body: { append() {} }
  };
  vm.runInNewContext(runtime, {
    document, navigator: {
      languages,
      clipboard: { writeText: async value => { if (clipboardDenied) throw new Error('clipboard denied'); state.copies.push(value); } }
    },
    localStorage: {
      getItem() { if (storageDenied) throw new Error('blocked storage'); return stored; },
      setItem(key, value) { if (storageDenied) throw new Error('blocked storage'); assert.equal(key, 'canva-guide:language:v1'); state.saved = value; }
    },
    Blob,
    URL: {
      createObjectURL(blob) { state.blob = blob; return 'blob:test-guide'; },
      revokeObjectURL(url) { state.revoked.push(url); }
    },
    setTimeout(callback) { timers.push(callback); }
  });
  return {
    state, ids, nodes, document, meta, nav, timers,
    select(language) { ids['guide-language'].value = language; ids['guide-language'].events.change(); },
    click(id) { return ids[id].events.click(); }
  };
}

test('19 complete languages and exact userscript button labels are included', () => {
  assert.equal(Object.keys(translations).length, 19);
  assert.deepEqual(Object.keys(translations).sort(), Object.keys(ui).sort());
  for (const [language, strings] of Object.entries(translations)) {
    assert.equal(strings.stepTitles.length, 6);
    assert.equal(strings.rows.length, 9);
    assert.equal(strings.help.length, 7);
    for (const name of ['retry', 'collapse', 'expand', 'pageOrder', 'orderRows', 'orderColumns', 'translateUi']) {
      assert.equal(strings.tokens[name], ui[language][name]);
    }
  }
});

for (const language of Object.keys(translations)) {
  test(`${language}: every displayed section, metadata and copy status switch without changing code`, async () => {
    const app = harness();
    app.ids['source-details'].open = true;
    app.select(language);
    const strings = translations[language];
    assert.equal(app.document.documentElement.lang, language === 'zh' ? 'zh-Hans' : language);
    assert.equal(app.document.documentElement.dir, language === 'ar' ? 'rtl' : 'ltr');
    assert.equal(app.document.title, strings.title);
    assert.equal(app.meta.content, strings.course.replace('{author}', strings.author));
    assert.equal(app.state.saved, language);
    assert.equal(app.ids['guide-language-bar'].hidden, false);
    for (const node of app.nodes) {
      const text = byPath(strings, node.dataset.guideKey);
      assert.equal(typeof text, 'string', node.dataset.guideKey);
      assert.ok(node.innerHTML.length > 0, node.dataset.guideKey);
      assert.doesNotMatch(node.innerHTML, /undefined|\{[a-zA-Z]+\}/);
    }
    assert.equal(app.ids['source-code'].value, source);
    assert.equal(app.ids['source-details'].open, true);
    assert.equal(app.ids['source-code'].attributes['aria-label'], strings.codeLabel);
    assert.equal(app.nav.attributes['aria-label'], strings.navLabel);
    await app.click('copy-code');
    assert.deepEqual(app.state.copies, [source]);
    assert.equal(app.ids['copy-status'].textContent, strings.messages.copied);
    app.select('ja');
    assert.equal(app.ids['copy-status'].textContent, translations.ja.messages.copied);
  });
}

test('browser language detection handles regions, traditional Chinese and fallback', () => {
  for (const [languages, expected] of [
    [['zh-TW'], 'zh-Hant'], [['zh-HK'], 'zh-Hant'], [['zh-Hant'], 'zh-Hant'],
    [['zh-CN'], 'zh'], [['en-US'], 'en'], [['pt-BR'], 'pt'], [['ar-EG'], 'ar'],
    [['nl-NL', 'vi-VN'], 'vi'], [['xx'], 'ja']
  ]) assert.equal(harness({ languages }).ids['guide-language'].value, expected);
});

test('saved language wins, invalid saved value falls back, blocked storage still switches', () => {
  assert.equal(harness({ languages: ['en'], stored: 'bn' }).ids['guide-language'].value, 'bn');
  assert.equal(harness({ languages: ['en'], stored: '__proto__' }).ids['guide-language'].value, 'en');
  const app = harness({ languages: ['ko'], storageDenied: true });
  app.select('ar');
  assert.equal(app.document.documentElement.dir, 'rtl');
  app.select('en');
  assert.equal(app.document.documentElement.dir, 'ltr');
});

test('blocked clipboard opens and selects code with localized manual instructions', async () => {
  const app = harness({ clipboardDenied: true, languages: ['th'] });
  await app.click('copy-code');
  assert.equal(app.ids['source-details'].open, true);
  assert.equal(app.ids['source-code'].selected, true);
  assert.equal(app.ids['source-code'].focused, true);
  assert.equal(app.ids['copy-status'].textContent, translations.th.messages.manual);
  app.select('fr');
  assert.equal(app.ids['copy-status'].textContent, translations.fr.messages.manual);
  assert.equal(app.ids['source-code'].value, source);
});

test('language switch during clipboard operation uses the latest language', async () => {
  const app = harness();
  const pending = app.click('copy-code');
  app.select('ar');
  await pending;
  assert.equal(app.ids['copy-status'].textContent, translations.ar.messages.copied);
});

test('download carries unchanged script bytes and releases its object URL', async () => {
  const app = harness({ languages: ['hi'] });
  app.click('download-code');
  assert.equal(await app.state.blob.text(), source);
  assert.equal(app.state.downloads[0].download, 'canva-reading-panel.user.js');
  assert.equal(app.state.downloads[0].removed, true);
  assert.equal(app.ids['copy-status'].textContent, translations.hi.messages.saved);
  app.timers.forEach(callback => callback());
  assert.deepEqual(app.state.revoked, ['blob:test-guide']);
});

test('download errors show manual fallback without a success message', () => {
  const app = harness({ downloadDenied: true, languages: ['de'] });
  app.click('download-code');
  assert.equal(app.ids['source-details'].open, true);
  assert.equal(app.ids['copy-status'].textContent, translations.de.messages.saveFailed);
  app.timers.forEach(callback => callback());
  assert.deepEqual(app.state.revoked, ['blob:test-guide']);
});

test('generated standalone files match and contain no external runtime scripts', () => {
  assert.equal(html, fs.readFileSync(path.join(__dirname, 'canva-translation-guide-google-sites.txt'), 'utf8'));
  assert.equal(runtime.trim(), fs.readFileSync(path.join(__dirname, 'canva-guide.js'), 'utf8').trim());
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/i);
});
