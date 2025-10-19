# システムアーキテクチャ

## 全体構成

```
┌─────────────────────────────────────────┐
│           iPhone (PWA)                  │
│  ┌───────────────────────────────────┐  │
│  │      React Application            │  │
│  │  ┌──────────┐  ┌──────────────┐  │  │
│  │  │   UI     │  │   Editor     │  │  │
│  │  │Components│  │ (CodeMirror) │  │  │
│  │  └──────────┘  └──────────────┘  │  │
│  │         ↓              ↓          │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │    State Management         │ │  │
│  │  │    (React Context/Zustand)  │ │  │
│  │  └─────────────────────────────┘ │  │
│  │         ↓              ↓          │  │
│  │  ┌──────────┐  ┌──────────────┐  │  │
│  │  │IndexedDB │  │ LocalStorage │  │  │
│  │  │(Dexie)   │  │  (Settings)  │  │  │
│  │  └──────────┘  └──────────────┘  │  │
│  └───────────────────────────────────┘  │
│                    ↕                    │
│  ┌───────────────────────────────────┐  │
│  │      Service Worker               │  │
│  │   (Offline Cache & Sync)          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕ HTTPS
┌─────────────────────────────────────────┐
│          GitHub REST API                │
│   (Octokit.js + OAuth)                  │
└─────────────────────────────────────────┘
```

-----

## レイヤー構成

### 1. Presentation Layer (UI)

#### コンポーネント構成

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── OAuthCallback.tsx
│   ├── repository/
│   │   ├── RepositoryList.tsx
│   │   └── RepositoryCard.tsx
│   ├── file/
│   │   ├── FileTree.tsx
│   │   ├── FileItem.tsx
│   │   └── FileActions.tsx
│   ├── editor/
│   │   ├── MarkdownEditor.tsx
│   │   ├── MarkdownPreview.tsx
│   │   └── EditorToolbar.tsx
│   └── sync/
│       ├── SyncButton.tsx
│       ├── PushDialog.tsx
│       └── ConflictResolver.tsx
├── layouts/
│   ├── AppLayout.tsx
│   └── EditorLayout.tsx
└── pages/
    ├── HomePage.tsx
    ├── FileListPage.tsx
    └── EditorPage.tsx
```

#### 主要コンポーネント

**LoginScreen**

- GitHub OAuth認証フロー
- Personal Access Token入力（代替手段）

**RepositoryList**

- リポジトリ一覧表示
- 検索・フィルタ
- 同期状態表示

**FileTree**

- ディレクトリツリー構造
- 展開/折りたたみ
- ファイル選択

**MarkdownEditor**

- CodeMirror 6統合
- シンタックスハイライト
- 自動保存トリガー

**SyncButton**

- プル/プッシュボタン
- 同期状態バッジ
- 進行状況表示

-----

### 2. Business Logic Layer

#### State Management

**選択肢**: React Context API または Zustand

**推奨**: Zustand（シンプルで高速）

```typescript
// stores/appStore.ts
interface AppState {
  // 認証
  isAuthenticated: boolean;
  githubToken: string | null;

  // リポジトリ
  repositories: Repository[];
  currentRepo: Repository | null;

  // ファイル
  files: FileNode[];
  currentFile: FileData | null;

  // 同期
  syncStatus: 'idle' | 'syncing' | 'error';
  dirtyFiles: string[];

  // アクション
  setToken: (token: string) => void;
  selectRepository: (repo: Repository) => Promise<void>;
  loadFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  pullFromGitHub: () => Promise<void>;
  pushToGitHub: (message: string) => Promise<void>;
}
```

#### Services

```
src/services/
├── github/
│   ├── auth.service.ts      # OAuth & Token管理
│   ├── repository.service.ts # リポジトリ操作
│   └── file.service.ts       # ファイル操作
├── storage/
│   ├── indexeddb.service.ts  # IndexedDB操作
│   └── localstorage.service.ts # 設定保存
└── sync/
    └── sync.service.ts       # 同期ロジック
```

**github/auth.service.ts**

```typescript
export class GitHubAuthService {
  async login(): Promise<string>;
  async logout(): Promise<void>;
  getStoredToken(): string | null;
  validateToken(token: string): Promise<boolean>;
}
```

**github/repository.service.ts**

```typescript
export class GitHubRepositoryService {
  async listRepositories(): Promise<Repository[]>;
  async getRepositoryTree(owner: string, repo: string): Promise<FileNode[]>;
  async getFileContent(owner: string, repo: string, path: string): Promise<string>;
}
```

**github/file.service.ts**

```typescript
export class GitHubFileService {
  async getFile(owner: string, repo: string, path: string): Promise<GitHubFile>;
  async updateFile(owner: string, repo: string, path: string, content: string, sha: string): Promise<void>;
  async createFile(owner: string, repo: string, path: string, content: string): Promise<void>;
  async deleteFile(owner: string, repo: string, path: string, sha: string): Promise<void>;
}
```

**sync/sync.service.ts**

```typescript
export class SyncService {
  async pullAll(repoId: string): Promise<void>;
  async pushChanges(repoId: string, files: FileData[], message: string): Promise<void>;
  async detectConflicts(repoId: string): Promise<Conflict[]>;
  resolveConflict(conflict: Conflict, resolution: 'local' | 'remote'): Promise<void>;
}
```

-----

### 3. Data Layer

#### IndexedDB Schema (Dexie)

```typescript
// db/schema.ts
import Dexie, { Table } from 'dexie';

