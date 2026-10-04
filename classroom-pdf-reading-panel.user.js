// ==UserScript==
// @name         Classroom PDF 翻訳パネル（試用版）
// @namespace    local.classroom-pdf-translation
// @version      0.4.2
// @description  Classroom・Google Driveで開いたPDFを、保存せず横のパネルで翻訳します。
// @match        https://classroom.google.com/*
// @match        https://drive.google.com/viewer/main*
// @match        https://drive.google.com/file/d/*/view*
// @match        https://drive.google.com/file/d/*/preview*
// @match        https://drive.google.com/file/u/*/d/*/view*
// @match        https://drive.google.com/file/u/*/d/*/preview*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

/*
MIT License

Copyright (c) 2026 韓 (xhan21)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// PDF版の更新はコード全体を置き換えて保存してください。初回のみCanva版とは別に登録します。
// PC版ChromeのTranslator APIを使います。外部の翻訳APIは使いません。
// 翻訳元と翻訳先を選び「翻訳開始」を押してください。同じ言語なら原文を表示します。初回は言語データを取得します。
(() => {
  'use strict';

  // BEGIN_UI_MESSAGES
  const UI_MESSAGES = {
  "en": {
    "title": "PDF translator",
    "start": "Start translation",
    "retry": "Translate again",
    "collapse": "Minimize",
    "expand": "Expand",
    "language": "Translate to",
    "move": "Drag the header or use arrow keys to move",
    "resize": "Drag the corner or use arrow keys to resize",
    "ready": "Select a language and click “{start}”.",
    "preparing": "Preparing translation… Language data may need to download.",
    "downloading": "Downloading language data… {percent}%",
    "empty": "No readable text on this page. Wait for loading; image-only PDFs are not supported.",
    "translating": "Translating…",
    "active": "Automatic translation is on. The translation updates when you change slides.",
    "unavailable": "Built-in translation is unavailable. Use desktop Chrome 138 or later. Browser settings may restrict access.",
    "blocked": "Built-in translation is not permitted by this page or your browser settings.",
    "unsupported": "Translation between the selected languages is unavailable in this environment.",
    "failed": "Translation failed. Use the translation button to try again.",
    "pageOrder": "Reading order (this page)",
    "orderRows": "Row order",
    "orderColumns": "Column order (left → right)",
    "orderHint": "Saved for this slide in this browser.",
    "orderMemoryOnly": "Saved only until this page is reloaded.",
    "translateUi": "Translate buttons and messages",
    "uiHint": "Saved across slides in this browser. Slide text still uses the selected language.",
    "uiMemoryOnly": "Kept until this page is reloaded. Slide text still uses the selected language.",
    "textSize": "Text size",
    "textSmaller": "Smaller text",
    "textLarger": "Larger text",
    "sourceLanguage": "Translate from",
    "originalStart": "Show original",
    "originalRetry": "Refresh display",
    "originalReady": "Click “{start}” to display the original text.",
    "originalPreparing": "Preparing original text…",
    "originalTranslating": "Displaying original text…",
    "originalActive": "Original text is displayed. It updates when you change pages."
  },
  "ja": {
    "title": "PDF翻訳",
    "start": "翻訳開始",
    "retry": "翻訳し直す",
    "collapse": "折りたたむ",
    "expand": "展開する",
    "language": "翻訳先",
    "move": "見出しをドラッグ、または矢印キーで移動",
    "resize": "角をドラッグ、または矢印キーでサイズ変更",
    "ready": "言語を選び「{start}」を押してください。",
    "preparing": "翻訳を準備しています。言語データを取得する場合があります。",
    "downloading": "言語データを取得しています… {percent}%",
    "empty": "このページの文字を読み取れません。読み込みを待ってください。画像だけのPDFには対応していません。",
    "translating": "翻訳しています…",
    "active": "自動翻訳が有効です。スライドを切り替えると訳文が更新されます。",
    "unavailable": "内蔵翻訳を利用できません。パソコン版Chrome 138以降をご利用ください。ブラウザーの設定で制限されている場合もあります。",
    "blocked": "このページ、またはブラウザーの設定で内蔵翻訳が許可されていません。",
    "unsupported": "この環境では、選択した翻訳元と翻訳先の組み合わせを利用できません。",
    "failed": "翻訳できませんでした。翻訳ボタンを押して再試行してください。",
    "pageOrder": "このページの読み順",
    "orderRows": "行順",
    "orderColumns": "列順（左 → 右）",
    "orderHint": "このページの設定を、このブラウザーに保存します。",
    "orderMemoryOnly": "設定はページを再読み込みするまで保持されます。",
    "translateUi": "ボタン・案内文を選択言語にする",
    "uiHint": "このブラウザーの全スライドに適用します。本文は選択した言語で表示します。",
    "uiMemoryOnly": "設定は再読み込みまで保持されます。本文は選択した言語で表示します。",
    "textSize": "文字サイズ",
    "textSmaller": "文字を小さく",
    "textLarger": "文字を大きく",
    "sourceLanguage": "翻訳元",
    "originalStart": "原文を表示",
    "originalRetry": "表示を更新",
    "originalReady": "「{start}」を押すと原文を表示します。",
    "originalPreparing": "原文を準備しています…",
    "originalTranslating": "原文を表示しています…",
    "originalActive": "原文を表示しています。ページを切り替えると表示が更新されます。"
  },
  "zh": {
    "title": "PDF 翻译",
    "start": "开始翻译",
    "retry": "重新翻译",
    "collapse": "收起",
    "expand": "展开",
    "language": "目标语言",
    "move": "拖动顶部或使用方向键移动",
    "resize": "拖动角落或使用方向键调整大小",
    "ready": "选择语言，然后点击“{start}”。",
    "preparing": "正在准备翻译…可能需要下载语言数据。",
    "downloading": "正在下载语言数据…{percent}%",
    "empty": "本页没有可读取的文字。请等待加载；不支持纯图片 PDF。",
    "translating": "正在翻译…",
    "active": "自动翻译已开启，切换幻灯片时会更新译文。",
    "unavailable": "无法使用内置翻译。请使用电脑版 Chrome 138 或更高版本。浏览器设置可能会限制使用。",
    "blocked": "此页面或浏览器设置不允许使用内置翻译。",
    "unsupported": "当前环境不支持翻译为所选语言。",
    "failed": "翻译失败，请点击翻译按钮重试。",
    "pageOrder": "本页阅读顺序",
    "orderRows": "按行阅读",
    "orderColumns": "按列阅读（从左到右）",
    "orderHint": "在此浏览器中记住本页设置。",
    "orderMemoryOnly": "设置仅保留到刷新页面前。",
    "translateUi": "翻译按钮和提示",
    "uiHint": "设置适用于此浏览器中的所有幻灯片。正文仍使用所选语言。",
    "uiMemoryOnly": "设置仅保留到刷新页面前。正文仍使用所选语言。",
    "textSize": "字号",
    "textSmaller": "缩小文字",
    "textLarger": "放大文字",
    "sourceLanguage": "原文语言",
    "originalStart": "显示原文",
    "originalRetry": "刷新显示",
    "originalReady": "点击“{start}”显示原文。",
    "originalPreparing": "正在准备原文…",
    "originalTranslating": "正在显示原文…",
    "originalActive": "正在显示原文。切换页面时会自动更新。"
  },
  "zh-Hant": {
    "title": "PDF 翻譯",
    "start": "開始翻譯",
    "retry": "重新翻譯",
    "collapse": "收合",
    "expand": "展開",
    "language": "目標語言",
    "move": "拖曳頂部或使用方向鍵移動",
    "resize": "拖曳角落或使用方向鍵調整大小",
    "ready": "選擇語言，然後點選「{start}」。",
    "preparing": "正在準備翻譯…可能需要下載語言資料。",
    "downloading": "正在下載語言資料…{percent}%",
    "empty": "本頁沒有可讀取的文字。請等待載入；不支援純圖片 PDF。",
    "translating": "正在翻譯…",
    "active": "已開啟自動翻譯，切換投影片時會更新譯文。",
    "unavailable": "無法使用內建翻譯。請使用電腦版 Chrome 138 或更新版本。瀏覽器設定可能會限制使用。",
    "blocked": "此頁面或瀏覽器設定不允許使用內建翻譯。",
    "unsupported": "目前環境不支援翻譯為所選語言。",
    "failed": "翻譯失敗，請點選翻譯按鈕重試。",
    "pageOrder": "本頁閱讀順序",
    "orderRows": "逐行閱讀",
    "orderColumns": "逐欄閱讀（由左至右）",
    "orderHint": "在此瀏覽器中記住本頁設定。",
    "orderMemoryOnly": "設定僅保留至重新整理頁面前。",
    "translateUi": "翻譯按鈕與提示",
    "uiHint": "設定適用於此瀏覽器中的所有投影片。內文仍使用所選語言。",
    "uiMemoryOnly": "設定僅保留至重新整理頁面前。內文仍使用所選語言。",
    "textSize": "字級",
    "textSmaller": "縮小文字",
    "textLarger": "放大文字",
    "sourceLanguage": "原文語言",
    "originalStart": "顯示原文",
    "originalRetry": "重新整理顯示",
    "originalReady": "點選「{start}」顯示原文。",
    "originalPreparing": "正在準備原文…",
    "originalTranslating": "正在顯示原文…",
    "originalActive": "正在顯示原文。切換頁面時會自動更新。"
  },
  "ko": {
    "title": "PDF 번역",
    "start": "번역 시작",
    "retry": "다시 번역",
    "collapse": "접기",
    "expand": "펼치기",
    "language": "번역 언어",
    "move": "상단을 드래그하거나 방향키로 이동",
    "resize": "모서리를 드래그하거나 방향키로 크기 조절",
    "ready": "언어를 선택하고 ‘{start}’을 누르세요.",
    "preparing": "번역 준비 중… 언어 데이터를 다운로드해야 할 수 있습니다.",
    "downloading": "언어 데이터 다운로드 중… {percent}%",
    "empty": "읽을 수 있는 글자가 없습니다. 로딩을 기다려 주세요. 이미지로만 된 PDF는 지원하지 않습니다.",
    "translating": "번역 중…",
    "active": "자동 번역이 켜져 있습니다. 슬라이드를 바꾸면 번역도 갱신됩니다.",
    "unavailable": "내장 번역을 사용할 수 없습니다. PC용 Chrome 138 이상을 사용하세요. 브라우저 설정으로 사용이 제한될 수 있습니다.",
    "blocked": "이 페이지 또는 브라우저 설정에서 내장 번역을 허용하지 않습니다.",
    "unsupported": "현재 환경에서는 선택한 언어로 번역할 수 없습니다.",
    "failed": "번역하지 못했습니다. 번역 버튼을 눌러 다시 시도하세요.",
    "pageOrder": "이 페이지의 읽기 순서",
    "orderRows": "행 순서",
    "orderColumns": "열 순서 (왼쪽 → 오른쪽)",
    "orderHint": "이 브라우저에 이 슬라이드의 설정을 저장합니다.",
    "orderMemoryOnly": "페이지를 새로고침하기 전까지만 저장됩니다.",
    "translateUi": "버튼과 안내 문구 번역",
    "uiHint": "이 브라우저의 모든 슬라이드에 적용됩니다. 본문은 선택한 언어를 사용합니다.",
    "uiMemoryOnly": "페이지를 새로고침하기 전까지만 유지됩니다. 본문은 선택한 언어를 사용합니다.",
    "textSize": "글자 크기",
    "textSmaller": "글자 작게",
    "textLarger": "글자 크게",
    "sourceLanguage": "원문 언어",
    "originalStart": "원문 표시",
    "originalRetry": "표시 새로고침",
    "originalReady": "“{start}”를 눌러 원문을 표시하세요.",
    "originalPreparing": "원문 준비 중…",
    "originalTranslating": "원문 표시 중…",
    "originalActive": "원문을 표시합니다. 페이지를 바꾸면 자동으로 갱신됩니다."
  },
  "vi": {
    "title": "Dịch PDF",
    "start": "Bắt đầu dịch",
    "retry": "Dịch lại",
    "collapse": "Thu gọn",
    "expand": "Mở rộng",
    "language": "Ngôn ngữ đích",
    "move": "Kéo phần đầu hoặc dùng phím mũi tên để di chuyển",
    "resize": "Kéo góc hoặc dùng phím mũi tên để đổi kích thước",
    "ready": "Chọn ngôn ngữ rồi nhấn “{start}”.",
    "preparing": "Đang chuẩn bị dịch… Có thể cần tải dữ liệu ngôn ngữ.",
    "downloading": "Đang tải dữ liệu ngôn ngữ… {percent}%",
    "empty": "Không có chữ đọc được. Hãy chờ tải trang; không hỗ trợ PDF chỉ có ảnh.",
    "translating": "Đang dịch…",
    "active": "Đã bật dịch tự động. Bản dịch sẽ cập nhật khi bạn chuyển trang chiếu.",
    "unavailable": "Không thể dùng tính năng dịch tích hợp. Hãy dùng Chrome 138 trở lên trên máy tính. Cài đặt trình duyệt có thể hạn chế quyền truy cập.",
    "blocked": "Trang này hoặc cài đặt trình duyệt không cho phép dùng tính năng dịch tích hợp.",
    "unsupported": "Môi trường hiện tại không hỗ trợ dịch sang ngôn ngữ này.",
    "failed": "Dịch không thành công. Nhấn nút dịch để thử lại.",
    "pageOrder": "Thứ tự đọc trang này",
    "orderRows": "Theo hàng",
    "orderColumns": "Theo cột (trái → phải)",
    "orderHint": "Lưu thiết lập cho trang chiếu này trong trình duyệt này.",
    "orderMemoryOnly": "Chỉ lưu đến khi tải lại trang.",
    "translateUi": "Dịch nút và thông báo",
    "uiHint": "Áp dụng cho mọi trang chiếu trong trình duyệt này. Nội dung vẫn dùng ngôn ngữ đã chọn.",
    "uiMemoryOnly": "Chỉ giữ đến khi tải lại trang. Nội dung vẫn dùng ngôn ngữ đã chọn.",
    "textSize": "Cỡ chữ",
    "textSmaller": "Giảm cỡ chữ",
    "textLarger": "Tăng cỡ chữ",
    "sourceLanguage": "Ngôn ngữ gốc",
    "originalStart": "Hiện bản gốc",
    "originalRetry": "Làm mới hiển thị",
    "originalReady": "Nhấn “{start}” để hiển thị văn bản gốc.",
    "originalPreparing": "Đang chuẩn bị bản gốc…",
    "originalTranslating": "Đang hiển thị bản gốc…",
    "originalActive": "Đang hiển thị bản gốc. Nội dung cập nhật khi chuyển trang."
  },
  "th": {
    "title": "แปล PDF",
    "start": "เริ่มแปล",
    "retry": "แปลอีกครั้ง",
    "collapse": "ย่อ",
    "expand": "ขยาย",
    "language": "ภาษาที่แปล",
    "move": "ลากส่วนหัวหรือใช้ปุ่มลูกศรเพื่อย้าย",
    "resize": "ลากมุมหรือใช้ปุ่มลูกศรเพื่อปรับขนาด",
    "ready": "เลือกภาษาแล้วกด “{start}”",
    "preparing": "กำลังเตรียมการแปล… อาจต้องดาวน์โหลดข้อมูลภาษา",
    "downloading": "กำลังดาวน์โหลดข้อมูลภาษา… {percent}%",
    "empty": "ไม่พบข้อความที่อ่านได้ โปรดรอโหลด ไม่รองรับ PDF ที่เป็นภาพล้วน",
    "translating": "กำลังแปล…",
    "active": "เปิดการแปลอัตโนมัติแล้ว คำแปลจะอัปเดตเมื่อเปลี่ยนสไลด์",
    "unavailable": "ไม่สามารถใช้การแปลในตัวได้ โปรดใช้ Chrome เวอร์ชัน 138 ขึ้นไปบนคอมพิวเตอร์ การตั้งค่าเบราว์เซอร์อาจจำกัดการใช้งาน",
    "blocked": "หน้านี้หรือการตั้งค่าเบราว์เซอร์ไม่อนุญาตให้ใช้การแปลในตัว",
    "unsupported": "ไม่สามารถแปลเป็นภาษานี้ได้ในสภาพแวดล้อมปัจจุบัน",
    "failed": "แปลไม่สำเร็จ กดปุ่มแปลเพื่อลองอีกครั้ง",
    "pageOrder": "ลำดับการอ่านหน้านี้",
    "orderRows": "ตามแถว",
    "orderColumns": "ตามคอลัมน์ (ซ้าย → ขวา)",
    "orderHint": "บันทึกการตั้งค่าสไลด์นี้ในเบราว์เซอร์นี้",
    "orderMemoryOnly": "บันทึกไว้จนกว่าจะโหลดหน้าใหม่เท่านั้น",
    "translateUi": "แปลปุ่มและข้อความแนะนำ",
    "uiHint": "บันทึกไว้สำหรับทุกสไลด์ในเบราว์เซอร์นี้ เนื้อหายังคงใช้ภาษาที่เลือก",
    "uiMemoryOnly": "บันทึกไว้จนกว่าจะโหลดหน้าใหม่ เนื้อหายังคงใช้ภาษาที่เลือก",
    "textSize": "ขนาดตัวอักษร",
    "textSmaller": "ลดขนาดตัวอักษร",
    "textLarger": "เพิ่มขนาดตัวอักษร",
    "sourceLanguage": "ภาษาต้นฉบับ",
    "originalStart": "แสดงต้นฉบับ",
    "originalRetry": "รีเฟรชการแสดงผล",
    "originalReady": "กด “{start}” เพื่อแสดงข้อความต้นฉบับ",
    "originalPreparing": "กำลังเตรียมต้นฉบับ…",
    "originalTranslating": "กำลังแสดงต้นฉบับ…",
    "originalActive": "กำลังแสดงข้อความต้นฉบับ เนื้อหาจะอัปเดตเมื่อเปลี่ยนหน้า"
  },
  "id": {
    "title": "Penerjemah PDF",
    "start": "Mulai terjemahkan",
    "retry": "Terjemahkan ulang",
    "collapse": "Ciutkan",
    "expand": "Perluas",
    "language": "Bahasa tujuan",
    "move": "Seret bagian atas atau gunakan tombol panah untuk memindahkan",
    "resize": "Seret sudut atau gunakan tombol panah untuk mengubah ukuran",
    "ready": "Pilih bahasa lalu klik “{start}”.",
    "preparing": "Menyiapkan terjemahan… Data bahasa mungkin perlu diunduh.",
    "downloading": "Mengunduh data bahasa… {percent}%",
    "empty": "Tidak ada teks yang terbaca. Tunggu pemuatan; PDF yang hanya berisi gambar tidak didukung.",
    "translating": "Menerjemahkan…",
    "active": "Terjemahan otomatis aktif. Terjemahan diperbarui saat Anda mengganti slide.",
    "unavailable": "Terjemahan bawaan tidak tersedia. Gunakan Chrome 138 atau yang lebih baru di komputer. Pengaturan browser dapat membatasi akses.",
    "blocked": "Halaman ini atau pengaturan browser tidak mengizinkan terjemahan bawaan.",
    "unsupported": "Terjemahan ke bahasa ini tidak tersedia di lingkungan saat ini.",
    "failed": "Terjemahan gagal. Klik tombol terjemahan untuk mencoba lagi.",
    "pageOrder": "Urutan baca halaman ini",
    "orderRows": "Per baris",
    "orderColumns": "Per kolom (kiri → kanan)",
    "orderHint": "Pengaturan slide ini disimpan di browser ini.",
    "orderMemoryOnly": "Hanya disimpan sampai halaman dimuat ulang.",
    "translateUi": "Terjemahkan tombol dan pesan",
    "uiHint": "Berlaku untuk semua slide di browser ini. Teks slide tetap memakai bahasa pilihan.",
    "uiMemoryOnly": "Disimpan sampai halaman dimuat ulang. Teks slide tetap memakai bahasa pilihan.",
    "textSize": "Ukuran teks",
    "textSmaller": "Perkecil teks",
    "textLarger": "Perbesar teks",
    "sourceLanguage": "Bahasa sumber",
    "originalStart": "Tampilkan teks asli",
    "originalRetry": "Perbarui tampilan",
    "originalReady": "Klik “{start}” untuk menampilkan teks asli.",
    "originalPreparing": "Menyiapkan teks asli…",
    "originalTranslating": "Menampilkan teks asli…",
    "originalActive": "Teks asli ditampilkan. Tampilan diperbarui saat berganti halaman."
  },
  "es": {
    "title": "Traductor de PDF",
    "start": "Iniciar traducción",
    "retry": "Volver a traducir",
    "collapse": "Minimizar",
    "expand": "Expandir",
    "language": "Idioma de destino",
    "move": "Arrastra la cabecera o usa las flechas para mover el panel",
    "resize": "Arrastra la esquina o usa las flechas para cambiar el tamaño",
    "ready": "Selecciona un idioma y pulsa «{start}».",
    "preparing": "Preparando la traducción… Puede ser necesario descargar datos de idioma.",
    "downloading": "Descargando datos de idioma… {percent}%",
    "empty": "No hay texto legible. Espera a que cargue; los PDF de solo imágenes no son compatibles.",
    "translating": "Traduciendo…",
    "active": "La traducción automática está activada. Se actualizará al cambiar de diapositiva.",
    "unavailable": "La traducción integrada no está disponible. Usa Chrome 138 o posterior en un ordenador. La configuración del navegador puede restringir el acceso.",
    "blocked": "Esta página o la configuración del navegador no permite la traducción integrada.",
    "unsupported": "La traducción a este idioma no está disponible en este entorno.",
    "failed": "La traducción falló. Pulsa el botón de traducción para volver a intentarlo.",
    "pageOrder": "Orden de lectura de esta página",
    "orderRows": "Por filas",
    "orderColumns": "Por columnas (izquierda → derecha)",
    "orderHint": "Se guarda para esta diapositiva en este navegador.",
    "orderMemoryOnly": "Solo se guarda hasta que se recargue la página.",
    "translateUi": "Traducir botones y mensajes",
    "uiHint": "Se aplica a todas las diapositivas en este navegador. El texto mantiene el idioma seleccionado.",
    "uiMemoryOnly": "Se conserva hasta recargar la página. El texto mantiene el idioma seleccionado.",
    "textSize": "Tamaño del texto",
    "textSmaller": "Reducir texto",
    "textLarger": "Ampliar texto",
    "sourceLanguage": "Idioma de origen",
    "originalStart": "Mostrar original",
    "originalRetry": "Actualizar vista",
    "originalReady": "Pulsa “{start}” para mostrar el texto original.",
    "originalPreparing": "Preparando el texto original…",
    "originalTranslating": "Mostrando el texto original…",
    "originalActive": "Se muestra el texto original. Se actualiza al cambiar de página."
  },
  "fr": {
    "title": "Traducteur PDF",
    "start": "Traduire",
    "retry": "Traduire à nouveau",
    "collapse": "Réduire",
    "expand": "Développer",
    "language": "Langue cible",
    "move": "Faites glisser l’en-tête ou utilisez les flèches pour déplacer le panneau",
    "resize": "Faites glisser le coin ou utilisez les flèches pour redimensionner",
    "ready": "Choisissez une langue, puis cliquez sur « {start} ».",
    "preparing": "Préparation de la traduction… Des données linguistiques peuvent devoir être téléchargées.",
    "downloading": "Téléchargement des données linguistiques… {percent} %",
    "empty": "Aucun texte lisible. Attendez le chargement ; les PDF uniquement en images ne sont pas pris en charge.",
    "translating": "Traduction en cours…",
    "active": "La traduction automatique est activée. Elle se met à jour lorsque vous changez de diapositive.",
    "unavailable": "La traduction intégrée n’est pas disponible. Utilisez Chrome 138 ou une version ultérieure sur ordinateur. Les paramètres du navigateur peuvent en limiter l’accès.",
    "blocked": "Cette page ou les paramètres du navigateur n’autorisent pas la traduction intégrée.",
    "unsupported": "La traduction vers cette langue n’est pas disponible dans cet environnement.",
    "failed": "La traduction a échoué. Cliquez sur le bouton de traduction pour réessayer.",
    "pageOrder": "Ordre de lecture de cette page",
    "orderRows": "Par lignes",
    "orderColumns": "Par colonnes (gauche → droite)",
    "orderHint": "Enregistré pour cette diapositive dans ce navigateur.",
    "orderMemoryOnly": "Conservé uniquement jusqu’au rechargement de la page.",
    "translateUi": "Traduire les boutons et les messages",
    "uiHint": "S’applique à toutes les diapositives dans ce navigateur. Le texte reste dans la langue choisie.",
    "uiMemoryOnly": "Conservé jusqu’au rechargement de la page. Le texte reste dans la langue choisie.",
    "textSize": "Taille du texte",
    "textSmaller": "Réduire le texte",
    "textLarger": "Agrandir le texte",
    "sourceLanguage": "Langue source",
    "originalStart": "Afficher l’original",
    "originalRetry": "Actualiser l’affichage",
    "originalReady": "Cliquez sur « {start} » pour afficher le texte original.",
    "originalPreparing": "Préparation du texte original…",
    "originalTranslating": "Affichage du texte original…",
    "originalActive": "Le texte original est affiché. Il est actualisé lorsque vous changez de page."
  },
  "de": {
    "title": "PDF-Übersetzer",
    "start": "Übersetzung starten",
    "retry": "Erneut übersetzen",
    "collapse": "Einklappen",
    "expand": "Ausklappen",
    "language": "Zielsprache",
    "move": "Kopfzeile ziehen oder Pfeiltasten zum Verschieben verwenden",
    "resize": "Ecke ziehen oder Pfeiltasten zum Ändern der Größe verwenden",
    "ready": "Sprache wählen und auf „{start}“ klicken.",
    "preparing": "Übersetzung wird vorbereitet… Sprachdaten müssen möglicherweise heruntergeladen werden.",
    "downloading": "Sprachdaten werden heruntergeladen… {percent} %",
    "empty": "Kein lesbarer Text. Bitte auf das Laden warten; reine Bild-PDFs werden nicht unterstützt.",
    "translating": "Wird übersetzt…",
    "active": "Automatische Übersetzung ist aktiv. Sie wird beim Folienwechsel aktualisiert.",
    "unavailable": "Die integrierte Übersetzung ist nicht verfügbar. Verwenden Sie Chrome 138 oder neuer auf einem Computer. Browsereinstellungen können den Zugriff einschränken.",
    "blocked": "Diese Seite oder die Browsereinstellungen erlauben keine integrierte Übersetzung.",
    "unsupported": "Die Übersetzung in diese Sprache ist in dieser Umgebung nicht verfügbar.",
    "failed": "Übersetzung fehlgeschlagen. Klicken Sie zum Wiederholen auf die Übersetzungsschaltfläche.",
    "pageOrder": "Lesereihenfolge dieser Seite",
    "orderRows": "Zeilenweise",
    "orderColumns": "Spaltenweise (links → rechts)",
    "orderHint": "Wird für diese Folie in diesem Browser gespeichert.",
    "orderMemoryOnly": "Wird nur bis zum Neuladen der Seite gespeichert.",
    "translateUi": "Schaltflächen und Meldungen übersetzen",
    "uiHint": "Gilt für alle Folien in diesem Browser. Der Folientext bleibt in der gewählten Sprache.",
    "uiMemoryOnly": "Bleibt bis zum Neuladen der Seite erhalten. Der Folientext bleibt in der gewählten Sprache.",
    "textSize": "Textgröße",
    "textSmaller": "Text verkleinern",
    "textLarger": "Text vergrößern",
    "sourceLanguage": "Ausgangssprache",
    "originalStart": "Original anzeigen",
    "originalRetry": "Anzeige aktualisieren",
    "originalReady": "Klicke auf „{start}“, um den Originaltext anzuzeigen.",
    "originalPreparing": "Originaltext wird vorbereitet…",
    "originalTranslating": "Originaltext wird angezeigt…",
    "originalActive": "Der Originaltext wird angezeigt und beim Seitenwechsel aktualisiert."
  },
  "it": {
    "title": "Traduttore PDF",
    "start": "Avvia traduzione",
    "retry": "Traduci di nuovo",
    "collapse": "Riduci",
    "expand": "Espandi",
    "language": "Lingua di destinazione",
    "move": "Trascina l’intestazione o usa i tasti freccia per spostare il pannello",
    "resize": "Trascina l’angolo o usa i tasti freccia per ridimensionare",
    "ready": "Scegli una lingua e premi «{start}».",
    "preparing": "Preparazione della traduzione… Potrebbe essere necessario scaricare i dati della lingua.",
    "downloading": "Download dei dati della lingua… {percent}%",
    "empty": "Nessun testo leggibile. Attendi il caricamento; i PDF di sole immagini non sono supportati.",
    "translating": "Traduzione in corso…",
    "active": "La traduzione automatica è attiva. Si aggiorna quando cambi diapositiva.",
    "unavailable": "La traduzione integrata non è disponibile. Usa Chrome 138 o successivo su un computer. Le impostazioni del browser possono limitarne l’accesso.",
    "blocked": "Questa pagina o le impostazioni del browser non consentono la traduzione integrata.",
    "unsupported": "La traduzione in questa lingua non è disponibile in questo ambiente.",
    "failed": "Traduzione non riuscita. Premi il pulsante di traduzione per riprovare.",
    "pageOrder": "Ordine di lettura di questa pagina",
    "orderRows": "Per righe",
    "orderColumns": "Per colonne (sinistra → destra)",
    "orderHint": "Salvato per questa diapositiva in questo browser.",
    "orderMemoryOnly": "Salvato solo fino al ricaricamento della pagina.",
    "translateUi": "Traduci pulsanti e messaggi",
    "uiHint": "Si applica a tutte le diapositive in questo browser. Il testo mantiene la lingua scelta.",
    "uiMemoryOnly": "Conservato fino al ricaricamento della pagina. Il testo mantiene la lingua scelta.",
    "textSize": "Dimensione testo",
    "textSmaller": "Riduci testo",
    "textLarger": "Ingrandisci testo",
    "sourceLanguage": "Lingua di origine",
    "originalStart": "Mostra originale",
    "originalRetry": "Aggiorna visualizzazione",
    "originalReady": "Premi “{start}” per mostrare il testo originale.",
    "originalPreparing": "Preparazione del testo originale…",
    "originalTranslating": "Visualizzazione del testo originale…",
    "originalActive": "Il testo originale è visualizzato e si aggiorna quando cambi pagina."
  },
  "pt": {
    "title": "Tradutor de PDF",
    "start": "Iniciar tradução",
    "retry": "Traduzir novamente",
    "collapse": "Recolher",
    "expand": "Expandir",
    "language": "Idioma de destino",
    "move": "Arraste o cabeçalho ou use as setas para mover o painel",
    "resize": "Arraste o canto ou use as setas para redimensionar",
    "ready": "Escolha um idioma e clique em “{start}”.",
    "preparing": "Preparando a tradução… Pode ser necessário baixar dados do idioma.",
    "downloading": "Baixando dados do idioma… {percent}%",
    "empty": "Nenhum texto legível. Aguarde o carregamento; PDFs somente de imagens não são suportados.",
    "translating": "Traduzindo…",
    "active": "A tradução automática está ativada. Ela é atualizada quando você muda de slide.",
    "unavailable": "A tradução integrada não está disponível. Use o Chrome 138 ou posterior em um computador. As configurações do navegador podem restringir o acesso.",
    "blocked": "Esta página ou as configurações do navegador não permitem a tradução integrada.",
    "unsupported": "A tradução para este idioma não está disponível neste ambiente.",
    "failed": "A tradução falhou. Clique no botão de tradução para tentar novamente.",
    "pageOrder": "Ordem de leitura desta página",
    "orderRows": "Por linhas",
    "orderColumns": "Por colunas (esquerda → direita)",
    "orderHint": "Salvo para este slide neste navegador.",
    "orderMemoryOnly": "Salvo apenas até recarregar a página.",
    "translateUi": "Traduzir botões e mensagens",
    "uiHint": "Aplica-se a todos os slides neste navegador. O texto mantém o idioma selecionado.",
    "uiMemoryOnly": "Mantido até recarregar a página. O texto mantém o idioma selecionado.",
    "textSize": "Tamanho do texto",
    "textSmaller": "Diminuir texto",
    "textLarger": "Aumentar texto",
    "sourceLanguage": "Idioma de origem",
    "originalStart": "Mostrar original",
    "originalRetry": "Atualizar exibição",
    "originalReady": "Clique em “{start}” para exibir o texto original.",
    "originalPreparing": "Preparando o texto original…",
    "originalTranslating": "Exibindo o texto original…",
    "originalActive": "O texto original é exibido e atualizado ao mudar de página."
  },
  "ru": {
    "title": "Переводчик PDF",
    "start": "Начать перевод",
    "retry": "Перевести заново",
    "collapse": "Свернуть",
    "expand": "Развернуть",
    "language": "Язык перевода",
    "move": "Перетащите заголовок или используйте стрелки для перемещения",
    "resize": "Потяните за угол или используйте стрелки для изменения размера",
    "ready": "Выберите язык и нажмите «{start}».",
    "preparing": "Подготовка перевода… Может потребоваться загрузка языковых данных.",
    "downloading": "Загрузка языковых данных… {percent}%",
    "empty": "Нет доступного текста. Подождите загрузки; PDF только с изображениями не поддерживаются.",
    "translating": "Перевод…",
    "active": "Автоматический перевод включён. При смене слайда перевод обновляется.",
    "unavailable": "Встроенный перевод недоступен. Используйте Chrome 138 или новее на компьютере. Доступ может быть ограничен настройками браузера.",
    "blocked": "Эта страница или настройки браузера не разрешают встроенный перевод.",
    "unsupported": "Перевод на этот язык недоступен в текущей среде.",
    "failed": "Не удалось выполнить перевод. Нажмите кнопку перевода, чтобы повторить попытку.",
    "pageOrder": "Порядок чтения этой страницы",
    "orderRows": "По строкам",
    "orderColumns": "По столбцам (слева → направо)",
    "orderHint": "Сохраняется для этого слайда в этом браузере.",
    "orderMemoryOnly": "Сохраняется только до перезагрузки страницы.",
    "translateUi": "Переводить кнопки и сообщения",
    "uiHint": "Применяется ко всем слайдам в этом браузере. Текст слайдов остаётся на выбранном языке.",
    "uiMemoryOnly": "Сохраняется до перезагрузки страницы. Текст слайдов остаётся на выбранном языке.",
    "textSize": "Размер текста",
    "textSmaller": "Уменьшить текст",
    "textLarger": "Увеличить текст",
    "sourceLanguage": "Исходный язык",
    "originalStart": "Показать оригинал",
    "originalRetry": "Обновить отображение",
    "originalReady": "Нажмите «{start}», чтобы показать исходный текст.",
    "originalPreparing": "Подготовка исходного текста…",
    "originalTranslating": "Отображение исходного текста…",
    "originalActive": "Отображается исходный текст. Он обновляется при смене страницы."
  },
  "uk": {
    "title": "Перекладач PDF",
    "start": "Почати переклад",
    "retry": "Перекласти знову",
    "collapse": "Згорнути",
    "expand": "Розгорнути",
    "language": "Мова перекладу",
    "move": "Перетягніть заголовок або використовуйте стрілки для переміщення",
    "resize": "Потягніть за кут або використовуйте стрілки для зміни розміру",
    "ready": "Виберіть мову й натисніть «{start}».",
    "preparing": "Підготовка перекладу… Може знадобитися завантаження мовних даних.",
    "downloading": "Завантаження мовних даних… {percent}%",
    "empty": "Немає доступного тексту. Зачекайте завантаження; PDF лише із зображеннями не підтримуються.",
    "translating": "Переклад…",
    "active": "Автоматичний переклад увімкнено. Під час зміни слайда переклад оновлюється.",
    "unavailable": "Вбудований переклад недоступний. Використовуйте Chrome 138 або новішу версію на комп’ютері. Налаштування браузера можуть обмежувати доступ.",
    "blocked": "Ця сторінка або налаштування браузера не дозволяють вбудований переклад.",
    "unsupported": "Переклад цією мовою недоступний у поточному середовищі.",
    "failed": "Не вдалося виконати переклад. Натисніть кнопку перекладу, щоб повторити спробу.",
    "pageOrder": "Порядок читання цієї сторінки",
    "orderRows": "За рядками",
    "orderColumns": "За стовпцями (зліва → направо)",
    "orderHint": "Зберігається для цього слайда в цьому браузері.",
    "orderMemoryOnly": "Зберігається лише до перезавантаження сторінки.",
    "translateUi": "Перекладати кнопки та повідомлення",
    "uiHint": "Застосовується до всіх слайдів у цьому браузері. Текст слайдів залишається вибраною мовою.",
    "uiMemoryOnly": "Зберігається до перезавантаження сторінки. Текст слайдів залишається вибраною мовою.",
    "textSize": "Розмір тексту",
    "textSmaller": "Зменшити текст",
    "textLarger": "Збільшити текст",
    "sourceLanguage": "Мова оригіналу",
    "originalStart": "Показати оригінал",
    "originalRetry": "Оновити відображення",
    "originalReady": "Натисніть «{start}», щоб показати оригінальний текст.",
    "originalPreparing": "Підготовка оригінального тексту…",
    "originalTranslating": "Відображення оригінального тексту…",
    "originalActive": "Відображається оригінальний текст. Він оновлюється під час зміни сторінки."
  },
  "ar": {
    "title": "مترجم PDF",
    "start": "بدء الترجمة",
    "retry": "إعادة الترجمة",
    "collapse": "طي",
    "expand": "توسيع",
    "language": "لغة الترجمة",
    "move": "اسحب العنوان أو استخدم مفاتيح الأسهم لتحريك اللوحة",
    "resize": "اسحب الزاوية أو استخدم مفاتيح الأسهم لتغيير الحجم",
    "ready": "اختر لغة ثم اضغط على «{start}».",
    "preparing": "جارٍ تحضير الترجمة… قد يلزم تنزيل بيانات اللغة.",
    "downloading": "جارٍ تنزيل بيانات اللغة… {percent}%",
    "empty": "لا يوجد نص قابل للقراءة. انتظر التحميل؛ ملفات PDF المؤلفة من صور فقط غير مدعومة.",
    "translating": "جارٍ الترجمة…",
    "active": "الترجمة التلقائية مفعّلة. يتم تحديث الترجمة عند تغيير الشريحة.",
    "unavailable": "الترجمة المدمجة غير متاحة. استخدم Chrome 138 أو إصدارًا أحدث على الكمبيوتر. قد تقيّد إعدادات المتصفح الوصول إليها.",
    "blocked": "هذه الصفحة أو إعدادات المتصفح لا تسمح بالترجمة المدمجة.",
    "unsupported": "الترجمة إلى هذه اللغة غير متاحة في هذه البيئة.",
    "failed": "تعذّرت الترجمة. اضغط على زر الترجمة للمحاولة مرة أخرى.",
    "pageOrder": "ترتيب قراءة هذه الصفحة",
    "orderRows": "حسب الصفوف",
    "orderColumns": "حسب الأعمدة (من اليسار إلى اليمين)",
    "orderHint": "يُحفظ الإعداد لهذه الشريحة في هذا المتصفح.",
    "orderMemoryOnly": "يُحفظ فقط حتى إعادة تحميل الصفحة.",
    "translateUi": "ترجمة الأزرار والرسائل",
    "uiHint": "يسري على جميع الشرائح في هذا المتصفح. يظل نص الشريحة باللغة المختارة.",
    "uiMemoryOnly": "يُحفظ حتى إعادة تحميل الصفحة. يظل نص الشريحة باللغة المختارة.",
    "textSize": "حجم النص",
    "textSmaller": "تصغير النص",
    "textLarger": "تكبير النص",
    "sourceLanguage": "اللغة الأصلية",
    "originalStart": "عرض النص الأصلي",
    "originalRetry": "تحديث العرض",
    "originalReady": "اضغط على «{start}» لعرض النص الأصلي.",
    "originalPreparing": "جارٍ تجهيز النص الأصلي…",
    "originalTranslating": "جارٍ عرض النص الأصلي…",
    "originalActive": "يُعرض النص الأصلي ويتحدث عند تغيير الصفحة."
  },
  "hi": {
    "title": "PDF अनुवादक",
    "start": "अनुवाद शुरू करें",
    "retry": "फिर से अनुवाद करें",
    "collapse": "समेटें",
    "expand": "खोलें",
    "language": "अनुवाद की भाषा",
    "move": "पैनल को खिसकाने के लिए शीर्ष भाग खींचें या तीर कुंजियों का उपयोग करें",
    "resize": "आकार बदलने के लिए कोना खींचें या तीर कुंजियों का उपयोग करें",
    "ready": "भाषा चुनें और “{start}” पर क्लिक करें।",
    "preparing": "अनुवाद की तैयारी हो रही है… भाषा डेटा डाउनलोड करना पड़ सकता है।",
    "downloading": "भाषा डेटा डाउनलोड हो रहा है… {percent}%",
    "empty": "पढ़ने योग्य पाठ नहीं है। लोड होने की प्रतीक्षा करें; केवल चित्र वाले PDF समर्थित नहीं हैं।",
    "translating": "अनुवाद हो रहा है…",
    "active": "स्वचालित अनुवाद चालू है। स्लाइड बदलने पर अनुवाद भी अपडेट होगा।",
    "unavailable": "अंतर्निहित अनुवाद उपलब्ध नहीं है। कंप्यूटर पर Chrome 138 या बाद का संस्करण उपयोग करें। ब्राउज़र सेटिंग्स पहुँच सीमित कर सकती हैं।",
    "blocked": "यह पृष्ठ या ब्राउज़र सेटिंग्स अंतर्निहित अनुवाद की अनुमति नहीं देते।",
    "unsupported": "इस परिवेश में इस भाषा में अनुवाद उपलब्ध नहीं है।",
    "failed": "अनुवाद नहीं हो पाया। फिर से प्रयास करने के लिए अनुवाद बटन दबाएँ।",
    "pageOrder": "इस पेज का पढ़ने का क्रम",
    "orderRows": "पंक्तियों के अनुसार",
    "orderColumns": "स्तंभों के अनुसार (बाएँ → दाएँ)",
    "orderHint": "इस स्लाइड की सेटिंग इस ब्राउज़र में सहेजी जाती है।",
    "orderMemoryOnly": "केवल पेज दोबारा लोड होने तक सहेजा जाता है।",
    "translateUi": "बटन और संदेशों का अनुवाद करें",
    "uiHint": "इस ब्राउज़र की सभी स्लाइड पर लागू होता है। स्लाइड का पाठ चुनी हुई भाषा में रहता है।",
    "uiMemoryOnly": "पेज दोबारा लोड होने तक रहता है। स्लाइड का पाठ चुनी हुई भाषा में रहता है।",
    "textSize": "पाठ का आकार",
    "textSmaller": "पाठ छोटा करें",
    "textLarger": "पाठ बड़ा करें",
    "sourceLanguage": "मूल भाषा",
    "originalStart": "मूल पाठ दिखाएँ",
    "originalRetry": "प्रदर्शन अपडेट करें",
    "originalReady": "मूल पाठ दिखाने के लिए “{start}” दबाएँ।",
    "originalPreparing": "मूल पाठ तैयार हो रहा है…",
    "originalTranslating": "मूल पाठ दिखाया जा रहा है…",
    "originalActive": "मूल पाठ दिखाया जा रहा है। पेज बदलने पर यह अपडेट होता है।"
  },
  "bn": {
    "title": "PDF অনুবাদক",
    "start": "অনুবাদ শুরু করুন",
    "retry": "আবার অনুবাদ করুন",
    "collapse": "গুটিয়ে নিন",
    "expand": "খুলুন",
    "language": "অনুবাদের ভাষা",
    "move": "প্যানেল সরাতে উপরের অংশ টানুন বা তীরচিহ্নের কী ব্যবহার করুন",
    "resize": "আকার বদলাতে কোণ টানুন বা তীরচিহ্নের কী ব্যবহার করুন",
    "ready": "ভাষা বেছে নিয়ে “{start}” চাপুন।",
    "preparing": "অনুবাদের প্রস্তুতি চলছে… ভাষার ডেটা ডাউনলোড করতে হতে পারে।",
    "downloading": "ভাষার ডেটা ডাউনলোড হচ্ছে… {percent}%",
    "empty": "পড়ার মতো লেখা নেই। লোড হওয়া পর্যন্ত অপেক্ষা করুন; শুধু ছবির PDF সমর্থিত নয়।",
    "translating": "অনুবাদ হচ্ছে…",
    "active": "স্বয়ংক্রিয় অনুবাদ চালু আছে। স্লাইড বদলালে অনুবাদও আপডেট হবে।",
    "unavailable": "ব্রাউজারের অন্তর্নির্মিত অনুবাদ উপলব্ধ নয়। কম্পিউটারে Chrome 138 বা পরবর্তী সংস্করণ ব্যবহার করুন। ব্রাউজার সেটিংস ব্যবহার সীমিত করতে পারে।",
    "blocked": "এই পৃষ্ঠা বা ব্রাউজার সেটিংস অন্তর্নির্মিত অনুবাদের অনুমতি দেয় না।",
    "unsupported": "বর্তমান পরিবেশে এই ভাষায় অনুবাদ উপলব্ধ নয়।",
    "failed": "অনুবাদ করা যায়নি। আবার চেষ্টা করতে অনুবাদ বোতাম চাপুন।",
    "pageOrder": "এই পৃষ্ঠার পড়ার ক্রম",
    "orderRows": "সারি অনুযায়ী",
    "orderColumns": "কলাম অনুযায়ী (বাম → ডান)",
    "orderHint": "এই স্লাইডের সেটিং এই ব্রাউজারে সংরক্ষিত হয়।",
    "orderMemoryOnly": "শুধু পৃষ্ঠা পুনরায় লোড করা পর্যন্ত সংরক্ষিত থাকে।",
    "translateUi": "বোতাম ও বার্তা অনুবাদ করুন",
    "uiHint": "এই ব্রাউজারের সব স্লাইডে প্রযোজ্য। স্লাইডের লেখা নির্বাচিত ভাষাতেই থাকে।",
    "uiMemoryOnly": "পৃষ্ঠা পুনরায় লোড করা পর্যন্ত থাকে। স্লাইডের লেখা নির্বাচিত ভাষাতেই থাকে।",
    "textSize": "লেখার আকার",
    "textSmaller": "লেখা ছোট করুন",
    "textLarger": "লেখা বড় করুন",
    "sourceLanguage": "মূল ভাষা",
    "originalStart": "মূল লেখা দেখান",
    "originalRetry": "প্রদর্শন হালনাগাদ করুন",
    "originalReady": "মূল লেখা দেখাতে “{start}” চাপুন।",
    "originalPreparing": "মূল লেখা প্রস্তুত হচ্ছে…",
    "originalTranslating": "মূল লেখা দেখানো হচ্ছে…",
    "originalActive": "মূল লেখা দেখানো হচ্ছে। পৃষ্ঠা বদলালে এটি হালনাগাদ হয়।"
  },
  "tr": {
    "title": "PDF çevirmeni",
    "start": "Çeviriyi başlat",
    "retry": "Yeniden çevir",
    "collapse": "Daralt",
    "expand": "Genişlet",
    "language": "Hedef dil",
    "move": "Taşımak için başlığı sürükleyin veya ok tuşlarını kullanın",
    "resize": "Boyutlandırmak için köşeyi sürükleyin veya ok tuşlarını kullanın",
    "ready": "Bir dil seçin ve “{start}” düğmesine basın.",
    "preparing": "Çeviri hazırlanıyor… Dil verilerinin indirilmesi gerekebilir.",
    "downloading": "Dil verileri indiriliyor… %{percent}",
    "empty": "Okunabilir metin yok. Yüklenmesini bekleyin; yalnızca resim içeren PDF dosyaları desteklenmez.",
    "translating": "Çevriliyor…",
    "active": "Otomatik çeviri açık. Slayt değiştiğinde çeviri de güncellenir.",
    "unavailable": "Yerleşik çeviri kullanılamıyor. Bilgisayarda Chrome 138 veya üzerini kullanın. Tarayıcı ayarları erişimi kısıtlayabilir.",
    "blocked": "Bu sayfa veya tarayıcı ayarları yerleşik çeviriye izin vermiyor.",
    "unsupported": "Bu ortamda bu dile çeviri kullanılamıyor.",
    "failed": "Çeviri başarısız oldu. Tekrar denemek için çeviri düğmesine basın.",
    "pageOrder": "Bu sayfanın okuma sırası",
    "orderRows": "Satır sırasıyla",
    "orderColumns": "Sütun sırasıyla (sol → sağ)",
    "orderHint": "Bu slaydın ayarı bu tarayıcıda kaydedilir.",
    "orderMemoryOnly": "Yalnızca sayfa yeniden yüklenene kadar saklanır.",
    "translateUi": "Düğmeleri ve mesajları çevir",
    "uiHint": "Bu tarayıcıdaki tüm slaytlarda geçerlidir. Slayt metni seçilen dilde kalır.",
    "uiMemoryOnly": "Sayfa yeniden yüklenene kadar korunur. Slayt metni seçilen dilde kalır.",
    "textSize": "Metin boyutu",
    "textSmaller": "Metni küçült",
    "textLarger": "Metni büyüt",
    "sourceLanguage": "Kaynak dil",
    "originalStart": "Orijinali göster",
    "originalRetry": "Görünümü yenile",
    "originalReady": "Orijinal metni göstermek için “{start}” düğmesine basın.",
    "originalPreparing": "Orijinal metin hazırlanıyor…",
    "originalTranslating": "Orijinal metin gösteriliyor…",
    "originalActive": "Orijinal metin gösterilir ve sayfa değiştirdiğinizde güncellenir."
  }
};
  // END_UI_MESSAGES

  const ORIGINAL_MESSAGE_KEYS = {
    start: 'originalStart', retry: 'originalRetry', ready: 'originalReady',
    preparing: 'originalPreparing', translating: 'originalTranslating', active: 'originalActive'
  };

  function uiText(language, key, values = {}, original = false) {
    let messages = UI_MESSAGES[language] || UI_MESSAGES.en;
    if (original) messages = { ...messages, ...Object.fromEntries(
      Object.entries(ORIGINAL_MESSAGE_KEYS).map(([key, value]) => [key, messages[value]])
    ) };
    const parameters = { start: messages.start, ...values };
    return (messages[key] || UI_MESSAGES.en[key] || key)
      .replace(/\{(\w+)\}/g, (placeholder, name) =>
        parameters[name] === undefined ? placeholder : String(parameters[name]));
  }

  function uiLanguage(language, translateUi = true) {
    return translateUi ? (Object.hasOwn(UI_MESSAGES, language) ? language : 'en') : 'ja';
  }

  // 本文の翻訳先と操作表示の言語を分ける。オフ時は操作表示だけを日本語にする。
  function localizeControls(elements, { language, sourceLanguage = 'ja', started, collapsed, translateUi = true }) {
    const { host, title, sourceLanguageSelect, sourceLanguageLabel, target, targetLabel, start, toggle, resizeHandle, orderLabel, orderSelect, orderOptions,
      uiToggle, uiToggleText, fontLabel, fontSmaller, fontLarger } = elements;
    const selected = uiLanguage(language, translateUi);
    const text = key => uiText(selected, key, {}, sourceLanguage === language);
    host.lang = selected;
    host.dir = selected === 'ar' ? 'rtl' : 'ltr';
    host.setAttribute('aria-label', text('title'));
    title.textContent = text('title');
    title.title = text('move');
    title.setAttribute('aria-label', text('move'));
    target.setAttribute('aria-label', text('language'));
    if (targetLabel) targetLabel.textContent = text('language');
    if (sourceLanguageSelect) {
      sourceLanguageSelect.setAttribute('aria-label', text('sourceLanguage'));
      sourceLanguageLabel.textContent = text('sourceLanguage');
    }
    start.textContent = text(started ? 'retry' : 'start');
    toggle.textContent = text(collapsed ? 'expand' : 'collapse');
    resizeHandle.title = text('resize');
    resizeHandle.setAttribute('aria-label', text('resize'));
    if (orderSelect) {
      orderLabel.textContent = text('pageOrder');
      orderSelect.setAttribute('aria-label', text('pageOrder'));
      orderOptions.rows.textContent = text('orderRows');
      orderOptions.columns.textContent = text('orderColumns');
    }
    if (uiToggle) {
      uiToggleText.textContent = text('translateUi');
      uiToggle.setAttribute('aria-label', text('translateUi'));
      uiToggle.checked = translateUi;
    }
    if (fontLabel) {
      fontLabel.textContent = text('textSize');
      fontSmaller.title = text('textSmaller');
      fontSmaller.setAttribute('aria-label', text('textSmaller'));
      fontLarger.title = text('textLarger');
      fontLarger.setAttribute('aria-label', text('textLarger'));
    }
  }

  function formatListMarker(value, type) {
    if (type === 'disc') return '•';
    if (type === 'circle') return '◦';
    if (type === 'square') return '▪';
    let label = String(value);
    if (type === 'decimal-leading-zero' && value >= 0 && value < 10) label = `0${value}`;
    if (/^(lower|upper)-(alpha|latin)$/.test(type) && value > 0) {
      label = '';
      for (let n = value; n > 0; n = Math.floor((n - 1) / 26)) {
        label = String.fromCharCode(97 + (n - 1) % 26) + label;
      }
      if (type.startsWith('upper')) label = label.toUpperCase();
    }
    if (/^(lower|upper)-roman$/.test(type) && value > 0 && value < 4000) {
      label = '';
      let n = value;
      for (const [amount, letters] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
        while (n >= amount) { label += letters; n -= amount; }
      }
      if (type.startsWith('lower')) label = label.toLowerCase();
    }
    return `${label}.`;
  }

  function listContext(element, styleOf) {
    const item = element?.closest('li');
    const list = item?.parentElement;
    if (!list || !['OL', 'UL'].includes(list.tagName)) return null;
    const items = [...list.children].filter(child => child.tagName === 'LI');
    const integerAttribute = (node, name) => {
      const raw = node.getAttribute(name)?.trim();
      return raw && /^[+-]?\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
    };
    const reversed = list.tagName === 'OL' && list.hasAttribute('reversed');
    let value = integerAttribute(list, 'start') ?? (reversed ? items.length : 1);
    for (const sibling of items) {
      value = integerAttribute(sibling, 'value') ?? value;
      if (sibling === item) break;
      value += reversed ? -1 : 1;
    }
    const typeAttribute = item.getAttribute('type') || list.getAttribute('type');
    const htmlTypes = { '1': 'decimal', a: 'lower-alpha', A: 'upper-alpha', i: 'lower-roman', I: 'upper-roman' };
    const computedType = styleOf(item).listStyleType || styleOf(list).listStyleType;
    // Canvaの表示設定がnoneでも、OLの番号をパネルでは文字として描く。
    const type = computedType && computedType !== 'none' ? computedType
      : htmlTypes[typeAttribute] || (list.tagName === 'OL' ? 'decimal' : 'disc');
    let depth = 0;
    for (let parent = list.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'OL' || parent.tagName === 'UL') depth++;
    }
    return { item, marker: formatListMarker(value, type), depth };
  }

  // 本文の色とリスト情報を読み取る。番号は翻訳に渡さず、表示時に別の文字として添える。
  function extractStyledBlocks(root, styleOf, measureText = null) {
    const blocks = [];
    const colorOf = element => styleOf(element).color || 'rgb(32, 33, 36)';

    function collect(nodes) {
      let runs = [];
      let textRects = [];
      let context = null;
      function append(text, color) {
        if (!text) return;
        const last = runs.at(-1);
        if (last?.color === color) last.text += text;
        else runs.push({ text, color });
      }
      function flush() {
        const clean = runs.map(run => ({ ...run, text: run.text.trim() }))
          .filter(run => run.text);
        const rects = textRects;
        const list = context;
        runs = [];
        textRects = [];
        context = null;
        if (!clean.length) return;
        if (measureText && !rects.length) return;
        const block = { runs: clean, color: clean[0].color };
        if (list) {
          block.listItem = list.item;
          block.list = { marker: list.marker, depth: list.depth };
        }
        if (rects.length) block.rect = {
          left: Math.min(...rects.map(rect => rect.left)),
          top: Math.min(...rects.map(rect => rect.top)),
          right: Math.max(...rects.map(rect => rect.right)),
          bottom: Math.max(...rects.map(rect => rect.bottom))
        };
        blocks.push(block);
      }
      function visit(node) {
        if (node.nodeType === 3) {
          if (measureText && node.textContent.trim()) {
            const rects = measureText(node);
            if (!rects.length) return;
            textRects.push(...rects);
          }
          if (node.textContent.trim() && !runs.some(run => run.text.trim())) {
            context = listContext(node.parentElement || root, styleOf);
          }
          append(node.textContent, colorOf(node.parentElement || root));
          return;
        }
        if (node.nodeType !== 1 || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return;
        const appearance = styleOf(node);
        if (appearance.display === 'none' || appearance.visibility === 'hidden') return;
        if (node.tagName === 'BR') { append('\n', colorOf(node)); return; }
        const separate = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'OL', 'UL', 'LI'].includes(node.tagName);
        if (separate) flush();
        for (const child of node.childNodes) visit(child);
        if (separate) flush();
      }
      for (const node of nodes) visit(node);
      flush();
    }
    collect(root.childNodes);
    return blocks;
  }

  function intersectRect(rect, clip) {
    return {
      left: Math.max(rect.left, clip.left), top: Math.max(rect.top, clip.top),
      right: Math.min(rect.right, clip.right), bottom: Math.min(rect.bottom, clip.bottom)
    };
  }

  // 文字の実際の矩形を、画面と祖先のクリップ範囲で絞る。
  // aria-hiddenは見た目の非表示を意味しないため、除外条件にはしない。
  function filterRenderedRects(rects, ancestors, viewport) {
    if (ancestors.some(({ style }) => style.display === 'none' ||
        style.contentVisibility === 'hidden' ||
        (style.opacity !== '' && style.opacity != null && Number(style.opacity) <= .01))) return [];
    if (['hidden', 'collapse'].includes(ancestors[0]?.style.visibility)) return [];
    return rects.flatMap(original => {
      if (original.right <= original.left || original.bottom <= original.top) return [];
      let visible = intersectRect(original, viewport);
      for (const { rect, style } of ancestors) {
        const clipsX = /^(hidden|clip|scroll|auto)$/.test(style.overflowX);
        const clipsY = /^(hidden|clip|scroll|auto)$/.test(style.overflowY);
        if (clipsX || clipsY) visible = intersectRect(visible, {
          left: clipsX ? rect.left : -Infinity, right: clipsX ? rect.right : Infinity,
          top: clipsY ? rect.top : -Infinity, bottom: clipsY ? rect.bottom : Infinity
        });
        // 読み上げ用の複製などで使われる従来のclip:rect(...)にも対応。
        const clip = style.clip?.match(/^rect\(([^)]+)\)$/);
        if (clip) {
          const parts = clip[1].split(/[,\s]+/).filter(Boolean);
          if (parts.length === 4 && parts.every(part => part === 'auto' || /^-?[\d.]+px$/.test(part))) {
            const [top, right, bottom, left] = parts.map(part => part === 'auto' ? null : parseFloat(part));
            visible = intersectRect(visible, {
              top: top === null ? -Infinity : rect.top + top,
              right: right === null ? Infinity : rect.left + right,
              bottom: bottom === null ? Infinity : rect.top + bottom,
              left: left === null ? -Infinity : rect.left + left
            });
          }
        }
        const inset = style.clipPath?.match(/^inset\(([^)]+)\)$/);
        if (inset) {
          const parts = inset[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
          if (parts.length >= 1 && parts.length <= 4 && parts.every(part => /^-?[\d.]+(?:px|%)?$/.test(part))) {
            const [a, b = a, c = a, d = b] = parts;
            const pixels = (part, size) => parseFloat(part) * (part.endsWith('%') ? size / 100 : 1);
            visible = intersectRect(visible, {
              top: rect.top + pixels(a, rect.bottom - rect.top),
              right: rect.right - pixels(b, rect.right - rect.left),
              bottom: rect.bottom - pixels(c, rect.bottom - rect.top),
              left: rect.left + pixels(d, rect.right - rect.left)
            });
          }
        }
      }
      const width = visible.right - visible.left;
      const height = visible.bottom - visible.top;
      const fullArea = (original.right - original.left) * (original.bottom - original.top);
      // 1pxだけ残る非表示コピーを拾わない。画面端で一部見えている本文は残す。
      return width >= 2 && height >= 2 && width * height >= fullArea * .03 ? [visible] : [];
    });
  }

  function orderVisibleBlocks(blocks) {
    const sorted = [...blocks].filter(block => block.rect)
      .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    const seen = new Map();
    return sorted.filter(block => {
      const key = block.runs.map(run => run.text).join('').replace(/\s+/g, '');
      const matches = seen.get(key) || [];
      const rect = block.rect;
      const duplicate = matches.find(other =>
        Math.abs(rect.left - other.rect.left) <= 3 && Math.abs(rect.top - other.rect.top) <= 3 &&
        Math.abs(rect.right - other.rect.right) <= 3 && Math.abs(rect.bottom - other.rect.bottom) <= 3);
      if (duplicate) {
        if (!duplicate.list && block.list) {
          duplicate.list = block.list;
          duplicate.listItem = block.listItem;
        }
        return false;
      }
      matches.push(block);
      seen.set(key, matches);
      return true;
    });
  }

  function finalizeListBlocks(blocks) {
    const seen = new Set();
    return blocks.map(({ listItem, rect, ...block }) => {
      if (!block.list) return block;
      const text = block.runs.map(run => run.text).join('').trimStart();
      const marker = block.list.marker;
      const alreadyWritten = text.startsWith(marker) &&
        (text.length === marker.length || /\s/.test(text[marker.length]));
      const continuation = listItem && seen.has(listItem);
      if (listItem) seen.add(listItem);
      return { ...block, list: { ...block.list, marker: continuation || alreadyWritten ? '' : marker } };
    });
  }

  // 列順を選んだページだけで使う。文字の間の余白で列を分け、列内は従来どおり上から読む。
  // 横断する見出し・脚注は列の前後に置く。明確な列の境界がなければ行順を保つ。
  function orderByColumns(blocks, level = 0) {
    const rows = [...blocks].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    if (rows.length < 2 || level > 12) return rows;
    const heights = rows.map(block => block.rect.bottom - block.rect.top).sort((a, b) => a - b);
    const textHeight = heights[Math.floor(heights.length / 2)];
    const edges = [...new Set(rows.flatMap(block => [block.rect.left, block.rect.right]))].sort((a, b) => a - b);
    let best = null;
    for (let i = 1; i < edges.length; i++) {
      const gap = edges[i] - edges[i - 1];
      if (gap < Math.max(4, textHeight * .35)) continue;
      const cut = (edges[i] + edges[i - 1]) / 2;
      const left = rows.filter(block => block.rect.right <= cut);
      const right = rows.filter(block => block.rect.left >= cut);
      if (!left.length || !right.length) continue;
      const top = Math.max(left[0].rect.top, right[0].rect.top);
      const bottom = Math.min(Math.max(...left.map(block => block.rect.bottom)), Math.max(...right.map(block => block.rect.bottom)));
      if (bottom - top < textHeight * .5) continue;
      // 字下げされた続きの行だけを、右側の独立した列と誤認しない。
      const besideEachOther = left.some(a => right.some(b =>
        Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) >=
        Math.min(a.rect.bottom - a.rect.top, b.rect.bottom - b.rect.top) * .3));
      if (!besideEachOther) continue;
      const spanning = rows.filter(block => block.rect.left < cut && block.rect.right > cut);
      const header = spanning.filter(block => block.rect.bottom <= top);
      const footer = spanning.filter(block => block.rect.top >= bottom);
      if (header.length + footer.length !== spanning.length) continue;
      // 見出し・脚注が片方の列の途中に割り込む境界は採用しない。
      if (header.some(block => [...left, ...right].some(item => item.rect.top < block.rect.bottom)) ||
          footer.some(block => [...left, ...right].some(item => item.rect.bottom > block.rect.top))) continue;
      if (!best || gap > best.gap) best = { gap, left, right, header, footer };
    }
    if (best) return [
      ...best.header, ...orderByColumns(best.left, level + 1),
      ...orderByColumns(best.right, level + 1), ...best.footer
    ];
    // 大きな横方向の余白で、全幅見出しや別セクションを切り離してから再判定する。
    let lowerEdge = rows[0].rect.bottom;
    let split = -1;
    let largestGap = textHeight * 1.5;
    for (let i = 1; i < rows.length; i++) {
      const gap = rows[i].rect.top - lowerEdge;
      if (gap > largestGap) { split = i; largestGap = gap; }
      lowerEdge = Math.max(lowerEdge, rows[i].rect.bottom);
    }
    return split < 0 ? rows : [
      ...orderByColumns(rows.slice(0, split), level + 1),
      ...orderByColumns(rows.slice(split), level + 1)
    ];
  }

  function pageOrderKey(url, blocks) {
    if (!blocks.length) return '';
    const address = new URL(url);
    const design = address.pathname.match(/^\/design\/([^/]+)/)?.[1];
    if (!design) return '';
    // 座標・言語・DOM順序は含めず、拡大縮小や訳文の並べ替えで設定を失わないようにする。
    const content = blocks.map(block => block.runs.map(run => run.text).join('')
      .replace(/\s+/g, ' ').trim()).sort();
    const page = address.searchParams.get('page') || address.hash;
    const source = JSON.stringify([page, content]);
    let first = 2166136261;
    let second = 2246822507;
    for (let i = 0; i < source.length; i++) {
      first = Math.imul(first ^ source.charCodeAt(i), 16777619);
      second = Math.imul(second ^ source.charCodeAt(i), 3266489909);
    }
    // 原文そのものは保存せず、資料IDと本文から作る識別値だけを使う。
    return `crp:page-order:v1:${design}:${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
  }

  function createPageOrderPreferences(storage, defaultMode = 'rows') {
    const memory = new Map();
    let persistent = Boolean(storage);
    return {
      get persistent() { return persistent; },
      get(key) {
        if (!key) return defaultMode;
        if (memory.has(key)) return memory.get(key);
        let mode = defaultMode;
        try { const saved = storage?.getItem(key); if (saved === 'columns' || saved === 'rows') mode = saved; }
        catch { persistent = false; }
        memory.set(key, mode);
        return mode;
      },
      set(key, mode) {
        if (!key) return;
        const value = mode === 'columns' ? 'columns' : 'rows';
        memory.set(key, value);
        try {
          if (value !== defaultMode) storage?.setItem(key, value);
          else storage?.removeItem(key);
        } catch { persistent = false; }
      }
    };
  }

  function createUiTranslationPreference(storage) {
    const key = 'crp:pdf-translate-ui:v1';
    let enabled = true; // 既存の表示を保つ。ユーザーがオフにした場合だけ日本語にする。
    let persistent = Boolean(storage);
    try { enabled = storage?.getItem(key) !== 'false'; }
    catch { persistent = false; }
    return {
      get enabled() { return enabled; },
      get persistent() { return persistent; },
      set(value) {
        enabled = Boolean(value);
        try { storage?.setItem(key, String(enabled)); }
        catch { persistent = false; }
      }
    };
  }

  function createTextSizePreference(storage) {
    const key = 'crp:pdf-text-size:v1';
    const normalize = value => {
      const number = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
      return Number.isFinite(number) ? Math.min(32, Math.max(12, Math.round(number))) : 17;
    };
    let size = 17;
    try { size = normalize(storage?.getItem(key)); } catch { /* Current tab still works without storage. */ }
    return {
      get size() { return size; },
      set(value) {
        size = normalize(value);
        try { storage?.setItem(key, String(size)); } catch { /* Keep the in-memory size. */ }
        return size;
      }
    };
  }

  function textUnits(blocks) {
    return blocks.flatMap(block => block.runs.map(run => run.text));
  }

  function translationSeparator(previous, next, language) {
    if (!previous || /^(zh|ja|th)(-|$)/.test(language) || /\s$/.test(previous) || /^\s/.test(next)) return '';
    if (/^[,.;:!?，。！？、…\)\]\}»”’]/.test(next) || /[\(\[\{«“‘]$/.test(previous)) return '';
    return ' ';
  }

  // ページ変更時に必ず翻訳し直し、前のページの遅い結果を表示しない。
  function createTranslationController({ onResult, onStatus, onError }) {
    let engine = null;
    let language = '';
    let sourceLanguage = 'ja';
    let current = [];
    let signature = '';
    let revision = 0;
    let pending = null;
    const cache = new Map();

    function cancel() {
      revision += 1;
      pending?.abort();
      pending = null;
    }

    async function run() {
      cancel();
      if (!engine) return;
      if (!current.length) {
        onResult([], language);
        onStatus('empty');
        return;
      }
      const token = revision;
      const activeEngine = engine;
      const activeLanguage = language;
      const activeSourceLanguage = sourceLanguage;
      const blocks = [...current];
      const abort = new AbortController();
      pending = abort;
      onResult([], activeLanguage);
      onStatus('translating');
      try {
        const translated = [];
        for (const text of blocks) {
          const key = JSON.stringify([activeSourceLanguage, activeLanguage, text]);
          let result = cache.get(key);
          if (result === undefined) {
            result = await activeEngine.translate(text, { signal: abort.signal });
            if (token !== revision) return;
            if (cache.size >= 200) cache.delete(cache.keys().next().value);
            cache.set(key, result);
          }
          if (token !== revision) return;
          translated.push(result);
        }
        onResult(translated, activeLanguage);
        onStatus('active');
      } catch (error) {
        if (token === revision) onError(error);
      } finally {
        if (token === revision) pending = null;
      }
    }

    return {
      update(blocks, force = false, refreshLayout = false) {
        const next = JSON.stringify(blocks);
        if (!force && !refreshLayout && signature === next) return;
        // 「翻訳し直す」では表示中の本文の保存済み訳を破棄し、翻訳を再実行する。
        if (force) {
          for (const text of blocks) cache.delete(JSON.stringify([sourceLanguage, language, text]));
        }
        signature = next;
        current = [...blocks];
        void run();
      },
      attach(translator, targetLanguage, fromLanguage = 'ja') {
        cancel();
        engine = translator;
        language = targetLanguage;
        sourceLanguage = fromLanguage;
        void run();
      },
      detach() {
        cancel();
        engine = null;
      }
    };
  }

  function isLightColor(color) {
    const match = color.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/);
    return match && (.2126 * Number(match[1]) + .7152 * Number(match[2]) + .0722 * Number(match[3])) > 180;
  }
  function renderTranslatedBlocks(doc, blocks, translated, language) {
    const fragment = doc.createDocumentFragment();
    let index = 0;
    for (const block of translated.length ? blocks : []) {
      const wrapper = doc.createElement('div');
      wrapper.className = 'crp-block';
      let paragraph = wrapper;
      if (block.list) {
        wrapper.classList.add('crp-list-row');
        wrapper.style.marginInlineStart = `${Math.min(block.list.depth, 6) * 1.4}em`;
        const marker = doc.createElement('span');
        marker.className = 'crp-marker';
        marker.textContent = block.list.marker;
        marker.style.color = block.color;
        marker.setAttribute('translate', 'no');
        paragraph = doc.createElement('span');
        paragraph.className = 'crp-list-text';
        wrapper.append(marker, paragraph);
      }
      paragraph.dir = 'auto';
      paragraph.style.color = block.color;
      const darkBackground = isLightColor(block.color);
      if (darkBackground) wrapper.style.backgroundColor = '#172b3c';
      let previous = '';
      for (const run of block.runs) {
        const text = translated[index++] || '';
        const span = doc.createElement('span');
        span.style.color = run.color;
        // 元の明るい文字色が白いパネル上で消えないよう、背景で補う。
        if (isLightColor(run.color)) span.style.backgroundColor = '#172b3c';
        else if (darkBackground) span.style.backgroundColor = '#fff';
        span.textContent = translationSeparator(previous, text, language || '') + text;
        paragraph.append(span);
        previous = text;
      }
      fragment.append(wrapper);
    }
    return fragment;
  }

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
        pixels: null, colors: new Map(), gaps: new Map() };
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
    const imageRect = rect => ({
        left: (rect.left - bounds.left) / width * cache.pixels.width,
        right: (rect.right - bounds.left) / width * cache.pixels.width,
        top: (rect.top - bounds.top) / height * cache.pixels.height,
        bottom: (rect.bottom - bounds.top) / height * cache.pixels.height
      });
    const readColor = rect => {
      const target = imageRect(rect);
      const key = [target.left, target.top, target.right, target.bottom].map(Math.round).join(',');
      if (!cache.colors.has(key)) {
        if (cache.colors.size >= 1000) cache.colors.clear();
        cache.colors.set(key, samplePdfTextColor(cache.pixels, target) || PDF_DEFAULT_COLOR);
      }
      return cache.colors.get(key);
    };
    readColor.gaps = rect => {
      const target = imageRect(rect);
      const key = [target.left, target.top, target.right, target.bottom].map(Math.round).join(',');
      if (!cache.gaps.has(key)) {
        if (cache.gaps.size >= 1000) cache.gaps.clear();
        cache.gaps.set(key, pdfLineGaps(cache.pixels, target));
      }
      return cache.gaps.get(key).map(gap => Object.fromEntries(Object.entries(gap)
        .map(([k, x]) => [k, bounds.left + x / cache.pixels.width * width])));
    };
    return readColor;
  }

  // Drive sometimes joins separate columns into one paragraph. Its DOM Range
  // rectangles describe the invisible selection font, not the PDF glyphs.
  // Use large blank strips in the already-rendered image to locate a real gap.
  function pdfLineGaps(pixels, rect) {
    const { width, height, data } = pixels;
    const left = Math.max(0, Math.floor(rect.left)), right = Math.min(width, Math.ceil(rect.right));
    const top = Math.max(0, Math.floor(rect.top)), bottom = Math.min(height, Math.ceil(rect.bottom));
    if (right <= left || bottom <= top || (right - left) * (bottom - top) > 300000) return [];
    const colors = new Map();
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 240) continue;
      const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      colors.set(key, (colors.get(key) || 0) + 1);
    }
    const background = [...colors].sort((a, b) => b[1] - a[1])[0];
    if (!background || background[1] < (right - left) * (bottom - top) * .6) return [];
    const bg = [((background[0] >> 10) & 31) * 8 + 4, ((background[0] >> 5) & 31) * 8 + 4, (background[0] & 31) * 8 + 4];
    const ink = [];
    for (let x = left; x < right; x++) {
      let count = 0;
      for (let y = top; y < bottom; y++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] >= 240 && bg.reduce((sum, c, k) => sum + (data[i + k] - c) ** 2, 0) > 1800) count++;
      }
      if (count >= Math.max(2, (bottom - top) * .08)) ink.push(x);
    }
    const gaps = [];
    for (let i = 1; i < ink.length; i++) {
      if (ink[i] - ink[i - 1] >= Math.max(8, (bottom - top) * 1.5)) {
        gaps.push({ left: ink[i - 1] + 1, right: ink[i], start: ink[0], end: ink[ink.length - 1] + 1 });
      }
    }
    return gaps;
  }

  function splitPdfParagraph(record, records, readColor, level = 0) {
    const { text, rect } = record;
    if (!readColor.gaps || level >= 3 || !/\S[ \t\u00a0]+\S/u.test(text)) return [record];
    const height = rect.bottom - rect.top;
    const peers = records.filter(p => p !== record &&
      p.rect.bottom - p.rect.top >= height * .6 && p.rect.bottom - p.rect.top <= height * 1.5);
    const weight = value => [...value].reduce((sum, ch) => sum +
      (/\s/u.test(ch) ? .3 : /[\u0020-\u007e]/u.test(ch) ? .55 : 1), 0);
    for (const gap of readColor.gaps(rect)) {
      // A blank within a sentence is insufficient: require at least two other
      // paragraphs on each side of a shared, vertically overlapping gutter.
      const edges = [...new Set([gap.left, gap.right, ...peers.flatMap(p => [p.rect.left, p.rect.right])])]
        .filter(x => x >= gap.left && x <= gap.right).sort((a, b) => a - b);
      const supported = edges.slice(1).some((edge, i) => {
        const cut = (edges[i] + edge) / 2;
        const left = peers.filter(p => p.rect.right <= cut), right = peers.filter(p => p.rect.left >= cut);
        return left.length >= 2 && right.length >= 2 && left.some(a => right.some(b =>
          Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) >= height * .3));
      });
      if (!supported) continue;
      const leftWidth = gap.left - gap.start, rightWidth = gap.end - gap.right;
      if (Math.min(leftWidth, rightWidth) < height) continue;
      const ratio = leftWidth / (leftWidth + rightWidth);
      const candidates = [...text.matchAll(/[ \t\u00a0]+/gu)].map(match => {
        const left = text.slice(0, match.index).trim(), right = text.slice(match.index + match[0].length).trim();
        const a = weight(left), b = weight(right);
        return { left, right, error: Math.abs(a / (a + b) - ratio) };
      }).filter(c => c.left && c.right).sort((a, b) => a.error - b.error);
      const best = candidates[0];
      // Keep ambiguous text intact. Never invent words or split within a word.
      if (!best || best.error > .1 || (candidates[1] && candidates[1].error - best.error < .035)) continue;
      return [
        { text: best.left, sourceText: record.sourceText || text, rect: { ...rect, left: gap.start, right: gap.left } },
        { text: best.right, sourceText: record.sourceText || text, rect: { ...rect, left: gap.right, right: gap.end } }
      ].flatMap(part => splitPdfParagraph(part, records, readColor, level + 1));
    }
    return [record];
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
    const readColor = pdfPageColorReader(doc, current.element);
    const blocks = [];
    const records = [...(layer?.querySelectorAll(PDF_SELECTORS.paragraph) || [])].map(paragraph => {
      const { left, top, right, bottom } = paragraph.getBoundingClientRect();
      return { text: paragraph.textContent.trim(), rect: { left, top, right, bottom } };
    });
    for (const record of records.flatMap(p => splitPdfParagraph(p, records, readColor))) {
      const { text, rect } = record;
      // The selection layer is white regardless of PDF colors. Sample the rendered page image instead.
      // Layout sorting and duplicate detection use CSS-pixel tolerances, as in Canva.
      // Keep both axes in page-relative CSS pixels: percentages make a normal gutter
      // look too small and distort its width relative to the text height.
      const block = pdfTextBlock(text, {
        left: rect.left - bounds.left,
        right: rect.right - bounds.left,
        top: rect.top - bounds.top,
        bottom: rect.bottom - bounds.top
      }, readColor(rect));
      if (block && record.sourceText) {
        const original = pdfTextBlock(record.sourceText, rect);
        block.sourceText = (original.list?.marker || '') + original.runs[0].text;
      }
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
    let size = 0, sourceSize = 0;
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
      if (block.sourceText !== undefined) {
        if (typeof block.sourceText !== 'string' || block.sourceText.length > 20000 ||
            (sourceSize += block.sourceText.length) > 200000) return null;
        clean.sourceText = block.sourceText;
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
    // Keep page preferences stable when a late-loading image lets us split a
    // paragraph. The identity uses the original selection-layer paragraphs.
    const joined = new Set();
    const texts = blocks.flatMap(block => {
      if (!block.sourceText) return [(block.list?.marker || '') + block.runs.map(run => run.text).join('')];
      if (joined.has(block.sourceText)) return [];
      joined.add(block.sourceText);
      return [block.sourceText];
    });
    const identity = JSON.stringify([url.origin + url.pathname, snapshot.documentTitle, snapshot.page, texts.sort()]);
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

  // 更新・抽出・出力の各処理をNodeでも回帰テストできる。
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = {
      createTranslationController, uiText, uiLanguage, localizeControls, createUiTranslationPreference, createTextSizePreference,
      extractStyledBlocks, textUnits, translationSeparator,
      filterRenderedRects, orderVisibleBlocks, finalizeListBlocks, formatListMarker, renderTranslatedBlocks,
      orderByColumns, pageOrderKey, createPageOrderPreferences,
      PDF_SELECTORS, PDF_CHANNEL, safePdfColor, samplePdfTextColor, pdfPageColorReader, pdfLineGaps, splitPdfParagraph, isDrivePdfRoute, visiblePdfRect, choosePdfPage, pdfTextBlock,
      readDrivePdf, sanitizePdfSnapshot, acceptPdfMessage, pdfPageKey, createPdfSource, startPdfFrameSource,
      uiLanguages: Object.keys(UI_MESSAGES)
    };
    return;
  }

  const isViewer = () => location.origin === CLASSROOM_ORIGIN || isDrivePdfRoute(location.href);
  if (window.top !== window) {
    if (isDrivePdfRoute(location.href) && document.body) startPdfFrameSource();
    return;
  }
  if (!isViewer() || !document.body) return;
  const id = 'classroom-pdf-reading-panel-local';
  if (document.getElementById(id)) return;

  const host = document.createElement('aside');
  host.id = id;
  host.lang = 'en';
  host.className = 'notranslate';
  host.setAttribute('translate', 'no');

  const style = document.createElement('style');
  style.textContent = `
    #${id} {
      all: initial; position: fixed; z-index: 2147483647;
      top: 12px; right: 12px; width: min(440px, calc(100vw - 24px));
      height: min(760px, calc(100vh - 24px));
      max-width: calc(100vw - 24px); max-height: calc(100vh - 24px);
      display: flex; flex-direction: column; box-sizing: border-box;
      color: #202124; background: #fff; border: 1px solid #b7bec7;
      border-radius: 12px; box-shadow: 0 6px 28px #0003;
      font: 16px/1.7 system-ui, sans-serif; text-align: start;
      overflow: hidden; isolation: isolate;
    }
    #${id}[hidden] { display: none !important; }
    #${id}.crp-left { right: auto; left: 12px; }
    #${id}.crp-collapsed { width: auto !important; height: auto !important; }
    #${id} * { box-sizing: border-box; }
    #${id} .crp-toolbar, #${id} .crp-controls {
      display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
      flex: 0 0 auto; padding: 10px 12px; background: #f2f5f9;
      border-bottom: 1px solid #dce1e8; font: 13px/1.5 system-ui, sans-serif;
    }
    #${id} .crp-title { flex: 1 1 120px; min-width: 0; font-weight: 700; overflow-wrap: anywhere; }
    #${id} .crp-toolbar { cursor: grab; touch-action: none; user-select: none; }
    #${id}.crp-dragging .crp-toolbar { cursor: grabbing; }
    #${id} .crp-title:focus-visible { outline: 2px solid #1769d2; outline-offset: 2px; }
    #${id} button, #${id} select {
      all: initial; box-sizing: border-box; cursor: pointer;
      padding: 6px 9px; border: 1px solid #b7bec7; border-radius: 6px;
      background: #fff; color: #202124; font: 13px/1.5 system-ui, sans-serif;
      max-width: 100%; white-space: normal; overflow-wrap: anywhere;
      direction: inherit; text-align: start;
    }
    #${id} select { appearance: auto; max-width: 100%; }
    #${id} select:disabled { opacity: .5; cursor: default; }
    #${id} .crp-languages { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; flex: 1 0 100%; min-width: 0; }
    #${id} .crp-language { display: flex; flex-direction: column; gap: 4px; min-width: 0; font: inherit; }
    #${id} .crp-language select { width: 100%; min-width: 0; }
    #${id} .crp-order { flex: 1 0 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    #${id} .crp-font-controls { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font: inherit; }
    #${id} .crp-font-controls button { min-width: 30px; text-align: center; }
    #${id} .crp-font-value { min-width: 38px; text-align: center; direction: ltr; font-variant-numeric: tabular-nums; }
    #${id} .crp-ui-controls { flex: 1 0 100%; min-width: 0; font: inherit; }
    #${id} .crp-ui-setting { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; }
    #${id} .crp-ui-setting input {
      all: initial; appearance: auto; accent-color: #1769d2; cursor: pointer;
      display: inline-block; flex: 0 0 16px; width: 16px; height: 16px; margin-top: 2px;
    }
    #${id} .crp-ui-setting input:focus-visible {
      outline: 2px solid #1769d2; outline-offset: 2px;
    }
    #${id} button:disabled { opacity: .5; cursor: default; }
    #${id} button:focus-visible, #${id} select:focus-visible {
      outline: 2px solid #1769d2; outline-offset: 2px;
    }
    #${id} .crp-status {
      margin: 0; padding: 10px 14px; font: 13px/1.6 system-ui, sans-serif;
      color: #526070; border-bottom: 1px solid #e8ebef; flex: 0 0 auto;
      white-space: pre-wrap; overflow-wrap: anywhere;
    }
    #${id} .crp-status.crp-error { color: #a32222; }
    #${id} .crp-body {
      flex: 1; min-height: 0; padding: 16px; overflow: auto;
      overscroll-behavior: contain; user-select: text;
      white-space: pre-wrap; overflow-wrap: anywhere; word-break: normal;
      font: 17px/1.8 system-ui, sans-serif;
    }
    #${id} .crp-block { margin: 0 0 16px; }
    #${id} .crp-list-row { display: flex; align-items: baseline; gap: .5em; }
    #${id} .crp-marker {
      all: initial; display: block; flex: 0 0 auto; min-width: 1.5em;
      font: inherit; color: inherit; text-align: end; white-space: pre;
      direction: ltr; unicode-bidi: isolate;
    }
    #${id} .crp-list-text { display: block; min-width: 0; flex: 1; }
    #${id} .crp-resize {
      position: absolute; bottom: 0; left: 0; width: 26px; height: 26px;
      padding: 0; display: grid; place-items: center; border-radius: 0 8px 0 10px;
      background: #eef3f9; color: #526070; cursor: nesw-resize;
      touch-action: none; user-select: none; font: 18px/1 system-ui, sans-serif;
    }
    #${id}.crp-left .crp-resize {
      left: auto; right: 0; border-radius: 8px 0 10px 0; cursor: nwse-resize;
    }
    #${id}.crp-collapsed .crp-resize { display: none; }
    #${id} [hidden] { display: none !important; }
  `;
  const toolbar = document.createElement('div');
  toolbar.className = 'crp-toolbar';
  const title = document.createElement('span');
  title.className = 'crp-title';
  title.tabIndex = 0;
  toolbar.append(title);
  const controls = document.createElement('div');
  controls.className = 'crp-controls';
  const status = document.createElement('p');
  status.className = 'crp-status';
  status.setAttribute('role', 'status');
  const body = document.createElement('div');
  body.className = 'crp-body';
  body.tabIndex = 0;

  function button(parent, label, action) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', action);
    parent.append(element);
    return element;
  }
  const languages = [
    ['en', 'English'], ['ja', '日本語'], ['zh', '简体中文'], ['zh-Hant', '繁體中文'],
    ['ko', '한국어'], ['vi', 'Tiếng Việt'], ['th', 'ภาษาไทย'],
    ['id', 'Bahasa Indonesia'], ['es', 'Español'], ['fr', 'Français'],
    ['de', 'Deutsch'], ['it', 'Italiano'], ['pt', 'Português'],
    ['ru', 'Русский'], ['uk', 'Українська'], ['ar', 'العربية'],
    ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['tr', 'Türkçe']
  ];
  const languageControls = document.createElement('div');
  languageControls.className = 'crp-languages';
  function languageField(name, initial) {
    const label = document.createElement('label');
    label.className = 'crp-language';
    const caption = document.createElement('span');
    const select = document.createElement('select');
    select.id = `${id}-${name}`;
    label.htmlFor = select.id;
    for (const [code, text] of languages) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = text;
      option.dir = 'auto';
      select.append(option);
    }
    select.value = initial;
    label.append(caption, select);
    languageControls.append(label);
    return { select, caption };
  }
  const { select: sourceLanguageSelect, caption: sourceLanguageLabel } = languageField('source', 'ja');
  const { select: target, caption: targetLabel } = languageField('target', 'en');
  controls.append(languageControls);
  const orderControls = document.createElement('div');
  orderControls.className = 'crp-order';
  const orderLabel = document.createElement('label');
  const orderSelect = document.createElement('select');
  orderSelect.id = `${id}-order`;
  orderLabel.htmlFor = orderSelect.id;
  orderSelect.disabled = true;
  const orderOptions = {};
  for (const mode of ['rows', 'columns']) {
    const option = document.createElement('option');
    option.value = mode;
    orderSelect.append(option);
    orderOptions[mode] = option;
  }
  orderControls.append(orderLabel, orderSelect);
  let storage = null;
  try { storage = window.localStorage; } catch { /* 保存不可でも現在のタブでは切り替えられる。 */ }
  const pageOrders = createPageOrderPreferences(storage, 'columns');
  const uiPreference = createUiTranslationPreference(storage);
  const textSize = createTextSizePreference(storage);
  const fontControls = document.createElement('div');
  fontControls.className = 'crp-font-controls';
  const fontLabel = document.createElement('span');
  fontControls.append(fontLabel);
  const fontSmaller = button(fontControls, '−', () => {
    textSize.set(textSize.size - 1); applyTextSize();
  });
  const fontValue = document.createElement('span');
  fontValue.className = 'crp-font-value';
  fontValue.setAttribute('aria-live', 'polite');
  fontControls.append(fontValue);
  const fontLarger = button(fontControls, '＋', () => {
    textSize.set(textSize.size + 1); applyTextSize();
  });
  function applyTextSize() {
    body.style.fontSize = `${textSize.size}px`;
    fontValue.textContent = `${textSize.size} px`;
    fontSmaller.disabled = textSize.size <= 12;
    fontLarger.disabled = textSize.size >= 32;
  }
  applyTextSize();
  const uiControls = document.createElement('div');
  uiControls.className = 'crp-ui-controls';
  const uiToggleLabel = document.createElement('label');
  uiToggleLabel.className = 'crp-ui-setting';
  const uiToggle = document.createElement('input');
  uiToggle.id = `${id}-translate-ui`;
  uiToggle.type = 'checkbox';
  uiToggleLabel.htmlFor = uiToggle.id;
  const uiToggleText = document.createElement('span');
  uiToggleLabel.append(uiToggle, uiToggleText);
  uiControls.append(uiToggleLabel);
  const currentUiLanguage = () => uiLanguage(target.value, uiPreference.enabled);
  let currentPageKey = '';
  function updateOrderHint() {
    orderSelect.title = uiText(currentUiLanguage(), pageOrders.persistent ? 'orderHint' : 'orderMemoryOnly');
  }

  let statusState = { key: 'ready', values: {}, error: false, detail: '' };
  function renderStatus() {
    const { key, values, error, detail } = statusState;
    const message = uiText(currentUiLanguage(), key, values, sourceLanguageSelect.value === target.value);
    status.textContent = detail ? `${message}\n${detail}` : message;
    status.classList.toggle('crp-error', error);
    // 普段の案内文は表示せず、処理中・読み取り待ち・エラーのときだけ使う。
    status.hidden = host.classList.contains('crp-collapsed') || (!error && ['ready', 'active'].includes(key));
  }
  function showStatus(key, values = {}, error = false, detail = '') {
    statusState = { key, values, error, detail };
    renderStatus();
  }
  let visibleBlocks = [];
  let presentationSignature = '';
  function showResult(translated, language) {
    body.lang = language || 'ja';
    body.dir = language === 'ar' ? 'rtl' : 'ltr';
    body.replaceChildren(renderTranslatedBlocks(document, visibleBlocks, translated, language));
    body.scrollTop = 0;
  }
  function showError(error) {
    const detail = error?.message || String(error);
    const key = error?.name === 'NotAllowedError' ? 'blocked'
      : error?.name === 'NotSupportedError' ? 'unsupported' : 'failed';
    showStatus(key, {}, true, detail);
  }
  const translation = createTranslationController({
    onResult: showResult, onStatus: showStatus, onError: showError
  });
  let engine = null;
  let initialization = 0;
  let disposed = false;
  const pdfSource = createPdfSource(() => refresh());
  function updatePageTitle() {
    const page = pdfSource.snapshot;
    title.textContent = uiText(currentUiLanguage(), 'title') +
      (page?.open && page.page ? ` · ${page.page}/${page.total}` : '');
  }

  function applyUiLanguage() {
    localizeControls({ host, title, sourceLanguageSelect, sourceLanguageLabel, target, targetLabel, start, toggle, resizeHandle, orderLabel, orderSelect, orderOptions,
      uiToggle, uiToggleText, fontLabel, fontSmaller, fontLarger }, {
      language: target.value, sourceLanguage: sourceLanguageSelect.value, started: Boolean(engine),
      collapsed: host.classList.contains('crp-collapsed'), translateUi: uiPreference.enabled
    });
    renderStatus();
    updatePageTitle();
    updateOrderHint();
    uiToggleLabel.title = uiText(currentUiLanguage(), uiPreference.persistent ? 'uiHint' : 'uiMemoryOnly');
  }

  const start = button(controls, '', async () => {
    const language = target.value;
    const sourceLanguage = sourceLanguageSelect.value;
    if (sourceLanguage !== language && !self.Translator?.create) {
      showStatus('unavailable', {}, true);
      return;
    }
    refresh();
    if (engine) {
      updateSource(true);
      return;
    }
    const token = ++initialization;
    start.disabled = true;
    target.disabled = true;
    sourceLanguageSelect.disabled = true;
    showStatus('preparing');
    try {
      // クリック直後に作成する。事前にawaitするとユーザー操作の有効期間が切れることがある。
      // 翻訳元と翻訳先が同じ場合、翻訳モデルを呼ばず原文をそのまま表示する。
      const created = sourceLanguage === language ? { translate: async text => text, destroy() {} } : await self.Translator.create({
        sourceLanguage, targetLanguage: language,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', event => {
            if (token !== initialization || disposed) return;
            showStatus('downloading', { percent: Math.round(event.loaded * 100) });
          });
        }
      });
      if (disposed || token !== initialization) {
        created.destroy();
        return;
      }
      engine = created;
      // ダウンロード待ちの間にページが変わった場合も、現在の本文を使う。
      updateSource();
      translation.attach(engine, language, sourceLanguage);
      applyUiLanguage();
    } catch (error) {
      if (!disposed && token === initialization) showError(error);
    } finally {
      if (!disposed && token === initialization) {
        start.disabled = false;
        target.disabled = false;
        sourceLanguageSelect.disabled = false;
      }
    }
  });
  controls.append(fontControls, orderControls, uiControls);
  uiToggle.addEventListener('change', () => {
    uiPreference.set(uiToggle.checked);
    applyUiLanguage();
    keepPanelInView();
  });
  orderSelect.addEventListener('change', () => {
    const selectedMode = orderSelect.value;
    const source = readVisibleBlocks();
    const key = pdfPageKey(location.href, pdfSource.snapshot, source);
    // スライド切り替え直後の古い操作で、移動先のページに設定を書き込まない。
    if (key && key === currentPageKey) pageOrders.set(key, selectedMode);
    updateSource(false, source);
    keepPanelInView();
  });
  function changeLanguages() {
    initialization += 1;
    translation.detach();
    engine?.destroy();
    engine = null;
    start.disabled = false;
    target.disabled = false;
    sourceLanguageSelect.disabled = false;
    applyUiLanguage();
    showResult([], target.value);
    showStatus('ready');
    keepPanelInView();
  }
  target.addEventListener('change', changeLanguages);
  sourceLanguageSelect.addEventListener('change', changeLanguages);
  const toggle = button(toolbar, '', () => {
    const collapsed = host.classList.toggle('crp-collapsed');
    for (const element of [controls, status, body]) element.hidden = collapsed;
    applyUiLanguage();
    toggle.setAttribute('aria-expanded', String(!collapsed));
    keepPanelInView();
    if (!collapsed) refresh();
  });
  toggle.setAttribute('aria-expanded', 'true');
  host.append(style, toolbar, controls, status, body);
  // 画面の内側の角をドラッグして拡大できるよう、表示位置に合わせてつまみを移す。
  const resizeHandle = button(host, '↙', () => {});
  resizeHandle.className = 'crp-resize';
  let resizing = null;

  function setPanelSize(width, height) {
    const rect = host.getBoundingClientRect();
    const maxWidth = Math.max(1, host.classList.contains('crp-left')
      ? innerWidth - rect.left - 12 : rect.right - 12);
    const maxHeight = Math.max(1, innerHeight - rect.top - 12);
    host.style.width = `${Math.min(maxWidth, Math.max(Math.min(280, maxWidth), width))}px`;
    host.style.height = `${Math.min(maxHeight, Math.max(Math.min(260, maxHeight), height))}px`;
  }
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = host.getBoundingClientRect();
    resizing = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      width: rect.width, height: rect.height,
      direction: host.classList.contains('crp-left') ? 1 : -1
    };
    resizeHandle.setPointerCapture(event.pointerId);
  });
  resizeHandle.addEventListener('pointermove', event => {
    if (!resizing || resizing.pointer !== event.pointerId) return;
    setPanelSize(
      resizing.width + (event.clientX - resizing.x) * resizing.direction,
      resizing.height + event.clientY - resizing.y
    );
  });
  function stopResizing(event) {
    if (!resizing || resizing.pointer !== event.pointerId) return;
    resizing = null;
    if (resizeHandle.hasPointerCapture(event.pointerId)) resizeHandle.releasePointerCapture(event.pointerId);
  }
  resizeHandle.addEventListener('pointerup', stopResizing);
  resizeHandle.addEventListener('pointercancel', stopResizing);
  resizeHandle.addEventListener('lostpointercapture', stopResizing);
  resizeHandle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = host.getBoundingClientRect();
    const direction = host.classList.contains('crp-left') ? 1 : -1;
    const dx = event.key === 'ArrowRight' ? 20 : event.key === 'ArrowLeft' ? -20 : 0;
    const dy = event.key === 'ArrowDown' ? 20 : event.key === 'ArrowUp' ? -20 : 0;
    setPanelSize(rect.width + dx * direction, rect.height + dy);
  });
  document.body.append(host);

  // 横位置の基準を保って移動し、移動後も角のサイズ調整を使えるようにする。
  function movePanel(left, top) {
    const rect = host.getBoundingClientRect();
    const x = Math.max(12, Math.min(left, innerWidth - rect.width - 12));
    const y = Math.max(12, Math.min(top, innerHeight - rect.height - 12));
    host.style.top = `${y}px`;
    if (host.classList.contains('crp-left')) {
      host.style.left = `${x}px`;
      host.style.right = 'auto';
    } else {
      host.style.left = 'auto';
      host.style.right = `${innerWidth - x - rect.width}px`;
    }
  }
  function keepPanelInView() {
    const rect = host.getBoundingClientRect();
    movePanel(rect.left, rect.top);
  }

  let moving = null;
  toolbar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary ||
        event.target.closest?.('button, select, input, a')) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = host.getBoundingClientRect();
    moving = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      left: rect.left, top: rect.top
    };
    host.classList.add('crp-dragging');
    toolbar.setPointerCapture(event.pointerId);
  });
  toolbar.addEventListener('pointermove', event => {
    if (!moving || moving.pointer !== event.pointerId) return;
    movePanel(moving.left + event.clientX - moving.x, moving.top + event.clientY - moving.y);
  });
  function stopMoving(event) {
    if (!moving || moving.pointer !== event.pointerId) return;
    moving = null;
    host.classList.remove('crp-dragging');
    if (toolbar.hasPointerCapture(event.pointerId)) toolbar.releasePointerCapture(event.pointerId);
  }
  toolbar.addEventListener('pointerup', stopMoving);
  toolbar.addEventListener('pointercancel', stopMoving);
  toolbar.addEventListener('lostpointercapture', stopMoving);
  title.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = host.getBoundingClientRect();
    const dx = event.key === 'ArrowRight' ? 20 : event.key === 'ArrowLeft' ? -20 : 0;
    const dy = event.key === 'ArrowDown' ? 20 : event.key === 'ArrowUp' ? -20 : 0;
    movePanel(rect.left + dx, rect.top + dy);
  });
  window.addEventListener('resize', keepPanelInView);

  function readVisibleBlocks() {
    const snapshot = pdfSource.read();
    return orderVisibleBlocks(snapshot.open ? snapshot.blocks || [] : []);
  }

  function updateSource(force = false, source = readVisibleBlocks()) {
    host.hidden = !pdfSource.snapshot.open;
    updatePageTitle();
    currentPageKey = pdfPageKey(location.href, pdfSource.snapshot, source);
    const mode = pageOrders.get(currentPageKey);
    orderSelect.value = mode;
    orderSelect.disabled = !currentPageKey;
    updateOrderHint();
    // 初期値は列順。明確な列がない場合は行順になり、ページごとの変更も保存する。
    const blocks = finalizeListBlocks(mode === 'columns' ? orderByColumns(source) : source);
    const signature = JSON.stringify([currentPageKey, blocks]);
    const changed = signature !== presentationSignature;
    visibleBlocks = blocks;
    presentationSignature = signature;
    translation.update(textUnits(blocks), force, changed);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    initialization += 1;
    translation.detach();
    engine?.destroy();
    pdfSource.dispose();
    observer.disconnect();
    clearInterval(poll);
    clearTimeout(timer);
    window.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('resize', keepPanelInView);
    document.removeEventListener('visibilitychange', schedule);
    host.remove();
  }
  function refresh() {
    if (disposed) return;
    if (!isViewer()) { dispose(); return; }
    if (!document.hidden) updateSource();
  }
  let timer;
  function schedule(event) {
    if (disposed || (event?.target?.nodeType && host.contains(event.target))) return;
    clearTimeout(timer);
    timer = setTimeout(refresh, 350);
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => !host.contains(record.target))) schedule();
  });
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['lang', 'translate', 'style', 'class', 'hidden']
  });
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', schedule);
  // スライドの切り替え方によってDOMの通知が出ない場合も確認する。
  const poll = setInterval(refresh, 1200);
  applyUiLanguage();
  showStatus('ready');
  refresh();
})();
