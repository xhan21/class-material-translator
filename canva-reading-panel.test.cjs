'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranslationController, localizeControls, uiText, uiLanguages, createUiTranslationPreference, createTextSizePreference,
  extractStyledBlocks, textUnits, translationSeparator,
  filterRenderedRects, orderVisibleBlocks, finalizeListBlocks, formatListMarker,
  renderTranslatedBlocks, orderByColumns, pageOrderKey, createPageOrderPreferences } = require('./canva-reading-panel.user.js');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const results = [];
  const errors = [];
  const statuses = [];
  const controller = createTranslationController({
    onResult: (blocks, language) => results.push({ blocks, language }),
    onStatus: message => statuses.push(message),
    onError: error => errors.push(error)
  });
  return { controller, results, errors, statuses };
}

function uiElements() {
  const elements = Object.fromEntries(['host', 'title', 'target', 'start', 'toggle', 'resizeHandle', 'orderLabel', 'orderSelect', 'uiToggle', 'uiToggleText'].map(name => [name, {
    attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }
  }]));
  elements.orderOptions = { rows: {}, columns: {} };
  return elements;
}

test('controls switch language before a translator is initialized and preserve button state', () => {
  const elements = uiElements();
  localizeControls(elements, { language: 'en', started: false, collapsed: false });
  assert.equal(elements.start.textContent, 'Start translation');
  assert.equal(elements.toggle.textContent, 'Minimize');
  assert.equal(elements.orderLabel.textContent, 'Reading order (this slide)');
  assert.equal(elements.orderOptions.columns.textContent, 'Column order (left → right)');
  localizeControls(elements, { language: 'zh', started: false, collapsed: false });
  assert.equal(elements.start.textContent, '开始翻译');
  assert.equal(elements.title.textContent, '幻灯片翻译');
  assert.equal(elements.host.lang, 'zh');
  assert.equal(elements.orderLabel.textContent, '本页阅读顺序');
  assert.equal(elements.orderOptions.rows.textContent, '按行阅读');
  localizeControls(elements, { language: 'ko', started: true, collapsed: true });
  assert.equal(elements.start.textContent, '다시 번역');
  assert.equal(elements.toggle.textContent, '펼치기');
  localizeControls(elements, { language: 'ko', started: true, collapsed: false });
  assert.equal(elements.toggle.textContent, '접기');
});

test('Arabic controls use RTL and switching back restores LTR', () => {
  const elements = uiElements();
  localizeControls(elements, { language: 'ar', started: false, collapsed: false });
  assert.equal(elements.host.dir, 'rtl');
  assert.equal(elements.start.textContent, 'بدء الترجمة');
  assert.equal(elements.resizeHandle.attributes['aria-label'], uiText('ar', 'resize'));
  localizeControls(elements, { language: 'fr', started: true, collapsed: false });
  assert.equal(elements.host.dir, 'ltr');
  assert.equal(elements.start.textContent, 'Traduire à nouveau');
});

test('every selectable language has complete messages and localized progress prompts', () => {
  const messages = require('./canva-panel-ui.json');
  const expected = ['en', 'ja', 'zh', 'zh-Hant', 'ko', 'vi', 'th', 'id', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'uk', 'ar', 'hi', 'bn', 'tr'];
  assert.deepEqual(uiLanguages, expected);
  const keys = Object.keys(messages.en).sort();
  for (const language of expected) {
    assert.deepEqual(Object.keys(messages[language]).sort(), keys);
    for (const key of keys) {
      assert.ok(messages[language][key].trim());
      const text = uiText(language, key, { percent: 42 });
      assert.doesNotMatch(text, /\{\w+\}/);
      if (language !== 'ja') assert.doesNotMatch(text, /[\u3040-\u30ff]/);
    }
    assert.ok(uiText(language, 'ready').includes(uiText(language, 'start')));
    assert.ok(uiText(language, 'downloading', { percent: 42 }).includes('42'));
  }
  assert.equal(uiText('unknown', 'start'), 'Start translation');
});

test('changing slides automatically invokes translation again', async () => {
  const h = harness();
  const calls = [];
  h.controller.update(['最初のページ']);
  h.controller.attach({ translate: async text => {
    calls.push(text);
    return `en:${text}`;
  } }, 'en');
  await tick();
  h.controller.update(['次のページ']);
  await tick();
  assert.deepEqual(calls, ['最初のページ', '次のページ']);
  assert.deepEqual(h.results.at(-1), { blocks: ['en:次のページ'], language: 'en' });
  assert.equal(h.errors.length, 0);
});

test('late previous-slide translation cannot replace current-slide output', async () => {
  const h = harness();
  const old = deferred();
  const next = deferred();
  const signals = [];
  h.controller.update(['旧ページ', '旧ページの続き']);
  h.controller.attach({ translate: (text, { signal }) => {
    signals.push(signal);
    return text === '旧ページ' ? old.promise : next.promise;
  } }, 'en');
  h.controller.update(['新ページ']);
  assert.equal(signals[0].aborted, true);
  next.resolve('new slide');
  await tick();
  old.resolve('old slide');
  await tick();
  assert.deepEqual(h.results.at(-1).blocks, ['new slide']);
  assert.equal(signals.length, 2); // The obsolete slide's remaining block is skipped.
  assert.equal(h.errors.length, 0);
});

