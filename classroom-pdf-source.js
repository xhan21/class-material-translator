  // Google Drive preview DOM observed in Classroom on 2026-10-02.
  // Read the displayed PDF's text layer and its already-loaded page image. Never fetch or save the PDF file.
  const PDF_SELECTORS = {
    page: '.ndfHFb-c4YZDc-cYSp0e-DARUcf',
    layer: '.ndfHFb-c4YZDc-cYSp0e-DARUcf-Df1ZY-bN97Pc-haAclf',
    paragraph: 'p.ndfHFb-c4YZDc-cYSp0e-DARUcf-Df1ZY-eEGnhe',
    heading: 'h2.ndfHFb-c4YZDc-cYSp0e-DARUcf-Df1ZY-tJHJj',
    title: 'span[data-tooltip-x-position]',
    image: 'img.ndfHFb-c4YZDc-cYSp0e-DARUcf-RJLb9c',
    frame: 'iframe[src]'
  };
  const PDF_CHANNEL = 'classroom-pdf-reading-panel:v1';
  const CLASSROOM_ORIGIN = 'https://classroom.google.com';
  const DRIVE_ORIGIN = 'https://drive.google.com';
  const PDF_DEFAULT_COLOR = 'rgb(66, 66, 66)';
  // Keep pixels for only one page. No PDF/image requests, files, or external services.
  let pdfImageCache = null;

  function safePdfColor(value) {
    const match = typeof value === 'string' && value.match(/^rgb\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*\)$/);
    return match && match.slice(1).every(v => Number(v) <= 255)
      ? `rgb(${Number(match[1])}, ${Number(match[2])}, ${Number(match[3])})` : PDF_DEFAULT_COLOR;
  }

  function samplePdfTextColor(pixels, rect) {
    const { width, height, data } = pixels;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        !data || data.length !== width * height * 4 ||
        !['left', 'right', 'top', 'bottom'].every(k => Number.isFinite(rect[k]))) return null;
    const left = Math.max(0, Math.floor(rect.left)), top = Math.max(0, Math.floor(rect.top));
    const right = Math.min(width, Math.ceil(rect.right)), bottom = Math.min(height, Math.ceil(rect.bottom));
    if (right - left < 2 || bottom - top < 2) return null;
    const histogram = new Map();
    // Sampling stays bounded even on a poster-size PDF or a huge text rectangle.
    const step = Math.max(1, Math.ceil(Math.sqrt((right - left) * (bottom - top) / 160000)));
    let samples = 0;
    for (let y = top; y < bottom; y += step) for (let x = left; x < right; x += step) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 240) continue;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      // Group anti-aliased shades while retaining an actual source pixel as representative.
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let entry = histogram.get(key);
      if (!entry) histogram.set(key, entry = { count: 0, r: 0, g: 0, b: 0, colors: new Map() });
      entry.count++; entry.r += r; entry.g += g; entry.b += b;
      const exact = (r << 16) | (g << 8) | b;
      entry.colors.set(exact, (entry.colors.get(exact) || 0) + 1);
      samples++;
    }
    const groups = [...histogram.values()].sort((a, b) => b.count - a.count);
    if (!groups.length || groups[0].count < samples * .35) return null; // Photo/complex background: avoid guessing.
    const background = groups[0];
    const distance = group => (group.r / group.count - background.r / background.count) ** 2 +
      (group.g / group.count - background.g / background.count) ** 2 +
      (group.b / group.count - background.b / background.count) ** 2;
    // The most common non-background shade is normally the solid interior of the letters.
    const ink = groups.find(group => group.count >= Math.max(3, samples * .002) && distance(group) >= 900);
    if (!ink) return null;
    const representative = [...ink.colors].sort((a, b) => b[1] - a[1])[0][0];
    return `rgb(${representative >> 16}, ${(representative >> 8) & 255}, ${representative & 255})`;
  }

  function pdfPageColorReader(doc, page) {
    const image = page.querySelector(PDF_SELECTORS.image);
    if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
      pdfImageCache = null;
      return () => PDF_DEFAULT_COLOR;
    }
    const src = image.currentSrc || image.src;
    if (!pdfImageCache || pdfImageCache.image !== image || pdfImageCache.src !== src ||
        pdfImageCache.naturalWidth !== image.naturalWidth || pdfImageCache.naturalHeight !== image.naturalHeight) {
      const cache = { image, src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
        pixels: null, colors: new Map() };
      pdfImageCache = cache;
      try {
        const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = doc.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        cache.pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // Some viewers restrict pixel access. Keep translation working; never bypass CORS or fetch the PDF.
      }
    }
    const cache = pdfImageCache, bounds = image.getBoundingClientRect();
    const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
    if (!cache.pixels || width <= 0 || height <= 0) return () => PDF_DEFAULT_COLOR;
    return rect => {
      const target = {
        left: (rect.left - bounds.left) / width * cache.pixels.width,
        right: (rect.right - bounds.left) / width * cache.pixels.width,
        top: (rect.top - bounds.top) / height * cache.pixels.height,
        bottom: (rect.bottom - bounds.top) / height * cache.pixels.height
      };
      const key = [target.left, target.top, target.right, target.bottom].map(Math.round).join(',');
      if (!cache.colors.has(key)) {
        if (cache.colors.size >= 1000) cache.colors.clear();
        cache.colors.set(key, samplePdfTextColor(cache.pixels, target) || PDF_DEFAULT_COLOR);
      }
      return cache.colors.get(key);
    };
  }

  function isDrivePdfRoute(address) {
    try {
      const url = new URL(address);
      return url.origin === DRIVE_ORIGIN &&
        (/^\/viewer\/main\/?$/.test(url.pathname) || /^\/file\/(?:u\/\d+\/)?d\/[^/]+\/(view|preview)\/?$/.test(url.pathname));
    } catch { return false; }
  }

  function visiblePdfRect(element, win) {
    let result = { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
    for (let current = element; current; current = current.parentElement) {
      const style = win.getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.contentVisibility === 'hidden' ||
          (style.opacity !== '' && style.opacity != null && Number(style.opacity) <= .01)) return null;
      const rect = current.getBoundingClientRect();
      if (current === element || /^(auto|scroll|hidden|clip)$/.test(style.overflowX)) {
        result.left = Math.max(result.left, rect.left);
        result.right = Math.min(result.right, rect.right);
      }
      if (current === element || /^(auto|scroll|hidden|clip)$/.test(style.overflowY)) {
        result.top = Math.max(result.top, rect.top);
        result.bottom = Math.min(result.bottom, rect.bottom);
      }
    }
    return result.right > result.left && result.bottom > result.top ? result : null;
  }

  function choosePdfPage(pages) {
    let best = null;
    for (const page of pages) {
      if (!page.visible) continue;
      const area = (page.visible.right - page.visible.left) * (page.visible.bottom - page.visible.top);
      // A preview preloads adjacent pages. Only translate the page occupying most of the viewport.
      if (area > 0 && (!best || area > best.area)) best = { ...page, area };
    }
    return best;
  }

  function pdfTextBlock(text, rect, sourceColor = PDF_DEFAULT_COLOR) {
    const clean = text.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim();
    if (!clean) return null;
    // Keep literal list markers outside the translation engine, including markers with no following space.
    const numbered = clean.match(/^([0-9０-９]+[.．、)）])(?![0-9０-９])\s*(\S[\s\S]*)$/u);
    const bullet = clean.match(/^([①-⑳•●○▪■・])\s*(\S[\s\S]*)$/u);
    const marker = numbered || bullet;
    const color = safePdfColor(sourceColor);
    return {
      color, runs: [{ text: marker ? marker[2] : clean, color }], rect,
      ...(marker ? { list: { marker: marker[1], depth: 0 } } : {})
    };
  }

  function readDrivePdf(doc, win) {
    const titleElement = [...doc.querySelectorAll(PDF_SELECTORS.title)]
      .find(el => /\.pdf$/i.test(el.textContent.trim()) && visiblePdfRect(el, win));
    const documentTitle = titleElement?.textContent.trim() || '';
    if (!documentTitle) { pdfImageCache = null; return { open: false }; }
    const elements = [...doc.querySelectorAll(PDF_SELECTORS.page)];
    const current = choosePdfPage(elements.map((element, index) => ({
      element, index, visible: visiblePdfRect(element, win)
    })));
    if (!current) return { open: true, documentTitle, page: 0, total: elements.length, blocks: [] };
    const layer = current.element.querySelector(PDF_SELECTORS.layer);
    const label = layer?.querySelector(PDF_SELECTORS.heading)?.textContent || '';
    const digits = label.replace(/[٠-٩]/g, ch => String(ch.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 0x6f0)).match(/\d+/g);
    const page = digits?.length >= 2 ? Number(digits[0]) : current.index + 1;
    const total = digits?.length >= 2 ? Number(digits[1]) : elements.length;
    const bounds = current.element.getBoundingClientRect();
    const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
    const readColor = pdfPageColorReader(doc, current.element);
    const blocks = [];
    for (const paragraph of layer?.querySelectorAll(PDF_SELECTORS.paragraph) || []) {
      const rect = paragraph.getBoundingClientRect();
      // The selection layer is white regardless of PDF colors. Sample the rendered page image instead.
      const block = pdfTextBlock(paragraph.textContent, {
        left: (rect.left - bounds.left) / width * 100,
        right: (rect.right - bounds.left) / width * 100,
        top: (rect.top - bounds.top) / height * 100,
        bottom: (rect.bottom - bounds.top) / height * 100
      }, readColor(rect));
      if (block) blocks.push(block);
    }
    return sanitizePdfSnapshot({ open: true, documentTitle, page, total, blocks }) || { open: false };
  }

  function sanitizePdfSnapshot(input) {
    if (!input || typeof input !== 'object' || typeof input.open !== 'boolean') return null;
    if (!input.open) return { open: false };
    if (typeof input.documentTitle !== 'string' || input.documentTitle.length > 1024 || !/\.pdf$/i.test(input.documentTitle) ||
        !Number.isInteger(input.page) || !Number.isInteger(input.total) || input.page < 0 || input.total < 0 ||
        input.page > input.total || input.total > 100000 || !Array.isArray(input.blocks) || input.blocks.length > 1000) return null;
    let size = 0;
    const blocks = [];
    for (const block of input.blocks) {
      const text = block?.runs?.[0]?.text;
      if (typeof text !== 'string' || !text.trim() || text.length > 20000 || (size += text.length) > 200000 ||
          !block.rect || !['left', 'right', 'top', 'bottom'].every(key => Number.isFinite(block.rect[key]) && Math.abs(block.rect[key]) < 10000) ||
          block.rect.right <= block.rect.left || block.rect.bottom <= block.rect.top) return null;
      const color = safePdfColor(block.color);
      const clean = { color, runs: [{ text, color }], rect: {
        left: block.rect.left, right: block.rect.right, top: block.rect.top, bottom: block.rect.bottom
      } };
      if (block.list && typeof block.list.marker === 'string' && block.list.marker.length <= 20) {
        clean.list = { marker: block.list.marker, depth: 0 };
      }
      blocks.push(clean);
    }
    return { open: true, documentTitle: input.documentTitle, page: input.page, total: input.total, blocks };
  }

  function acceptPdfMessage(event, frameWindow, token) {
    const data = event.data;
    if (!frameWindow || event.source !== frameWindow || event.origin !== DRIVE_ORIGIN ||
        !data || data.channel !== PDF_CHANNEL || data.type !== 'snapshot' || data.token !== token) return null;
    return sanitizePdfSnapshot(data.snapshot);
  }

  function pdfPageKey(address, snapshot, blocks) {
    if (!snapshot?.open || !snapshot.page || !blocks.length) return '';
    const url = new URL(address);
    const identity = JSON.stringify([url.origin + url.pathname, snapshot.documentTitle, snapshot.page,
      blocks.map(block => (block.list?.marker || '') + block.runs.map(run => run.text).join('')).sort()]);
    let hash = 2166136261, other = 2246822507;
    for (let i = 0; i < identity.length; i++) {
      hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619);
      other = Math.imul(other ^ identity.charCodeAt(i), 3266489909);
    }
    return `crp:pdf-order:v1:${(hash >>> 0).toString(16)}${(other >>> 0).toString(16)}`;
  }

  function startPdfFrameSource() {
    let token = '', timer = null, last = '';
    function send(force = false) {
      if (!token) return;
      const snapshot = readDrivePdf(document, window);
      const signature = JSON.stringify(snapshot);
      if (!force && signature === last) return;
      last = signature;
      window.parent.postMessage({ channel: PDF_CHANNEL, type: 'snapshot', token, snapshot }, CLASSROOM_ORIGIN);
    }
    function request(event) {
      if (event.origin !== CLASSROOM_ORIGIN || event.source !== window.parent ||
          event.data?.channel !== PDF_CHANNEL || event.data.type !== 'request' ||
          typeof event.data.token !== 'string' || event.data.token.length > 128) return;
      token = event.data.token;
      send(true);
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(send, 150); }
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['style', 'class', 'hidden', 'src'] });
    window.addEventListener('load', schedule, true);
    window.addEventListener('message', request);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const poll = setInterval(send, 1000);
    window.addEventListener('pagehide', event => {
      if (event.persisted) return;
      clearInterval(poll); clearTimeout(timer); observer.disconnect();
      window.removeEventListener('message', request);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule, true);
    });
  }

  // Translation runs in the top-level Classroom page. Cross-origin Drive frames only read PDF text/colors;
  // no iframe permission changes or external translation APIs are needed.
  function createPdfSource(onChange) {
    const classroom = location.origin === CLASSROOM_ORIGIN;
    let frame = null, token = '', snapshot = { open: false }, signature = '', disposed = false;
    const visibleFrame = () => [...document.querySelectorAll(PDF_SELECTORS.frame)]
      .find(candidate => isDrivePdfRoute(candidate.src) && visiblePdfRect(candidate, window));
    function changed(next) {
      const nextSignature = JSON.stringify(next);
      if (nextSignature === signature) return;
      signature = nextSignature;
      snapshot = next;
      onChange();
    }
    function resetFrame() {
      token = crypto.randomUUID();
      changed({ open: false });
      request();
    }
    function request() {
      frame?.contentWindow?.postMessage({ channel: PDF_CHANNEL, type: 'request', token }, DRIVE_ORIGIN);
    }
    function message(event) {
      if (disposed || !frame || frame !== visibleFrame()) return;
      const next = acceptPdfMessage(event, frame.contentWindow, token);
      if (next) changed(next);
    }
    if (classroom) window.addEventListener('message', message);
    return {
      get snapshot() { return snapshot; },
      read() {
        if (disposed) return { open: false };
        if (!classroom) return (snapshot = readDrivePdf(document, window));
        const current = visibleFrame();
        if (current !== frame) {
          frame?.removeEventListener('load', resetFrame);
          frame = current;
          token = crypto.randomUUID();
          snapshot = { open: false };
          signature = '';
          frame?.addEventListener('load', resetFrame);
        }
        request();
        return snapshot;
      },
      dispose() {
        disposed = true;
        frame?.removeEventListener('load', resetFrame);
        window.removeEventListener('message', message);
        snapshot = { open: false };
      }
    };
  }
