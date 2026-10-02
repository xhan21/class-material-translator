# 授業資料 翻訳ツール

iU大学で[韓](https://xuhan.jp/)が担当する授業向けに試運用している、Canva資料とClassroomで配布されたPDFの翻訳ツールです。

授業資料を開いたまま、右側のパネルに訳文を表示します。パソコン版ChromeとTampermonkeyで利用します。

## 導入ガイド

- [Canva・PDF共通の導入ガイド](index.html)
- [Canva版の19言語対応ガイド](canva-translation-guide.html)
- [Googleサイトに貼り付けるHTMLコード](class-material-translation-google-sites.txt)

初めての方は導入ガイドの手順01から、同じChromeでTampermonkeyのスクリプトがすでに動いている方は手順04から進めてください。

## 資料ごとに使うコード

| 資料 | コード | バージョン |
| --- | --- | --- |
| Canvaの閲覧用リンク | [canva-reading-panel.user.js](canva-reading-panel.user.js) | 2.8.0 |
| Classroom・Google DriveのPDFプレビュー | [classroom-pdf-reading-panel.user.js](classroom-pdf-reading-panel.user.js) | 0.3.0 |

両方を利用する場合は、Tampermonkeyに別々のスクリプトとして登録します。更新する場合は、該当する登録済みスクリプトのコード全体を置き換えて保存し、資料のタブを再読み込みしてください。

## 主な操作

- 言語を選び、開始ボタンを押すと翻訳します。ページを変えると訳文も更新されます。
- 起動位置は右側です。上部をドラッグして移動し、左下の角をドラッグして大きさを変えられます。
- 「文字サイズ」の＋／−で本文を12〜32 pxに調整できます。初期値は17 pxです。
- 読み順はページごとに行順・列順を選べます。
- ボタンを選択した言語にするか、日本語で表示するかを切り替えられます。
- 日本語を選ぶと、翻訳せず原文をパネルに表示できます。

## 利用環境と制限

パソコン版Chrome 138以降のTranslator APIを使います。外部の翻訳APIやDeepLには接続しません。初回はChromeが翻訳用の言語データを取得する場合があります。

翻訳元は日本語の授業資料を想定しています。スマートフォン・タブレット、Canvaの編集画面、画像だけのPDFには対応していません。ブラウザーや学校の管理設定によって利用できない場合があります。

番号・読み順・文字色の再現には限界があります。PDFの色は行・段落ごとの代表色を推定します。文中の一部だけの色分けには未対応です。PDFを手動で保存したり、翻訳サービスへアップロードしたりする操作は不要です。

## 開発・更新

Python 3とNode.js 20以降で、追加パッケージなしでビルド・テストできます。

```sh
python3 build-site.py
node --test canva-reading-panel.test.cjs classroom-pdf-panel.test.cjs canva-guide.test.cjs
```

`canva-reading-panel.user.js`が共通パネルの元コードです。PDF版は`classroom-pdf-source.js`を組み込み、`build-classroom-pdf-panel.py`で生成します。案内文は`classroom-pdf-guide.template.html`、Canva単独ガイドの翻訳は`canva-guide-locales/`で管理しています。

ビルドすると配布コード、各ガイド、GitHub Pagesのトップページ`index.html`が更新されます。PDF版や生成されたHTMLだけを直接変更すると、次のビルドで上書きされます。

## GitHub Pagesの公開設定

このフォルダーの中身をリポジトリの最上位に登録し、GitHubの「Settings → Pages」で次を設定します。

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

Save後、公開が完了するとPages設定画面に閲覧用URLが表示されます。独自ドメインの設定は不要です。

[GitHub公式の公開設定手順](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

このリポジトリには翻訳ツールと導入ガイドを収録し、授業で配布したPDFや学生の情報は含めていません。