test('unchanged text is not retranslated; revisiting a slide uses its cached translation', async () => {
  const h = harness();
  let calls = 0;
  h.controller.update(['一']);
  h.controller.attach({ translate: async text => { calls++; return `en:${text}`; } }, 'en');
  await tick();
  h.controller.update(['一']);
  await tick();
  assert.equal(calls, 1);
  h.controller.update(['二']);
  await tick();
  h.controller.update(['一']);
  await tick();
  assert.equal(calls, 2);
  assert.deepEqual(h.results.at(-1).blocks, ['en:一']);
});

test('manual retranslation calls the translator again for already translated text', async () => {
  const h = harness();
  let calls = 0;
  h.controller.update(['同じ本文']);
  h.controller.attach({ translate: async () => `translation ${++calls}` }, 'en');
  await tick();
  assert.deepEqual(h.results.at(-1).blocks, ['translation 1']);

  h.controller.update(['同じ本文'], true);
  await tick();
  assert.equal(calls, 2);
  assert.deepEqual(h.results.at(-1).blocks, ['translation 2']);

  // 通常の再表示では、再翻訳後の結果を使う。
  h.controller.update([]);
  h.controller.update(['同じ本文']);
  await tick();
  assert.equal(calls, 2);
  assert.deepEqual(h.results.at(-1).blocks, ['translation 2']);
});

test('changing target language discards old results and keeps language caches separate', async () => {
  const h = harness();
  const slowEnglish = deferred();
  h.controller.update(['同じ原文']);
  h.controller.attach({ translate: () => slowEnglish.promise }, 'en');
  h.controller.detach();
  h.controller.attach({ translate: async () => '한국어 번역' }, 'ko');
  await tick();
  slowEnglish.resolve('English translation');
  await tick();
  assert.deepEqual(h.results.at(-1), { blocks: ['한국어 번역'], language: 'ko' });
  h.controller.attach({ translate: async () => 'English translation' }, 'en');
  await tick();
  assert.deepEqual(h.results.at(-1), { blocks: ['English translation'], language: 'en' });
});

test('translation errors are visible and a forced retry can recover', async () => {
  const h = harness();
  let fails = true;
  h.controller.update(['本文']);
  h.controller.attach({ translate: async () => {
    if (fails) throw new Error('temporary error');
    return 'translated';
  } }, 'en');
  await tick();
  assert.equal(h.errors.length, 1);
  assert.equal(h.errors[0].message, 'temporary error');
  fails = false;
  h.controller.update(['本文'], true);
  await tick();
  assert.deepEqual(h.results.at(-1).blocks, ['translated']);
});

test('an empty slide clears stale content and cancels its pending translation', async () => {
  const h = harness();
  const pending = deferred();
  h.controller.update(['前のページ']);
  h.controller.attach({ translate: () => pending.promise }, 'en');
  h.controller.update([]);
  pending.reject(new Error('cancelled old job'));
  await tick();
  assert.deepEqual(h.results.at(-1).blocks, []);
  assert.equal(h.errors.length, 0);
});

// 文書の標準的なノード構造を使うフィクスチャ。描画済みの色はstyleOfから渡す。
function element(tagName, children = [], attributes = {}, appearance = {}) {
  const node = {
    nodeType: 1, tagName, appearance, attributes, childNodes: [], parentElement: null,
    get children() { return this.childNodes.filter(child => child.nodeType === 1); },
    getAttribute(name) { return Object.hasOwn(attributes, name) ? String(attributes[name]) : null; },
    hasAttribute(name) { return Object.hasOwn(attributes, name); },
    closest(selector) {
      for (let item = this; item; item = item.parentElement) {
        if (item.tagName.toLowerCase() === selector) return item;
      }
      return null;
    }
  };
  node.childNodes = children.map(child => {
    const item = typeof child === 'string' ? { nodeType: 3, textContent: child } : child;
    item.parentElement = node;
    return item;
  });
  return node;
}
function styleOf(node) {
  const inherited = node.parentElement ? styleOf(node.parentElement) : { color: 'rgb(66, 66, 66)' };
  return { ...inherited, display: 'block', visibility: 'visible', ...node.appearance };
}

test('ordered lists preserve start and item values as literal markers outside translation input', () => {
  const root = element('DIV', [element('OL', [
    element('LI', ['導入']), element('LI', ['準備'], { value: 8 }), element('LI', ['実習'])
  ], { start: 3 }, { listStyleType: 'decimal' })]);
  const blocks = finalizeListBlocks(extractStyledBlocks(root, styleOf));
  assert.deepEqual(textUnits(blocks), ['導入', '準備', '実習']);
  assert.deepEqual(blocks.map(block => block.list), [3, 8, 9].map(value => ({ marker: `${value}.`, depth: 0 })));
  assert.doesNotThrow(() => JSON.stringify(blocks));
});

