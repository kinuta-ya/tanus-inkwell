# GitHub連携物書きツール

iPhoneで使える、GitHubと連携したMarkdown執筆アプリ（PWA）

## プロジェクト概要

### 目的

自分のiPhoneで使うための、GitHubと連携できる物書きツールを作成する

### コンセプト

- **1リポジトリ = 1作品** として管理
- オフラインで執筆、オンライン時にプッシュ
- Nolaのような構造化された執筆環境（世界観、キャラクター、用語集など）

## 現状のワークフロー

```
[iPhone] → Terminus → AWS EC2 → Claude Code → GitHub
                                                 ↓
[iPhone] ← Working Copy ← GitHub (Pull & Read only)
```

**課題**: iPhoneでの編集→プッシュができない

## 目指すワークフロー

```
[iPhone] このアプリ ← GitHub (Pull & 編集 & Push)
         ├─ オフライン編集可能
         └─ ネット接続時にPush
```

## 技術スタック

### フロントエンド

- **フレームワーク**: React + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **エディタ**: CodeMirror 6
- **Markdown処理**: Marked.js

### GitHub連携

- **APIライブラリ**: Octokit.js
- **認証**: GitHub OAuth Apps
- **必要なスコープ**: `repo`

### データ管理

- **ローカルストレージ**: IndexedDB（全ファイルキャッシュ）
- **設定保存**: LocalStorage

### PWA機能

- Service Worker（オフライン対応）
- Web App Manifest（ホーム画面追加）

### ホスティング

- Vercel（推奨）

## MVP機能（フェーズ1）

### 1. リポジトリ管理

- [ ] GitHub OAuth認証
- [ ] リポジトリ一覧表示
- [ ] リポジトリ選択（初回ダウンロード）

### 2. ファイル管理

- [ ] ディレクトリツリー表示
- [ ] ファイル一覧
- [ ] 新規ファイル作成
- [ ] ファイル名変更・削除

### 3. エディタ

- [ ] Markdownエディタ
- [ ] リアルタイムプレビュー
- [ ] 自動保存（IndexedDB）
- [ ] 完全オフライン動作

### 4. 同期機能

- [ ] 手動プル（GitHub → ローカル）
- [ ] 手動プッシュ（ローカル → GitHub）
- [ ] 変更ファイル一覧表示
- [ ] コミットメッセージ入力
- [ ] 未プッシュファイルのバッジ表示

### 5. PWA

- [ ] ホーム画面に追加可能
- [ ] オフライン動作
- [ ] モバイル最適化UI

## 典型的なファイル構造

```
my-novel/
├── world/              # 世界観
│   ├── history.md
│   └── magic-system.md
├── characters/         # キャラクターシート
│   ├── protagonist.md
│   └── antagonist.md
├── terms/             # 用語集
│   └── glossary.md
├── chapters/          # 本編
│   ├── chapter-01.md
│   └── chapter-02.md
└── notes/            # メモ
```

## セットアップ手順

### 1. GitHub OAuth Appの作成

1. GitHub Settings → Developer settings → OAuth Apps
2. New OAuth App
3. 設定:
   - Application name: `Novel Writing Tool`
   - Homepage URL: `https://your-app.vercel.app`
   - Authorization callback URL: `https://your-app.vercel.app/callback`
4. Client IDとClient Secretを取得

### 2. 開発環境のセットアップ

```bash
npm create vite@latest novel-writing-tool -- --template react-ts
cd novel-writing-tool
npm install
npm install @tailwindcss/typography tailwindcss postcss autoprefixer
npm install @uiw/react-codemirror @codemirror/lang-markdown
npm install octokit marked dexie
npx tailwindcss init -p
```

### 3. 環境変数の設定

`.env.local`を作成:

```
VITE_GITHUB_CLIENT_ID=your_client_id
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/callback
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## 次のステップ

1. プロジェクト初期化
2. GitHub OAuth認証の実装
3. IndexedDB設計とセットアップ
4. 基本的なUI構築
5. ファイル同期ロジックの実装

## 参考リンク

- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)
- [CodeMirror 6](https://codemirror.net/)
- [Dexie.js](https://dexie.org/) (IndexedDB wrapper)

<!-- CI test: trigger status check -->
