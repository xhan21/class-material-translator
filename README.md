# 授業資料 翻訳ツール

**[導入ガイドを開く — 使い方とコードのコピーはこちら](https://xhan21.github.io/class-material-translator/)**

学生への案内には、上の公開ページのリンクを共有してください。Canva版・PDF版それぞれの導入手順と、コードのコピーボタンがあります。

[韓](https://www.i-u.ac.jp/academics/faculty/hanxu/)が担当する授業向けに試運用している、Canva資料とClassroomで配布されたPDFの翻訳ツールです。

## Tampermonkeyに貼り付けるコード

| 利用する資料 | 配布コード |
| --- | --- |
| Canvaの閲覧用資料 | [Canva版](canva-reading-panel.user.js) |
| Classroom・Google DriveのPDF | [PDF版](classroom-pdf-reading-panel.user.js) |

導入ガイドの「Canva版のコードをコピー」または「PDF版のコードをコピー」を押し、Tampermonkeyに貼り付けて保存してください。両方使う場合は、別々のスクリプトとして登録します。

## 作成方法と翻訳について

コードは、韓の指示のもと、助手として利用しているChatGPTが生成・修正しています。

資料の翻訳には、[Google Chromeの内蔵翻訳機能（Translator API）](https://developer.chrome.com/docs/ai/translator-api)を利用しています。

訳文は授業資料を理解するための補助であり、正確性を保証するものではありません。機械翻訳による誤訳や、文字の読み取り・読み順による抜けや誤りが生じる場合があります。専門用語や課題の指示など、重要な内容は原文と照らし合わせ、不明な場合は担当教員に確認してください。

公開ページと2本の配布コード、簡単な案内、公開に必要な設定ファイルを置いています。