test('nested bullet lists retain indentation and text colors', () => {
  const root = element('OL', [
    element('LI', ['準備', element('UL', [element('LI', ['インストール'], {}, { color: 'rgb(255, 0, 0)' })], {}, { listStyleType: 'circle' })]),
    element('LI', ['実習'])
  ], {}, { listStyleType: 'decimal' });
  const blocks = finalizeListBlocks(extractStyledBlocks(root, styleOf));
  assert.deepEqual(textUnits(blocks), ['準備', 'インストール', '実習']);
  assert.equal(blocks[1].runs[0].color, 'rgb(255, 0, 0)');
  assert.deepEqual(blocks.map(block => block.list), [
    { marker: '1.', depth: 0 }, { marker: '◦', depth: 1 }, { marker: '2.', depth: 0 }
  ]);
});

test('hidden native markers still produce 1, 2 and nested 1, 2, 3 without numbering the footer', () => {
  const root = element('DIV', [
    element('P', ['本日の流れ']),
    element('OL', [
      element('LI', ['導入']),
      element('LI', ['準備', element('OL', [
        element('LI', ['インストール']), element('LI', ['ファイルの管理']),
        element('LI', ['生成AIの準備'], {}, { color: 'rgb(255, 112, 0)' })
      ])])
    ], {}, { listStyleType: 'none' }),
    element('P', ['任意ですがおすすめ'], {}, { color: 'rgb(255, 112, 0)' })
  ]);
  const blocks = finalizeListBlocks(extractStyledBlocks(root, styleOf));
  assert.deepEqual(blocks.map(block => block.list?.marker), [undefined, '1.', '2.', '1.', '2.', '3.', undefined]);
  assert.deepEqual(blocks.map(block => block.list?.depth), [undefined, 0, 0, 1, 1, 1, undefined]);
  assert.equal(blocks[5].color, 'rgb(255, 112, 0)');
});

test('separate text roots within the same list item share one marker after visual sorting', () => {
  const first = element('DIV', ['導入']);
  const continuation = element('DIV', ['補足説明']);
  const second = element('DIV', ['準備']);
  element('OL', [element('LI', [first, continuation]), element('LI', [second])]);
  const positions = { '導入': 100, '補足説明': 150, '準備': 200 };
  const blocks = [continuation, second, first].flatMap(root => extractStyledBlocks(root, styleOf,
    node => [box(50, positions[node.textContent], 500, positions[node.textContent] + 30)]));
  const result = finalizeListBlocks(orderVisibleBlocks(blocks));
  assert.deepEqual(textUnits(result), ['導入', '補足説明', '準備']);
  assert.deepEqual(result.map(block => block.list.marker), ['1.', '', '2.']);
});

test('reversed lists, number styles and literal prefixes are preserved without double numbering', () => {
  const root = element('OL', [element('LI', ['導入']), element('LI', ['準備']), element('LI', ['実習'])],
    { reversed: '' }, { listStyleType: 'none' });
  assert.deepEqual(finalizeListBlocks(extractStyledBlocks(root, styleOf)).map(block => block.list.marker), ['3.', '2.', '1.']);
  assert.equal(formatListMarker(27, 'upper-alpha'), 'AA.');
  assert.equal(formatListMarker(4, 'lower-roman'), 'iv.');
  assert.equal(formatListMarker(2, 'decimal-leading-zero'), '02.');
  const literal = element('OL', [element('LI', ['1. 導入'])]);
  const blocks = finalizeListBlocks(extractStyledBlocks(literal, styleOf));
  assert.equal(blocks[0].list.marker, '');
  assert.deepEqual(textUnits(blocks), ['1. 導入']);
});

test('a visible duplicate without list metadata does not erase the numbered version', () => {
  const root = element('OL', [element('LI', ['準備'])]);
  const numbered = extractStyledBlocks(root, styleOf, () => [box(50, 100, 500, 130)])[0];
  const plain = { runs: numbered.runs, color: numbered.color, rect: numbered.rect };
  const blocks = finalizeListBlocks(orderVisibleBlocks([plain, numbered]));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].list.marker, '1.');
});

test('rendered output contains real marker text, preserves orange color and wraps the body separately', () => {
  // Minimal output tree: this asserts actual renderer output, not browser layout.
  const createElement = tagName => {
    const node = { tagName, className: '', style: {}, children: [], attributes: {},
      append(...children) { this.children.push(...children); },
      setAttribute(name, value) { this.attributes[name] = value; }
    };
    node.classList = { add(name) { node.className += ` ${name}`; } };
    return node;
  };
  const doc = { createElement, createDocumentFragment: () => createElement('#fragment') };
  const color = 'rgb(255, 112, 0)';
  const block = { color, runs: [{ text: '準備', color }], list: { marker: '2.', depth: 1 } };
  const output = renderTranslatedBlocks(doc, [block], ['Preparing for Processing'], 'en');
  const [row] = output.children;
  const [marker, content] = row.children;
  assert.equal(marker.tagName, 'span');
  assert.equal(marker.textContent, '2.');
  assert.equal(marker.style.color, color);
  assert.equal(marker.attributes.translate, 'no');
  assert.equal(row.style.marginInlineStart, '1.4em');
  assert.equal(content.children[0].textContent, 'Preparing for Processing');
  assert.equal(content.children[0].style.color, color);
  assert.equal(renderTranslatedBlocks(doc, [block], [], 'en').children.length, 0);
});

