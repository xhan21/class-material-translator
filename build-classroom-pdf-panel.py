"""Reuse the tested Canva panel UI/controller, adding the observed Drive PDF reader."""
import json
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def build():
    canva_source = (ROOT / 'canva-reading-panel.user.js').read_text()
    source = canva_source
    def replace(old, new, count=1):
        nonlocal source
        assert source.count(old) == count, (old[:100], source.count(old))
        source = source.replace(old, new)
    replace('// @name         Canva 閲覧用テキストパネル（試用版）', '// @name         Classroom PDF 翻訳パネル（試用版）')
    replace('// @namespace    local.canva-translation', '// @namespace    local.classroom-pdf-translation')
    replace('// @version      2.8.0', '// @version      0.3.0')
    replace('// @description  Chrome内蔵の翻訳機能で、スライドを送るたびに別欄の訳文を更新します。', '// @description  Classroom・Google Driveで開いたPDFを、保存せず横のパネルで翻訳します。')
    replace('// @match        https://www.canva.com/design/*/view*', '\n'.join([
        '// @match        https://classroom.google.com/*',
        '// @match        https://drive.google.com/viewer/main*',
        '// @match        https://drive.google.com/file/d/*/view*',
        '// @match        https://drive.google.com/file/d/*/preview*',
        '// @match        https://drive.google.com/file/u/*/d/*/view*',
        '// @match        https://drive.google.com/file/u/*/d/*/preview*'
    ]))
    replace('// 以前のコード全体を、このコードに置き換えて保存してください。', '// PDF版の更新はコード全体を置き換えて保存してください。初回のみCanva版とは別に登録します。')
    messages = json.loads((ROOT / 'canva-panel-ui.json').read_text())
    labels = {
        'en': ['PDF translator', 'Reading order (this page)', 'No readable text on this page. Wait for loading; image-only PDFs are not supported.'],
        'ja': ['PDF翻訳', 'このページの読み順', 'このページの文字を読み取れません。読み込みを待ってください。画像だけのPDFには対応していません。'],
        'zh': ['PDF 翻译', '本页阅读顺序', '本页没有可读取的文字。请等待加载；不支持纯图片 PDF。'],
        'zh-Hant': ['PDF 翻譯', '本頁閱讀順序', '本頁沒有可讀取的文字。請等待載入；不支援純圖片 PDF。'],
        'ko': ['PDF 번역', '이 페이지의 읽기 순서', '읽을 수 있는 글자가 없습니다. 로딩을 기다려 주세요. 이미지로만 된 PDF는 지원하지 않습니다.'],
        'vi': ['Dịch PDF', 'Thứ tự đọc trang này', 'Không có chữ đọc được. Hãy chờ tải trang; không hỗ trợ PDF chỉ có ảnh.'],
        'th': ['แปล PDF', 'ลำดับการอ่านหน้านี้', 'ไม่พบข้อความที่อ่านได้ โปรดรอโหลด ไม่รองรับ PDF ที่เป็นภาพล้วน'],
        'id': ['Penerjemah PDF', 'Urutan baca halaman ini', 'Tidak ada teks yang terbaca. Tunggu pemuatan; PDF yang hanya berisi gambar tidak didukung.'],
        'es': ['Traductor de PDF', 'Orden de lectura de esta página', 'No hay texto legible. Espera a que cargue; los PDF de solo imágenes no son compatibles.'],
        'fr': ['Traducteur PDF', 'Ordre de lecture de cette page', 'Aucun texte lisible. Attendez le chargement ; les PDF uniquement en images ne sont pas pris en charge.'],
        'de': ['PDF-Übersetzer', 'Lesereihenfolge dieser Seite', 'Kein lesbarer Text. Bitte auf das Laden warten; reine Bild-PDFs werden nicht unterstützt.'],
        'it': ['Traduttore PDF', 'Ordine di lettura di questa pagina', 'Nessun testo leggibile. Attendi il caricamento; i PDF di sole immagini non sono supportati.'],
        'pt': ['Tradutor de PDF', 'Ordem de leitura desta página', 'Nenhum texto legível. Aguarde o carregamento; PDFs somente de imagens não são suportados.'],
        'ru': ['Переводчик PDF', 'Порядок чтения этой страницы', 'Нет доступного текста. Подождите загрузки; PDF только с изображениями не поддерживаются.'],
        'uk': ['Перекладач PDF', 'Порядок читання цієї сторінки', 'Немає доступного тексту. Зачекайте завантаження; PDF лише із зображеннями не підтримуються.'],
        'ar': ['مترجم PDF', 'ترتيب قراءة هذه الصفحة', 'لا يوجد نص قابل للقراءة. انتظر التحميل؛ ملفات PDF المؤلفة من صور فقط غير مدعومة.'],
        'hi': ['PDF अनुवादक', 'इस पेज का पढ़ने का क्रम', 'पढ़ने योग्य पाठ नहीं है। लोड होने की प्रतीक्षा करें; केवल चित्र वाले PDF समर्थित नहीं हैं।'],
        'bn': ['PDF অনুবাদক', 'এই পৃষ্ঠার পড়ার ক্রম', 'পড়ার মতো লেখা নেই। লোড হওয়া পর্যন্ত অপেক্ষা করুন; শুধু ছবির PDF সমর্থিত নয়।'],
        'tr': ['PDF çevirmeni', 'Bu sayfanın okuma sırası', 'Okunabilir metin yok. Yüklenmesini bekleyin; yalnızca resim içeren PDF dosyaları desteklenmez.']
    }
    for lang, (title, page_order, empty) in labels.items():
        messages[lang].update(title=title, pageOrder=page_order, empty=empty)
    source = re.sub(r'  // BEGIN_UI_MESSAGES[\s\S]*?  // END_UI_MESSAGES',
        lambda _: '  // BEGIN_UI_MESSAGES\n  const UI_MESSAGES = ' + json.dumps(messages, ensure_ascii=False, indent=2) + ';\n  // END_UI_MESSAGES', source)
    adapter = (ROOT / 'classroom-pdf-source.js').read_text()
    replace('  // 更新・抽出・出力の各処理をNodeでも回帰テストできる。', adapter + '\n  // 更新・抽出・出力の各処理をNodeでも回帰テストできる。')
    replace('      uiLanguages: Object.keys(UI_MESSAGES)', '      PDF_SELECTORS, PDF_CHANNEL, safePdfColor, samplePdfTextColor, pdfPageColorReader, isDrivePdfRoute, visiblePdfRect, choosePdfPage, pdfTextBlock,\n      readDrivePdf, sanitizePdfSnapshot, acceptPdfMessage, pdfPageKey, createPdfSource, startPdfFrameSource,\n      uiLanguages: Object.keys(UI_MESSAGES)')
    replace("  const isViewer = () =>\n    /^\\/design\\/[^/]+\\/(?:[^/]+\\/)?view\\/?$/.test(location.pathname);", """  const isViewer = () => location.origin === CLASSROOM_ORIGIN || isDrivePdfRoute(location.href);
  if (window.top !== window) {
    if (isDrivePdfRoute(location.href) && document.body) startPdfFrameSource();
    return;
  }""")
    replace("  const id = 'canva-reading-panel-local';", "  const id = 'classroom-pdf-reading-panel-local';")
    replace('    #${id}.crp-left {', '    #${id}[hidden] { display: none !important; }\n    #${id}.crp-left {')
    replace("  let disposed = false;", "  let disposed = false;\n  const pdfSource = createPdfSource(() => refresh());\n  function updatePageTitle() {\n    const page = pdfSource.snapshot;\n    title.textContent = uiText(currentUiLanguage(), 'title') +\n      (page?.open && page.page ? ` · ${page.page}/${page.total}` : '');\n  }")
    replace('    renderStatus();\n    updateOrderHint();', '    renderStatus();\n    updatePageTitle();\n    updateOrderHint();')
    replace('pageOrderKey(location.href, source)', 'pdfPageKey(location.href, pdfSource.snapshot, source)', count=2)
    start = source.index('  // 確認済みのCanva本文の属性を使う。')
    end = source.index('\n  function updateSource(', start)
    source = source[:start] + """  function readVisibleBlocks() {
    const snapshot = pdfSource.read();
    return orderVisibleBlocks(snapshot.open ? snapshot.blocks || [] : []);
  }
""" + source[end:]
    replace('    currentPageKey = pdfPageKey(location.href, pdfSource.snapshot, source);', '    host.hidden = !pdfSource.snapshot.open;\n    updatePageTitle();\n    currentPageKey = pdfPageKey(location.href, pdfSource.snapshot, source);')
    replace('    const signature = JSON.stringify(blocks);', '    const signature = JSON.stringify([currentPageKey, blocks]);')
    replace('    observer.disconnect();\n    clearInterval(poll);', '    pdfSource.dispose();\n    observer.disconnect();\n    clearInterval(poll);')
    replace("    const key = 'crp:translate-ui:v1';", "    const key = 'crp:pdf-translate-ui:v1';")
    replace("const key = 'crp:text-size:v1';", "const key = 'crp:pdf-text-size:v1';")
    # Clear columns are read left to right by default; row order remains available per page.
    replace('function createPageOrderPreferences(storage)', "function createPageOrderPreferences(storage, defaultMode = 'rows')")
    replace("if (!key) return 'rows';", 'if (!key) return defaultMode;')
    replace("let mode = 'rows';\n        try { if (storage?.getItem(key) === 'columns') mode = 'columns'; }", "let mode = defaultMode;\n        try { const saved = storage?.getItem(key); if (saved === 'columns' || saved === 'rows') mode = saved; }")
    replace("if (value === 'columns') storage?.setItem(key, value);", 'if (value !== defaultMode) storage?.setItem(key, value);')
    replace('const pageOrders = createPageOrderPreferences(storage);', "const pageOrders = createPageOrderPreferences(storage, 'columns');")
    replace('    // 未設定のページは従来の行順。番号・色は保持し、最後に座標とDOM参照を取り除く。', '    // 初期値は列順。明確な列がない場合は行順になり、ページごとの変更も保存する。')
    (ROOT / 'classroom-pdf-reading-panel.user.js').write_text(source)
    guide = (ROOT / 'classroom-pdf-guide.template.html').read_text()
    guide = guide.replace('__CSS__', (ROOT / 'canva-guide.css').read_text())
    guide = guide.replace('__CANVA_VERSION__', re.search(r'^// @version\s+(\S+)', canva_source, re.M)[1])
    guide = guide.replace('__PDF_VERSION__', re.search(r'^// @version\s+(\S+)', source, re.M)[1])
    guide = guide.replace('__CANVA_SOURCE__', html.escape(canva_source))
    guide = guide.replace('__PDF_SOURCE__', html.escape(source))
    for name in ('class-material-translation-guide.html', 'class-material-translation-google-sites.txt',
                 'classroom-pdf-panel-install.html', 'classroom-pdf-guide-google-sites.txt'):
        (ROOT / name).write_text(guide)
    print('Built Classroom PDF userscript v0.3.0 and combined Canva/PDF guide.')


if __name__ == '__main__':
    build()
