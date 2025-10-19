# GitHub API仕様書

## 概要

このドキュメントでは、Novel Writing Tool（tanus-inkwell）で使用するGitHub REST APIの詳細を定義します。

**使用ライブラリ**: [Octokit.js](https://github.com/octokit/octokit.js)
**APIバージョン**: GitHub REST API v3
**ベースURL**: `https://api.github.com`

-----

## 認証

### Personal Access Token（PAT）

#### トークンの作成手順（ユーザー向け）

1. GitHubにログイン
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. "Generate new token" → "Generate new token (classic)"
4. 設定:
   - **Note**: `Novel Writing Tool`
   - **Expiration**: `No expiration` または任意の期間
   - **Scopes**: ☑️ `repo`（Full control of private repositories）
5. "Generate token"をクリック
6. 生成されたトークン（`ghp_xxxxxxxxxxxx`）をコピー
7. アプリのログイン画面に貼り付け

#### 必要なスコープ

```
repo: Full control of private repositories
  ├─ repo:status
  ├─ repo_deployment
  ├─ public_repo
  ├─ repo:invite
  └─ security_events
```

**最小権限**: `repo`のみでOK（パブリック・プライベートリポジトリ両方アクセス可能）

#### トークンの保存

```typescript
// LocalStorageに保存
localStorage.setItem('github_token', token);

// 取得
const token = localStorage.getItem('github_token');
```

**セキュリティ上の注意**:
- HTTPS通信必須
- XSS対策（React標準の機能で基本的に保護される）
- トークンをコンソールに出力しない

#### トークンの検証

**エンドポイント**: `GET /user`

```typescript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: token,
  userAgent: 'NovelWritingTool/1.0.0',
});

try {
  const { data } = await octokit.users.getAuthenticated();
  console.log('Authenticated as:', data.login);
  return true;
} catch (error) {
  console.error('Invalid token:', error);
  return false;
}
```

**レスポンス（成功時）**:
```json
{
  "login": "username",
  "id": 12345,
  "avatar_url": "https://avatars.githubusercontent.com/u/12345",
  "name": "User Name",
  "email": "user@example.com"
}
```

**エラー（401）**:
```json
{
  "message": "Bad credentials",
  "documentation_url": "https://docs.github.com/rest"
}
```

-----

## API Rate Limit

### 制限

- **認証済み**: 5000 requests/hour
- **未認証**: 60 requests/hour

### レート制限の確認

全てのAPIレスポンスヘッダーに含まれる:

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1372700873 (UNIXタイムスタンプ)
```

### 実装例

```typescript
const response = await octokit.request('GET /user');
const remaining = response.headers['x-ratelimit-remaining'];
const resetTime = new Date(
  parseInt(response.headers['x-ratelimit-reset']) * 1000
);

if (remaining < 100) {
  console.warn(`API calls remaining: ${remaining}`);
  console.warn(`Resets at: ${resetTime}`);
}
```

### 対策（小規模リポジトリ前提）

- リポジトリは~50ファイルまで
- 初回ダウンロード: 約50-60 API calls
- プッシュ: 変更ファイル数分
- **想定**: 1日あたり200-300 calls程度

→ Rate Limitには十分余裕あり

-----

## 使用するAPIエンドポイント

### 1. ユーザー情報取得

**目的**: トークン検証、ユーザー情報表示

**エンドポイント**: `GET /user`

**Octokitメソッド**:
```typescript
const { data } = await octokit.users.getAuthenticated();
```

**レスポンス**:
```json
{
  "login": "username",
  "name": "User Name",
  "avatar_url": "https://avatars.githubusercontent.com/u/12345"
}
```

-----

### 2. リポジトリ一覧取得

**目的**: ホーム画面でリポジトリ一覧を表示

**エンドポイント**: `GET /user/repos`

**Octokitメソッド**:
```typescript
const { data } = await octokit.repos.listForAuthenticatedUser({
  per_page: 100,
  sort: 'updated', // 最終更新順
  type: 'all', // all, owner, public, private, member
});
```

**レスポンス**:
```json
[
  {
    "id": 123456,
    "name": "my-novel",
    "full_name": "username/my-novel",
    "private": true,
    "owner": {
      "login": "username"
    },
    "description": "My fantasy novel",
    "updated_at": "2025-01-15T10:30:00Z",
    "default_branch": "main"
  }
]
```

**使用するフィールド**:
- `name`: リポジトリ名
- `full_name`: "username/repo-name"
- `updated_at`: 最終更新日時
- `default_branch`: デフォルトブランチ名（`main` or `master`）

-----

### 3. リポジトリのファイルツリー取得

**目的**: リポジトリ選択時に全ファイル・フォルダ構造を取得

**エンドポイント**: `GET /repos/{owner}/{repo}/git/trees/{tree_sha}`

**Octokitメソッド**:
```typescript
const { data } = await octokit.git.getTree({
  owner: 'username',
  repo: 'my-novel',
  tree_sha: 'main', // or 'master'
  recursive: '1', // 再帰的に全ファイル取得
});
```

**レスポンス**:
```json
{
  "sha": "abc123...",
  "tree": [
    {
      "path": "README.md",
      "mode": "100644",
      "type": "blob",
      "sha": "def456...",
      "size": 1234
    },
    {
      "path": "chapters",
      "mode": "040000",
      "type": "tree",
      "sha": "ghi789..."
    },
    {
      "path": "chapters/chapter-01.md",
      "mode": "100644",
      "type": "blob",
      "sha": "jkl012...",
      "size": 5678
    }
  ]
}
```

**フィールド説明**:
- `type`: `blob`（ファイル）or `tree`（ディレクトリ）
- `path`: ファイルパス
- `sha`: Git SHA（後で内容取得・更新時に使用）
- `size`: ファイルサイズ（bytes）

**フィルタリング**:
```typescript
const files = data.tree.filter((item) => item.type === 'blob');
const dirs = data.tree.filter((item) => item.type === 'tree');
```

-----

### 4. ファイル内容取得

**目的**: ファイルの中身を取得してIndexedDBに保存

**エンドポイント**: `GET /repos/{owner}/{repo}/contents/{path}`

**Octokitメソッド**:
```typescript
const { data } = await octokit.repos.getContent({
  owner: 'username',
  repo: 'my-novel',
  path: 'chapters/chapter-01.md',
});
```

**レスポンス**:
```json
{
  "name": "chapter-01.md",
  "path": "chapters/chapter-01.md",
  "sha": "abc123...",
  "size": 5678,
  "content": "IyBDaGFwdGVyIDEKCkl0IHdhcyBhIGRhcmsgYW5kIHN0b3JteSBuaWdodC4uLg==",
  "encoding": "base64"
}
```

**デコード**:
```typescript
const content = Buffer.from(data.content, 'base64').toString('utf-8');
// または
const content = atob(data.content); // ブラウザ環境
```

**TypeScriptの型**:
```typescript
interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string; // base64エンコード済み
  encoding: 'base64';
}
```

-----

### 5. ファイル作成

**目的**: 新規ファイルをGitHubに作成

**エンドポイント**: `PUT /repos/{owner}/{repo}/contents/{path}`

**Octokitメソッド**:
```typescript
const { data } = await octokit.repos.createOrUpdateFileContents({
  owner: 'username',
  repo: 'my-novel',
  path: 'chapters/chapter-03.md',
  message: 'Create chapter 3',
  content: Buffer.from('# Chapter 3\n\n...').toString('base64'),
  // shaは不要（新規作成のため）
});
```

**リクエストボディ**:
```json
{
  "message": "Create chapter 3",
  "content": "IyBDaGFwdGVyIDMKCi4uLg=="
}
```

**レスポンス**:
```json
{
  "content": {
    "name": "chapter-03.md",
    "path": "chapters/chapter-03.md",
    "sha": "new123...",
    "size": 1234
  },
  "commit": {
    "sha": "commit456...",
    "message": "Create chapter 3"
  }
}
```

**重要**: 新しいSHA（`data.content.sha`）をIndexedDBに保存

-----

### 6. ファイル更新

**目的**: 既存ファイルの内容を更新

**エンドポイント**: `PUT /repos/{owner}/{repo}/contents/{path}`

**Octokitメソッド**:
```typescript
const { data } = await octokit.repos.createOrUpdateFileContents({
  owner: 'username',
  repo: 'my-novel',
  path: 'chapters/chapter-01.md',
  message: 'Update chapter 1',
  content: Buffer.from(newContent).toString('base64'),
  sha: currentSha, // ⚠️ 必須（楽観的ロック）
});
```

**リクエストボディ**:
```json
{
  "message": "Update chapter 1",
  "content": "IyBDaGFwdGVyIDEKCkl0IHdhcyBhIGRhcmsuLi4=",
  "sha": "abc123..."
}
```

**楽観的ロック**:
- `sha`が最新でない場合、409エラー（コンフリクト）
- エラー時は最新をプルしてから再試行

**レスポンス**:
```json
{
  "content": {
    "sha": "updated789..."
  }
}
```

**重要**: 新しいSHA（`data.content.sha`）をIndexedDBに保存

-----

### 7. ファイル削除

**目的**: ファイルをGitHubから削除

**エンドポイント**: `DELETE /repos/{owner}/{repo}/contents/{path}`

**Octokitメソッド**:
```typescript
const { data } = await octokit.repos.deleteFile({
  owner: 'username',
  repo: 'my-novel',
  path: 'chapters/chapter-02.md',
  message: 'Delete chapter 2',
  sha: currentSha, // ⚠️ 必須
});
```

**リクエストボディ**:
```json
{
  "message": "Delete chapter 2",
  "sha": "abc123..."
}
```

**レスポンス**:
```json
{
  "commit": {
    "sha": "commit123...",
    "message": "Delete chapter 2"
  }
}
```

-----

## エラーハンドリング

### 主要なHTTPステータスコード

| コード | 意味 | 原因 | 対処 |
|--------|------|------|------|
| 200 | OK | 成功 | - |
| 201 | Created | ファイル作成成功 | - |
| 401 | Unauthorized | トークンが無効 | 再ログイン促す |
| 403 | Forbidden | Rate Limit超過 | リセット時刻を表示、待機 |
| 404 | Not Found | リポジトリ/ファイルが存在しない | エラーメッセージ表示 |
| 409 | Conflict | SHAが最新でない | プルして再試行 |
| 422 | Unprocessable Entity | リクエストパラメータが不正 | バリデーションエラー表示 |

### エラーレスポンスの構造

```json
{
  "message": "Bad credentials",
  "documentation_url": "https://docs.github.com/rest"
}
```

### 実装例

```typescript
try {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
  });
  return data;
} catch (error: any) {
  if (error.status === 401) {
    // 認証エラー
    alert('トークンの有効期限が切れました。再ログインしてください。');
    // ログアウト処理
  } else if (error.status === 403) {
    // Rate Limit
    const resetTime = new Date(
      parseInt(error.response.headers['x-ratelimit-reset']) * 1000
    );
    alert(`API制限に達しました。${resetTime}まで待ってください。`);
  } else if (error.status === 404) {
    // Not Found
    alert('ファイルが見つかりません。');
  } else if (error.status === 409) {
    // Conflict
    alert('コンフリクトが発生しました。最新の変更をプルしてください。');
  } else {
    // その他のエラー
    console.error('Unexpected error:', error);
    alert('エラーが発生しました。');
  }
}
```

-----

## 実装パターン

### パターン1: 初回リポジトリダウンロード

```typescript
async function downloadRepository(owner: string, repo: string) {
  // 1. ツリー取得
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: 'main',
    recursive: '1',
  });

  // 2. ファイルのみフィルタ
  const files = tree.tree.filter((item) => item.type === 'blob');

  // 3. 各ファイルの内容を取得
  for (const file of files) {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: file.path,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    // 4. IndexedDBに保存
    await db.files.add({
      id: `${owner}/${repo}/${file.path}`,
      repoId: `${owner}/${repo}`,
      path: file.path,
      content,
      lastModified: new Date().toISOString(),
      isDirty: false,
      githubSha: data.sha,
      size: data.size,
    });
  }
}
```

### パターン2: プッシュ（変更ファイルのみ）

```typescript
async function pushChanges(
  owner: string,
  repo: string,
  message: string
) {
  // 1. 変更ファイルを取得
  const dirtyFiles = await db.files
    .where('isDirty')
    .equals(true)
    .toArray();

  // 2. 各ファイルをプッシュ
  for (const file of dirtyFiles) {
    try {
      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message,
        content: Buffer.from(file.content).toString('base64'),
        sha: file.githubSha, // 既存ファイルの場合
      });

      // 3. IndexedDB更新
      await db.files.update(file.id, {
        isDirty: false,
        githubSha: data.content.sha,
      });
    } catch (error: any) {
      if (error.status === 409) {
        console.error(`Conflict on ${file.path}`);
        // コンフリクト処理
      }
      throw error;
    }
  }
}
```

### パターン3: プル（GitHub → ローカル）

```typescript
async function pullLatest(owner: string, repo: string) {
  // 1. 最新のツリー取得
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: 'main',
    recursive: '1',
  });

  const files = tree.tree.filter((item) => item.type === 'blob');

  // 2. 各ファイルのSHAを比較
  for (const file of files) {
    const localFile = await db.files.get(
      `${owner}/${repo}/${file.path}`
    );

    if (!localFile || localFile.githubSha !== file.sha) {
      // 3. 差分があれば取得
      if (localFile?.isDirty) {
        // コンフリクト警告
        console.warn(`Conflict: ${file.path}`);
        continue;
      }

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
      });

      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      // 4. IndexedDB更新
      await db.files.put({
        id: `${owner}/${repo}/${file.path}`,
        repoId: `${owner}/${repo}`,
        path: file.path,
        content,
        lastModified: new Date().toISOString(),
        isDirty: false,
        githubSha: data.sha,
        size: data.size,
      });
    }
  }
}
```

-----

## パフォーマンス最適化

### 並列リクエスト

```typescript
// ❌ 遅い（逐次処理）
for (const file of files) {
  await downloadFile(file);
}

// ✅ 速い（並列処理）
await Promise.all(files.map((file) => downloadFile(file)));

// ⚠️ ただし、Rate Limitに注意
// 10ファイルずつバッチ処理
const BATCH_SIZE = 10;
for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batch = files.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map((file) => downloadFile(file)));
}
```

### キャッシュ戦略

- リポジトリ一覧: 5分間キャッシュ
- ファイルツリー: IndexedDBに保存、プル時のみ更新
- ファイル内容: IndexedDBに保存、永続化

-----

## セキュリティ考慮事項

### トークンの扱い

- ✅ LocalStorageに保存（XSS対策済み前提）
- ✅ HTTPS通信必須
- ❌ コンソールに出力しない
- ❌ URLパラメータに含めない
- ❌ ログに残さない

### データ検証

```typescript
// Base64デコード前にチェック
if (data.encoding !== 'base64') {
  throw new Error('Unexpected encoding');
}

// ファイルサイズチェック（1MB以上は警告）
if (data.size > 1024 * 1024) {
  console.warn(`Large file: ${data.path} (${data.size} bytes)`);
}
```

-----

## 参考リンク

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Octokit.js Documentation](https://github.com/octokit/octokit.js)
- [Personal Access Token 作成方法](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