test('numbers written directly in source text remain part of that text', () => {
  const root = element('DIV', [element('P', ['1. オリエンテーション']), element('P', ['2. 準備'])]);
  const blocks = extractStyledBlocks(root, styleOf);
  assert.deepEqual(textUnits(blocks), ['1. オリエンテーション', '2. 準備']);
});

test('paragraph boundaries and mixed text colors are retained', () => {
  const root = element('DIV', [
    element('P', ['タイトル'], {}, { color: 'rgb(0, 100, 255)' }),
    element('P', ['ここは', element('SPAN', ['重要'], {}, { color: 'rgb(255, 0, 0)' }), 'です'])
  ]);
  const blocks = extractStyledBlocks(root, styleOf);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[1].runs.map(run => run.color),
    ['rgb(66, 66, 66)', 'rgb(255, 0, 0)', 'rgb(66, 66, 66)']);
  assert.equal(blocks[0].color, 'rgb(0, 100, 255)');
  assert.deepEqual(textUnits(blocks), ['タイトル', 'ここは', '重要', 'です']);
});

test('color changes refresh the view without discarding cached translations', async () => {
  const h = harness();
  let calls = 0;
  h.controller.update(['本文']);
  h.controller.attach({ translate: async () => { calls++; return 'Text'; } }, 'en');
  await tick();
  const previousCount = h.results.length;
  h.controller.update(['本文'], false, true);
  await tick();
  assert.equal(calls, 1);
  assert.ok(h.results.length > previousCount);
  assert.deepEqual(h.results.at(-1).blocks, ['Text']);
});

test('colored translated segments do not concatenate English words or add spaces before punctuation', () => {
  assert.equal(translationSeparator('Very', 'important', 'en'), ' ');
  assert.equal(translationSeparator('important', '.', 'en'), '');
  assert.equal(translationSeparator('非常', '重要', 'zh'), '');
});

const box = (left, top, right, bottom) => ({ left, top, right, bottom });
const viewport = box(0, 0, 1400, 800);

test('the footer follows the title and body using text positions even when DOM order differs', () => {
  const root = element('DIV', [
    element('P', ['任意ですが便利なのでおすすめ'], {}, { color: 'rgb(255, 112, 0)' }),
    element('P', ['本日の流れ']),
    element('P', ['オリエンテーション'])
  ]);
  const tops = { '任意ですが便利なのでおすすめ': 670, '本日の流れ': 90, 'オリエンテーション': 270 };
  const blocks = extractStyledBlocks(root, styleOf, node => [box(50, tops[node.textContent], 900, tops[node.textContent] + 40)]);
  // 同じ位置の複製が先に抽出された状況を再現する。
  const ordered = orderVisibleBlocks([blocks[0], ...blocks]);
  assert.deepEqual(textUnits(ordered), ['本日の流れ', 'オリエンテーション', '任意ですが便利なのでおすすめ']);
  assert.equal(ordered.at(-1).color, 'rgb(255, 112, 0)');
});

test('the same sentence at separate visible positions is not removed as a duplicate', () => {
  const blocks = [100, 500].map(top => ({
    runs: [{ text: '注意事項', color: 'rgb(255, 112, 0)' }],
    rect: box(50, top, 300, top + 40)
  }));
  assert.equal(orderVisibleBlocks(blocks).length, 2);
});

test('offscreen and transparent text copies are excluded', () => {
  assert.deepEqual(filterRenderedRects([box(50, -70, 500, -30)], [], viewport), []);
  assert.deepEqual(filterRenderedRects([box(50, 0, 500, 40)], [
    { rect: viewport, style: { opacity: '0' } }
  ], viewport), []);
  assert.deepEqual(filterRenderedRects([box(50, 0, 500, 40)], [
    { rect: viewport, style: { visibility: 'hidden' } }
  ], viewport), []);
});

test('overflow, legacy clip and inset hide accessibility copies despite their text rectangles', () => {
  const text = box(0, 0, 500, 40);
  assert.deepEqual(filterRenderedRects([text], [
    { rect: box(0, 0, 1, 1), style: { overflowX: 'hidden', overflowY: 'hidden' } }
  ], viewport), []);
  assert.deepEqual(filterRenderedRects([text], [
    { rect: viewport, style: { clip: 'rect(0px, 0px, 0px, 0px)' } }
  ], viewport), []);
  assert.deepEqual(filterRenderedRects([text], [
    { rect: viewport, style: { clipPath: 'inset(50%)' } }
  ], viewport), []);
});

