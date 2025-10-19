# 要件定義書

## プロジェクトの背景

### 現状の課題

- iPhoneのWorking Copyでは閲覧のみ可能
- 編集・プッシュができない
- Claude Codeで生成したコンテンツを、iPhoneで加筆修正したい

### 解決したいこと

iPhone上で：

1. GitHubから作品ファイルをダウンロード
2. オフラインで編集
3. オンライン時にGitHubへプッシュ

### 将来的なビジョン

このアプリ上でClaude Codeを動かし、AIエージェントとして執筆支援を受ける

-----

## 機能要件

### 1. リポジトリ管理

#### 1.1 認証

- GitHub OAuthによるログイン
- Personal Access Token対応（代替手段）
- トークンの安全な保存（LocalStorage）

#### 1.2 リポジトリ操作

- 自分のリポジトリ一覧取得
- リポジトリ選択（1リポジトリ = 1作品）
- 複数リポジトリの切り替え

#### 1.3 初回ダウンロード

- リポジトリ選択時に全ファイルをIndexedDBに保存
- ディレクトリ構造を保持
- プログレス表示

### 2. ファイル管理

#### 2.1 ファイル一覧表示

- ディレクトリツリー形式
- フォルダの展開・折りたたみ
- ファイルのアイコン表示（.md, .txt等）

#### 2.2 ファイル操作

- 新規ファイル作成
- ファイル名変更
- ファイル削除
- フォルダ作成

#### 2.3 状態表示

- 未プッシュファイルのバッジ表示
- 最終編集日時
- ファイルサイズ

### 3. エディタ機能

#### 3.1 編集機能

- Markdownシンタックスハイライト
- 行番号表示
- タブ/スペース設定
- 検索・置換（将来）

#### 3.2 プレビュー

- リアルタイムMarkdownレンダリング
- 編集モード/プレビューモード切り替え
- 分割表示（将来）

#### 3.3 自動保存

- 30秒ごとにIndexedDBへ自動保存
- 保存状態の表示（💾アイコン）
- 保存失敗時のエラー表示

### 4. 同期機能

#### 4.1 プル（GitHub → ローカル）

- 手動プルボタン
- リポジトリ全体の最新状態を取得
- ローカル変更との競合検出
- 競合時の確認ダイアログ（上書き or キャンセル）

#### 4.2 プッシュ（ローカル → GitHub）

- 変更ファイルの一覧表示
- コミットメッセージ入力
- まとめてプッシュ
- プッシュ成功/失敗の通知

#### 4.3 同期状態の管理

- ファイルごとの状態管理
  - 同期済み
  - ローカル変更あり
  - GitHubに新規ファイル
- 同期状態のバッジ表示

### 5. オフライン対応

#### 5.1 完全オフライン動作

- 全ファイルをIndexedDBにキャッシュ
- オフラインでの編集・保存
- オンライン復帰時の同期

#### 5.2 Service Worker

- アプリケーションのキャッシュ
- オフライン時のフォールバック画面

### 6. PWA機能

#### 6.1 インストール

- ホーム画面に追加
- アプリアイコン
- スプラッシュスクリーン

#### 6.2 モバイル最適化

- タッチ操作対応
- スワイプジェスチャー
- タップ領域の最適化
- iOS SafariのUI対応

-----

## 非機能要件

### パフォーマンス

- ファイル読み込み: 1秒以内
- エディタの入力遅延: 50ms以内
- プッシュ処理: ファイル数に応じて適切な時間

### セキュリティ

- GitHub Tokenの安全な保存
- HTTPS通信の強制
- XSS対策

### 可用性

- オフライン動作
- データ損失の防止（自動保存）

### 互換性

- iOS Safari 14以降
- PWA対応ブラウザ

-----

## データ構造

### IndexedDB Schema

#### Files Table

```typescript
{
  id: string,              // "repo/path/to/file.md"
  repoId: string,          // "user/repo-name"
  path: string,            // "chapters/chapter-01.md"
  content: string,         // ファイル内容
  lastModified: string,    // ISO 8601形式
  isDirty: boolean,        // ローカル変更あり
  githubSha: string,       // GitHub上のコミットSHA
  size: number             // バイト数
}
```

#### Repositories Table

```typescript
{
  id: string,              // "user/repo-name"
  name: string,            // "my-novel"
  fullName: string,        // "user/my-novel"
  lastSync: string,        // 最終同期日時
  fileCount: number        // ファイル数
}
```

### LocalStorage

```typescript
{
  githubToken: string,
  currentRepoId: string,
  settings: {
    theme: "light" | "dark",
    fontSize: number,
    autoSave: boolean
  }
}
```

-----

## 画面遷移

```
ログイン画面
    ↓
ホーム画面（リポジトリ一覧）
    ↓
ファイル一覧画面
    ↓
エディタ画面
    ↑↓
プレビュー画面
```

-----

## 制約事項

### 技術的制約

- iOS SafariのIndexedDB容量制限
- Service Workerの制限
- GitHub API Rate Limit（認証済み: 5000req/hour）

### スコープ外（将来機能）

- ブランチ管理
- マージ機能
- Pull Request作成
- 複数人での共同編集
- リアルタイム同期
- 画像アップロード
- AIエージェント統合（Claude Code）

-----

## 開発フェーズ

### フェーズ1: MVP（4-6週間）

- GitHub認証
- リポジトリ選択
- ファイル一覧表示
- 基本的なエディタ
- 手動プル/プッシュ

### フェーズ2: 使い勝手向上（2-3週間）

- オフライン対応
- 自動保存
- PWA対応
- UI/UXの改善

### フェーズ3: 高度な機能（将来）

- 検索・置換
- テンプレート機能
- 執筆統計
- ダークモード
