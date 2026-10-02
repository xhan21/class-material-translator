"""Build both self-contained guide files; no network or translation service."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LANGUAGES = {
    'ja': '日本語', 'en': 'English', 'zh': '简体中文', 'zh-Hant': '繁體中文',
    'ko': '한국어', 'vi': 'Tiếng Việt', 'th': 'ไทย', 'id': 'Bahasa Indonesia',
    'es': 'Español', 'fr': 'Français', 'de': 'Deutsch', 'it': 'Italiano',
    'pt': 'Português', 'ru': 'Русский', 'uk': 'Українська', 'ar': 'العربية',
    'hi': 'हिन्दी', 'bn': 'বাংলা', 'tr': 'Türkçe',
}


def shape(value):
    if isinstance(value, dict):
        return {key: shape(item) for key, item in value.items()}
    if isinstance(value, list):
        return [shape(item) for item in value]
    assert isinstance(value, str) and value.strip(), 'Translations must be nonempty strings'
    return 'text'


def build():
    locales = {lang: json.loads((ROOT / 'canva-guide-locales' / f'{lang}.json').read_text()) for lang in LANGUAGES}
    ui = json.loads((ROOT / 'canva-panel-ui.json').read_text())
    assert set(locales) == set(LANGUAGES) == set(ui)
    expected = shape(locales['ja'])
    for lang, locale in locales.items():
        assert shape(locale) == expected, f'Incomplete translation: {lang}'
        locale['tokens'] = {key: ui[lang][key] for key in (
            'start', 'retry', 'collapse', 'expand', 'pageOrder', 'orderRows', 'orderColumns', 'translateUi')}
        locale['tokens'].update(author=locale['author'], original='原文を表示', refresh='表示を更新')
        if lang != 'en':
            locale['tokens']['start'] = ui['en']['start'] + ' / ' + ui[lang]['start']

    def value(path):
        current = locales['ja']
        for part in path.split('.'):
            current = current[int(part)] if isinstance(current, list) else current[part]
        return current

    def rich(text):
        def token(match):
            key = match[1]
            label = html.escape(locales['ja']['tokens'][key])
            if key == 'author':
                return f'<a href="https://xuhan.jp/" target="_blank" rel="noopener noreferrer">{label}</a>'
            return f'<bdi class="ui-label" translate="no">{label}</bdi>'
        return re.sub(r'\{([a-zA-Z]+)\}', token, html.escape(text))

    def t(path, tag='p', attrs=''):
        return f'<{tag} data-guide-key="{path}"{(" " + attrs) if attrs else ""}>{rich(value(path))}</{tag}>'

    def paragraphs(path, attrs=''):
        return '\n'.join(t(f'{path}.{i}', attrs=attrs) for i in range(len(value(path))))

    def ordered(path):
        return '<ol>' + ''.join(t(f'{path}.{i}', 'li') for i in range(len(value(path)))) + '</ol>'

    def step(number, body):
        return f'<section class="step" id="step{number}" aria-labelledby="title{number}"><div class="number" aria-hidden="true">{number:02}</div><div>' + t(f'stepTitles.{number-1}', 'h2', f'id="title{number}"') + body + '</div></section>'

    def ref(url, key):
        return '<p class="small">' + t(key, 'a', f'href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer"') + '</p>'

    source = (ROOT / 'canva-reading-panel.user.js').read_text()
    version = re.search(r'^// @version\s+(\S+)', source, re.M)[1]
    assert version == '2.8.0', 'Update guide version strings when the userscript changes'
    options = ''.join(f'<option value="{key}" lang="{"zh-Hans" if key == "zh" else key}">{name}</option>' for key, name in LANGUAGES.items())
    language_bar = '<div id="guide-language-bar" class="language-bar no-print" hidden>' + t('languageLabel', 'label', 'for="guide-language"') + f'<select id="guide-language" translate="no" dir="ltr">{options}</select></div>'
    guide_hint = t('guideHint', attrs='class="small language-hint no-print"')
    tags = '<div class="tags">' + ''.join(t(f'tags.{i}', 'span', 'class="tag"') for i in range(3)) + '</div>'
    navigation = '<nav aria-label="' + html.escape(value('navLabel'), quote=True) + '">' + ''.join(t(f'nav.{i}', 'a', f'href="#{anchor}"') for i, anchor in enumerate(('step1', 'step4', 'usage', 'help'))) + '</nav>'
    header = '<header class="hero"><div class="wrap">' + language_bar + guide_hint + t('title', 'h1') + t('course', attrs='class="course-context"') + t('intro', attrs='class="intro"') + tags + navigation + '</div></header>'
    notice = '<div class="notice">' + t('update') + t('nav.1', 'a', 'href="#step4"') + '</div>'
    chrome_url = 'https://developer.chrome.com/docs/ai/translator-api'
    install_url = 'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo'
    steps = step(1, paragraphs('step1') + ref(chrome_url, 'chromeReference'))
    steps += step(2, t('step2') + '<div class="actions">' + t('install', 'a', f'class="button" href="{install_url}" target="_blank" rel="noopener noreferrer"') + '</div>')
    steps += step(3, '<p><code translate="no" dir="ltr">chrome://extensions</code></p>' + ordered('step3') + ref('https://www.tampermonkey.net/faq.php?q=Q209', 'tampermonkeyReference'))
    actions = '<div class="actions">' + t('copy', 'button', 'class="button" type="button" id="copy-code"') + t('download', 'button', 'class="button secondary" type="button" id="download-code"') + '</div>'
    status = '<p class="status" id="copy-status" role="status">' + html.escape(value('messages.ready')) + '</p>'
    code = '<details class="source-code" id="source-details">' + t('showCode', 'summary') + t('manualCopy', attrs='class="small"') + '<textarea id="source-code" class="notranslate" translate="no" dir="ltr" readonly spellcheck="false" wrap="off" aria-label="' + html.escape(value('codeLabel'), quote=True) + '">' + html.escape(source) + '</textarea></details>'
    steps += step(4, t('step4Intro', attrs='class="small"') + ordered('step4') + actions + status + code + '<noscript><p>JavaScriptが無効です。コード欄を開き、手動でコピーしてください。 / JavaScript is disabled. Expand the code and copy it manually.</p></noscript>' + t('enabled', attrs='class="small after-code"') + '<p><code translate="no">Canva 閲覧用テキストパネル（試用版）</code></p>')
    steps += step(5, paragraphs('step5'))
    steps += step(6, ordered('step6') + t('downloadNote', attrs='class="small"') + t('restartNote', attrs='class="small"'))
    table = '<div class="table-wrap"><table><thead><tr>' + ''.join(t(f'headers.{i}', 'th', 'scope="col"') for i in range(2)) + '</tr></thead><tbody>'
    for i in range(len(value('rows'))):
        table += '<tr>' + ''.join(t(f'rows.{i}.{j}', 'td') for j in range(2)) + '</tr>'
    table += '</tbody></table></div>'
    usage = '<section class="panel" id="usage" aria-labelledby="usage-title">' + t('usageTitle', 'h2', 'id="usage-title"') + t('usageIntro', attrs='class="small"') + table + '<div class="usage-notes">' + paragraphs('usageNotes', attrs='class="small"') + '</div></section>'
    help_section = '<section class="panel" id="help" aria-labelledby="help-title">' + t('helpTitle', 'h2', 'id="help-title"') + '<dl class="trouble">'
    for i in range(7):
        help_section += t(f'help.{i}.0', 'dt') + t(f'help.{i}.1', 'dd')
    help_section += '</dl></section>'
    footer = '<footer><div class="wrap">' + t('footer') + '</div></footer>'
    data = json.dumps(locales, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    css = (ROOT / 'canva-guide.css').read_text()
    runtime = (ROOT / 'canva-guide.js').read_text()
    description = value('course').replace('{author}', value('author'))
    result = '<!doctype html>\n<html lang="ja" dir="ltr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="' + html.escape(description, quote=True) + '">\n<title>' + html.escape(value('title')) + '</title>\n<style>\n' + css + '</style>\n</head>\n<body>\n' + header + '\n<main class="wrap">' + notice + steps + usage + help_section + '</main>\n' + footer + '\n<script id="guide-translations" type="application/json">' + data + '</script>\n<script>\n' + runtime + '</script>\n</body>\n</html>\n'
    for name in ('canva-translation-guide.html', 'canva-translation-guide-google-sites.txt'):
        (ROOT / name).write_text(result)
    print(f'Built self-contained guide: {len(locales)} languages, userscript v{version}, {len(result.encode()):,} bytes')


if __name__ == '__main__':
    build()