test('partly visible text is retained while a whole node with no visible glyphs is excluded', () => {
  assert.deepEqual(filterRenderedRects([box(50, 780, 500, 820)], [], viewport), [box(50, 780, 500, 800)]);
  const root = element('DIV', [element('P', ['隠れた複製']), element('P', ['見える本文'])]);
  const blocks = extractStyledBlocks(root, styleOf,
    node => node.textContent === '隠れた複製' ? [] : [box(50, 200, 400, 240)]);
  assert.deepEqual(textUnits(blocks), ['見える本文']);
});

function positioned(text, left, top, right, bottom, color = 'rgb(66, 66, 66)') {
  return { runs: [{ text, color }], color, rect: box(left, top, right, bottom) };
}
function twoColumnSchedule() {
  const blocks = [positioned('本日の内容', 75, 32, 450, 106),
    positioned('第1週', 35, 240, 480, 275, 'rgb(255, 112, 0)'),
    positioned('Processingの準備', 165, 288, 450, 323, 'rgb(255, 112, 0)'),
    positioned('第2週', 35, 358, 445, 393),
    positioned('図形描画', 165, 406, 780, 441)];
  for (let week = 3; week <= 9; week++) {
    blocks.push(positioned(`第${week}週`, 35, 475 + (week - 3) * 59, 810, 510 + (week - 3) * 59));
  }
  for (let week = 10; week <= 15; week++) {
    blocks.push(positioned(`第${week}週`, 863, 241 + (week - 10) * 70, 1490, 276 + (week - 10) * 70));
  }
  return blocks;
}

test('column mode reads the photographed layout as title, weeks 1–9, then weeks 10–15', () => {
  const source = twoColumnSchedule();
  const rows = orderVisibleBlocks(source);
  assert.deepEqual(textUnits(rows).slice(0, 5), ['本日の内容', '第1週', '第10週', 'Processingの準備', '第11週']);
  const columns = orderByColumns(rows);
  assert.deepEqual(textUnits(columns), [
    '本日の内容', '第1週', 'Processingの準備', '第2週', '図形描画',
    ...Array.from({ length: 13 }, (_, i) => `第${i + 3}週`)
  ]);
  assert.equal(columns[2].color, 'rgb(255, 112, 0)');
  // 元配列を変更せず、未設定のページでは以前の順番を使える。
  assert.deepEqual(textUnits(orderVisibleBlocks(source)), textUnits(rows));
});

test('column mode keeps full-width titles and footers outside the two columns', () => {
  const source = [positioned('Title', 20, 10, 1300, 80),
    positioned('Left 1', 20, 200, 550, 240), positioned('Left 2', 20, 260, 550, 300),
    positioned('Right 1', 750, 200, 1300, 240), positioned('Right 2', 750, 260, 1300, 300),
    positioned('Footer', 20, 450, 1300, 490)];
  assert.deepEqual(textUnits(orderByColumns(source)), ['Title', 'Left 1', 'Left 2', 'Right 1', 'Right 2', 'Footer']);
});

test('column mode does not treat an indented continuation in one column as a new column', () => {
  const source = [positioned('Title', 20, 10, 300, 60), positioned('1. Main', 20, 200, 120, 240),
    positioned('Continuation', 180, 250, 480, 290), positioned('2. Next', 20, 310, 120, 350)];
  assert.deepEqual(textUnits(orderByColumns(source)), textUnits(source));
});

test('column grouping survives uniform resizing and supports three columns', () => {
  const source = twoColumnSchedule();
  const resized = source.map(block => ({ ...block, rect: Object.fromEntries(Object.entries(block.rect).map(([key, value]) => [key, value * .5 + 10])) }));
  assert.deepEqual(textUnits(orderByColumns(resized)), textUnits(orderByColumns(source)));
  const triple = [0, 400, 800].flatMap((left, col) => [0, 60].map((top, row) => positioned(`${col}:${row}`, left, top, left + 300, top + 35)));
  assert.deepEqual(textUnits(orderByColumns(triple)), ['0:0', '0:1', '1:0', '1:1', '2:0', '2:1']);
});

const viewUrl = 'https://www.canva.com/design/EXAMPLE_DESIGN/share/view';
function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('only the selected page uses column mode, and its setting survives reload and return visits', () => {
  const storage = memoryStorage();
  const prefs = createPageOrderPreferences(storage);
  const first = pageOrderKey(viewUrl, twoColumnSchedule());
  const second = pageOrderKey(viewUrl, [positioned('次のページ', 20, 100, 600, 150)]);
  assert.equal(prefs.get(first), 'rows');
  assert.equal(prefs.get(second), 'rows');
  prefs.set(first, 'columns');
  assert.equal(prefs.get(first), 'columns');
  assert.equal(prefs.get(second), 'rows');
  const reloaded = createPageOrderPreferences(storage);
  assert.equal(reloaded.get(first), 'columns');
  assert.equal(reloaded.get(second), 'rows');
  reloaded.set(first, 'rows');
  assert.equal(createPageOrderPreferences(storage).get(first), 'rows');
  assert.equal(storage.values.size, 0);
});