export interface Repository {
  id: string;              // "user/repo-name"
  name: string;
  fullName: string;
  lastSync: string;
  fileCount: number;
}

export interface FileData {
  id: string;              // "user/repo-name/path/to/file.md"
  repoId: string;
  path: string;
  content: string;
  lastModified: string;
  isDirty: boolean;        // ローカル変更あり
  githubSha: string;       // GitHub上のSHA
  size: number;
}

export class AppDatabase extends Dexie {
  repositories!: Table<Repository>;
  files!: Table<FileData>;

  constructor() {
    super('NovelWritingToolDB');
    this.version(1).stores({
      repositories: 'id, name, lastSync',
      files: 'id, repoId, path, isDirty'
    });
  }
}

export const db = new AppDatabase();
```

#### LocalStorage

```typescript
// utils/storage.ts
export const storage = {
  // トークン
  getToken: (): string | null => localStorage.getItem('github_token'),
  setToken: (token: string) => localStorage.setItem('github_token', token),
  removeToken: () => localStorage.removeItem('github_token'),

  // 設定
  getSettings: (): AppSettings => JSON.parse(localStorage.getItem('settings') || '{}'),
  setSettings: (settings: AppSettings) => localStorage.setItem('settings', JSON.stringify(settings)),

  // 最後に開いたリポジトリ
  getLastRepo: (): string | null => localStorage.getItem('last_repo'),
  setLastRepo: (repoId: string) => localStorage.setItem('last_repo', repoId),
};
```

-----

### 4. Network Layer

#### GitHub API Client (Octokit)

```typescript
// utils/octokit.ts
import { Octokit } from '@octokit/rest';

export const createOctokitClient = (token: string): Octokit => {
  return new Octokit({
    auth: token,
    userAgent: 'NovelWritingTool/1.0.0',
  });
};
```

#### API呼び出しの例

**リポジトリ一覧取得**

```typescript
const repos = await octokit.repos.listForAuthenticatedUser({
  per_page: 100,
  sort: 'updated',
});
```

**ファイル内容取得**

```typescript
const file = await octokit.repos.getContent({
  owner,
  repo,
  path: 'chapters/chapter-01.md',
});
```

**ファイル更新**

```typescript
await octokit.repos.createOrUpdateFileContents({
  owner,
  repo,
  path: 'chapters/chapter-01.md',
  message: 'Update chapter 1',
  content: Buffer.from(newContent).toString('base64'),
  sha: currentSha, // 上書き保護
});
```

-----

## 主要な処理フロー

### 1. 初回リポジトリ選択フロー

```
ユーザーがリポジトリを選択
    ↓
GitHub APIで全ファイルのツリーを取得
    ↓
各ファイルの内容をGitHub APIで取得
    ↓
IndexedDBに保存
    ↓
ファイル一覧画面を表示
```

### 2. ファイル編集フロー

```
ユーザーがファイルを選択
    ↓
IndexedDBからファイルを読み込み
    ↓
エディタに表示
    ↓
ユーザーが編集
    ↓
30秒ごとに自動保存（IndexedDB）
    ↓
isDirty = true に設定
```

### 3. プッシュフロー

```
ユーザーがプッシュボタンをクリック
    ↓
isDirty = true のファイルを検出
    ↓
変更ファイル一覧を表示
    ↓
コミットメッセージを入力
    ↓
各ファイルをGitHub APIで更新
    ↓
成功したらisDirty = false に設定
    ↓
githubShaを更新
```

### 4. プルフロー

```
ユーザーがプルボタンをクリック
    ↓
GitHub APIで最新のツリーを取得
    ↓
ローカルとGitHubのSHAを比較
    ↓
差分のあるファイルを検出
    ↓
isDirty = true のファイルがある場合は警告
    ↓
ユーザーが確認後、最新ファイルを取得
    ↓
IndexedDBを更新
```

-----

## PWA設定

### manifest.json

```json
{
  "name": "Novel Writing Tool",
  "short_name": "NovWriter",
  "description": "GitHub連携物書きツール",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

```typescript
// service-worker.ts
const CACHE_NAME = 'novel-writing-tool-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

-----

## セキュリティ考慮事項

### 1. トークン管理

- LocalStorageに保存（XSS対策が前提）
- HTTPS通信必須
- トークンの有効期限チェック

### 2. API Rate Limit

- 認証済み: 5000 req/hour
- レスポンスヘッダーで残り回数を監視
- 制限接近時の警告表示

### 3. データ整合性

- GitHub SHA による楽観的ロック
- コンフリクト検出と解決UI

-----

## パフォーマンス最適化

### 1. 遅延読み込み

- ファイルツリーは必要な階層のみ展開
- エディタは選択時に読み込み

### 2. キャッシュ戦略

- IndexedDBでオフライン対応
- Service Workerでアプリ本体をキャッシュ

### 3. バッチ処理

- プッシュ時は複数ファイルをまとめて処理
- GitHub APIの並列リクエスト制限に注意

-----

## 開発環境

### 必要なツール

- Node.js 18+
- npm または yarn
- Git
- モダンブラウザ（Chrome/Safari）

### 推奨VS Code拡張

- ESLint
- Prettier
- TypeScript
- Tailwind CSS IntelliSense