test('page keys ignore reading order, colors, zoom and share token but distinguish decks and page links', () => {
  const blocks = twoColumnSchedule();
  const key = pageOrderKey(viewUrl, blocks);
  const changedLayout = [...blocks].reverse().map(block => ({ ...block, rect: box(0, 0, 1, 1), color: 'red' }));
  assert.equal(pageOrderKey(viewUrl, changedLayout), key);
  assert.equal(pageOrderKey(viewUrl.replace('/share/', '/other-share/') + '?embed', blocks), key);
  assert.notEqual(pageOrderKey(viewUrl.replace('EXAMPLE_DESIGN', 'ANOTHER'), blocks), key);
  assert.notEqual(pageOrderKey(viewUrl + '#2', blocks), pageOrderKey(viewUrl + '#3', blocks));
  assert.notEqual(pageOrderKey(viewUrl + '?page=2', blocks), pageOrderKey(viewUrl + '?page=3', blocks));
  assert.equal(pageOrderKey(viewUrl, []), '');
  assert.ok(!key.includes('本日の内容'));
});

test('blocked storage preserves per-page choices in memory without crashing or pretending persistence', () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); }, removeItem() { throw Error('denied'); } };
  const prefs = createPageOrderPreferences(denied);
  assert.equal(prefs.get('first'), 'rows');
  assert.equal(prefs.persistent, false);
  prefs.set('first', 'columns');
  assert.equal(prefs.get('first'), 'columns');
  assert.equal(prefs.get('second'), 'rows');
  prefs.set('first', 'rows');
  assert.equal(prefs.get('first'), 'rows');
  assert.equal(createPageOrderPreferences(null).persistent, false);
});

test('switching a translated slide to columns immediately reuses cached translations in the new order', async () => {
  const h = harness();
  const source = twoColumnSchedule();
  let calls = 0;
  h.controller.update(textUnits(orderVisibleBlocks(source)));
  h.controller.attach({ translate: async text => { calls++; return `en:${text}`; } }, 'en');
  await tick();
  const initialCalls = calls;
  const columns = textUnits(orderByColumns(source));
  h.controller.update(columns, false, true);
  await tick();
  assert.deepEqual(h.results.at(-1).blocks, columns.map(text => `en:${text}`));
  assert.equal(calls, initialCalls);
});

function panelRuntime(storage, initialBlocks, options = {}) {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const makeNode = tag => {
    const node = element(tag.toUpperCase());
    node.style = {};
    node.className = '';
    node.listeners = {};
    node.append = (...children) => {
      for (const child of children) {
        if (child.tagName === '#FRAGMENT') { node.append(...child.childNodes); continue; }
        child.parentElement = node;
        node.childNodes.push(child);
        if (node.tagName === 'SELECT' && node.value === undefined) node.value = child.value;
      }
    };
    node.replaceChildren = (...children) => { node.childNodes = []; node.append(...children); };
    node.setAttribute = (name, value) => { node.attributes[name] = value; };
    node.addEventListener = (type, listener) => { node.listeners[type] = listener; };
    node.contains = other => node === other || node.children.some(child => child.contains?.(other));
    node.getBoundingClientRect = () => ({ ...box(0, 0, 1400, 900), width: 1400, height: 900 });
    node.classList = {
      contains: name => node.className.split(' ').includes(name),
      add: name => { node.className += ` ${name}`; },
      toggle: (name, force) => {
        const on = force ?? !node.classList.contains(name);
        node.className = node.className.split(' ').filter(item => item && item !== name).concat(on ? [name] : []).join(' ');
        return on;
      }
    };
    return node;
  };
  const body = makeNode('body');
  let source;
  const setSlide = blocks => {
    source = makeNode('div');
    source.parentElement = body;
    for (const block of blocks) {
      const p = makeNode('p');
      p.appearance.color = block.color;
      p.childNodes = block.runs.map(run => ({ nodeType: 3, textContent: run.text, parentElement: p, rect: block.rect }));
      source.append(p);
    }
  };
  setSlide(initialBlocks);
  const walk = node => [node, ...node.children.flatMap(walk)];
  const doc = {
    body, hidden: false, createElement: makeNode, createDocumentFragment: () => makeNode('#fragment'),
    getElementById: id => walk(body).find(node => node.id === id),
    querySelectorAll: () => [source], addEventListener() {}, removeEventListener() {},
    createRange() { let node; return { selectNodeContents(value) { node = value; }, getClientRects() { return [node.rect]; } }; }
  };
  let poll;
  const stats = { created: [], calls: [], destroyed: 0 };
  const translator = { create: async ({ targetLanguage }) => {
    stats.created.push(targetLanguage);
    return { translate: async text => { stats.calls.push(text); return `${targetLanguage}:${text}`; },
      destroy() { stats.destroyed++; } };
  } };
  const context = { document: doc, location: new URL(viewUrl), URL, AbortController,
    innerWidth: 1400, innerHeight: 900, getComputedStyle: styleOf,
    window: { localStorage: storage, addEventListener() {}, removeEventListener() {} },
    self: { Translator: options.apiAvailable === false ? undefined : translator },
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval(callback) { poll = callback; return 1; }, clearInterval() {}, setTimeout() {}, clearTimeout() {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('./canva-reading-panel.user.js'), 'utf8'), context);
  return {
    setSlide, stats, refresh: () => poll(),
    order: () => doc.getElementById('canva-reading-panel-local-order'),
    uiToggle: () => doc.getElementById('canva-reading-panel-local-translate-ui'),
    target: () => walk(body).find(node => node.tagName === 'SELECT' && !node.id),
    host: () => doc.getElementById('canva-reading-panel-local'),
    fontControls: () => walk(body).find(node => node.className === 'crp-font-controls'),
    panelBody: () => walk(body).find(node => node.className === 'crp-body'),
    status: () => walk(body).find(node => node.className === 'crp-status'),
    start: () => walk(body).find(node => node.className === 'crp-controls').children.find(node => node.tagName === 'BUTTON'),
    content: () => walk(body).filter(node => node.className === 'crp-block').map(node => node.children.map(child => child.textContent).join(''))
  };
}

test('text size validates stored values, clamps limits, and survives reload or blocked storage',()=>{
  const saved=memoryStorage();let preference=createTextSizePreference(saved);
  assert.equal(preference.size,17);preference.set(25);
  assert.equal(createTextSizePreference(saved).size,25);
  assert.equal(preference.set(1000),32);assert.equal(preference.set(-1),12);
  for(const value of ['',null,'bad',Infinity])assert.equal(preference.set(value),17);
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  preference=createTextSizePreference(denied);preference.set(24);assert.equal(preference.size,24);
});

test('font controls resize the current text without retranslating, persist, and follow the UI language',async()=>{
  const saved=memoryStorage(),app=panelRuntime(saved,twoColumnSchedule());
  const [label,smaller,value,larger]=app.fontControls().children;
  assert.equal(label.textContent,'Text size');assert.equal(app.panelBody().style.fontSize,'17px');
  await app.start().listeners.click();await tick();
  const calls=app.stats.calls.length,content=app.content();
  app.panelBody().scrollTop=120;
  larger.listeners.click();assert.equal(app.panelBody().style.fontSize,'18px');assert.equal(value.textContent,'18 px');
  assert.deepEqual(app.content(),content);assert.equal(app.stats.calls.length,calls);assert.equal(app.panelBody().scrollTop,120);
  app.setSlide([positioned('次の資料',20,100,600,150)]);app.refresh();await tick();
  assert.equal(app.panelBody().style.fontSize,'18px');
  assert.equal(panelRuntime(saved,twoColumnSchedule()).panelBody().style.fontSize,'18px');
  app.uiToggle().checked=false;app.uiToggle().listeners.change();
  assert.equal(label.textContent,'文字サイズ');assert.equal(larger.attributes['aria-label'],'文字を大きく');
  for(let i=0;i<30;i++)larger.listeners.click();assert.equal(app.panelBody().style.fontSize,'32px');assert.equal(larger.disabled,true);
  for(let i=0;i<30;i++)smaller.listeners.click();assert.equal(app.panelBody().style.fontSize,'12px');assert.equal(smaller.disabled,true);
  assert.equal(app.host().classList.contains('crp-left'),false);
});

test('full userscript wires the page-specific selector, automatic restore, and safe slide-change handling', async () => {
  const storage = memoryStorage();
  const slideA = twoColumnSchedule();
  const slideB = [positioned('別のページ', 20, 100, 600, 150)];
  const runtime = panelRuntime(storage, slideA);
  assert.equal(runtime.order().value, 'rows');
  await runtime.start().listeners.click();
  await tick();
  runtime.order().value = 'columns';
  runtime.order().listeners.change();
  await tick();
  assert.deepEqual(runtime.content(), textUnits(orderByColumns(slideA)).map(text => `en:${text}`));
  runtime.setSlide(slideB);
  runtime.refresh();
  await tick();
  assert.equal(runtime.order().value, 'rows');
  assert.deepEqual(runtime.content(), ['en:別のページ']);
  runtime.setSlide(slideA);
  runtime.refresh();
  await tick();
  assert.equal(runtime.order().value, 'columns');
  assert.equal(panelRuntime(storage, slideA).order().value, 'columns');
  // 切り替え通知より先に操作されても、古いページの選択を新しいページへ保存しない。
  runtime.setSlide(slideB);
  runtime.order().value = 'columns';
  runtime.order().listeners.change();
  assert.equal(runtime.order().value, 'rows');
  assert.equal(storage.values.size, 1);
});

test('turning control translation off uses Japanese labels while leaving the chosen content language untouched', () => {
  const elements = uiElements();
  elements.target.value = 'ar';
  localizeControls(elements, { language: 'ar', started: true, collapsed: false, translateUi: false });
  assert.equal(elements.host.lang, 'ja');
  assert.equal(elements.host.dir, 'ltr');
  assert.equal(elements.start.textContent, '翻訳し直す');
  assert.equal(elements.toggle.textContent, '折りたたむ');
  assert.equal(elements.orderLabel.textContent, 'このページの読み順');
  assert.equal(elements.uiToggleText.textContent, 'ボタン・案内文を選択言語にする');
  assert.equal(elements.uiToggle.checked, false);
  assert.equal(elements.target.value, 'ar');
  localizeControls(elements, { language: 'ar', started: true, collapsed: false, translateUi: true });
  assert.equal(elements.host.lang, 'ar');
  assert.equal(elements.start.textContent, 'إعادة الترجمة');
  assert.equal(elements.uiToggle.checked, true);
});

test('the control translation preference defaults on, persists both choices and tolerates blocked storage', () => {
  const storage = memoryStorage();
  const preference = createUiTranslationPreference(storage);
  assert.equal(preference.enabled, true);
  preference.set(false);
  assert.equal(createUiTranslationPreference(storage).enabled, false);
  preference.set(true);
  assert.equal(createUiTranslationPreference(storage).enabled, true);
  const denied = createUiTranslationPreference({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  denied.set(false);
  assert.equal(denied.enabled, false);
  assert.equal(denied.persistent, false);
});

test('changing the UI preference preserves active translation, scroll position, language and page reading order', async () => {
  const storage = memoryStorage();
  const runtime = panelRuntime(storage, twoColumnSchedule());
  await runtime.start().listeners.click();
  await tick();
  runtime.order().value = 'columns';
  runtime.order().listeners.change();
  await tick();
  const before = runtime.content();
  const calls = runtime.stats.calls.length;
  runtime.panelBody().scrollTop = 120;
  runtime.uiToggle().checked = false;
  runtime.uiToggle().listeners.change();
  assert.equal(runtime.start().textContent, '翻訳し直す');
  assert.equal(runtime.target().value, 'en');
  assert.equal(runtime.order().value, 'columns');
  assert.deepEqual(runtime.content(), before);
  assert.equal(runtime.panelBody().scrollTop, 120);
  assert.match(runtime.status().textContent, /自動翻訳が有効/);
  assert.equal(runtime.stats.calls.length, calls);
  assert.equal(runtime.stats.destroyed, 0);
  const reloaded = panelRuntime(storage, twoColumnSchedule());
  assert.equal(reloaded.uiToggle().checked, false);
  assert.equal(reloaded.start().textContent, '翻訳開始');
  assert.equal(reloaded.order().value, 'columns');
  runtime.uiToggle().checked = true;
  runtime.uiToggle().listeners.change();
  assert.equal(runtime.start().textContent, 'Translate again');
  assert.deepEqual(runtime.content(), before);
});

test('Japanese displays the original without a translation API, updates on slide change and keeps selected colors', async () => {
  const runtime = panelRuntime(memoryStorage(), twoColumnSchedule(), { apiAvailable: false });
  assert.ok(runtime.target().children.some(option => option.value === 'ja' && option.textContent === '日本語'));
  runtime.target().value = 'ja';
  runtime.target().listeners.change();
  assert.equal(runtime.start().textContent, '原文を表示');
  assert.match(runtime.status().textContent, /日本語の原文/);
  await runtime.start().listeners.click();
  await tick();
  assert.deepEqual(runtime.content(), textUnits(orderVisibleBlocks(twoColumnSchedule())));
  assert.equal(runtime.start().textContent, '表示を更新');
  assert.equal(runtime.stats.created.length, 0);
  assert.equal(runtime.panelBody().lang, 'ja');
  assert.equal(runtime.panelBody().children[1].children[0].style.color, 'rgb(255, 112, 0)');
  runtime.setSlide([positioned('次のページの原文', 20, 100, 600, 150)]);
  runtime.refresh();
  await tick();
  assert.deepEqual(runtime.content(), ['次のページの原文']);
  assert.match(runtime.status().textContent, /日本語の原文を表示しています/);
});

test('Japanese and foreign-language content can be switched while controls stay Japanese and RTL content stays RTL', async () => {
  const runtime = panelRuntime(memoryStorage(), [positioned('本文', 20, 100, 600, 150)]);
  runtime.uiToggle().checked = false;
  runtime.uiToggle().listeners.change();
  runtime.target().value = 'ja';
  runtime.target().listeners.change();
  await runtime.start().listeners.click();
  await tick();
  assert.deepEqual(runtime.content(), ['本文']);
  runtime.target().value = 'ar';
  runtime.target().listeners.change();
  assert.equal(runtime.start().textContent, '翻訳開始');
  await runtime.start().listeners.click();
  await tick();
  assert.deepEqual(runtime.content(), ['ar:本文']);
  assert.equal(runtime.panelBody().dir, 'rtl');
  assert.equal(runtime.host().dir, 'ltr');
  assert.deepEqual(runtime.stats.created, ['ar']);
  runtime.uiToggle().checked = true;
  runtime.uiToggle().listeners.change();
  assert.equal(runtime.host().dir, 'rtl');
  assert.equal(runtime.panelBody().dir, 'rtl');
});
