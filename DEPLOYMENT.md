# デプロイ手順

## GitHub ActionsでEC2へ自動デプロイ

このプロジェクトは、mainブランチへのpush時に自動的にAWS EC2へデプロイされます。

### 初回設定

#### 1. GitHub Secretsの設定

GitHubリポジトリの設定でSecrets（シークレット）を追加してください：

1. GitHubリポジトリページを開く
2. **Settings** → **Secrets and variables** → **Actions** をクリック
3. **New repository secret** をクリックして以下を追加：

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `EC2_HOST` | EC2インスタンスのIPアドレスまたはドメイン | `12.34.56.78` または `example.com` |
| `EC2_USER` | SSH接続ユーザー名 | `ubuntu` または `ec2-user` |
| `EC2_SSH_KEY` | SSH秘密鍵の内容（全体をコピー） | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `DEPLOY_PATH` | デプロイ先のパス | `/var/www/html` または `/home/ubuntu/app` |

#### 2. SSH秘密鍵の取得方法

EC2に接続するためのSSH秘密鍵（.pemファイル）の内容を取得：

```bash
# ローカルPCで実行
cat ~/.ssh/your-ec2-key.pem
```

**重要:** 秘密鍵の内容全体（`-----BEGIN...` から `-----END...` まで）をコピーしてください。

#### 3. EC2側の準備

EC2インスタンスでデプロイ先ディレクトリの準備：

```bash
# EC2にSSH接続して実行
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/html
chmod 755 /var/www/html
```

#### 4. Webサーバー設定（Nginx）

Nginxを使用している場合の設定例：

```nginx
# /etc/nginx/sites-available/tanus-inkwell
server {
    listen 80;
    server_name your-domain.com;  # またはIPアドレス

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静的ファイルのキャッシュ設定
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

設定を有効化：

```bash
sudo ln -s /etc/nginx/sites-available/tanus-inkwell /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### デプロイ方法

1. コードを修正
2. mainブランチにpush（または他のブランチからmainへマージ）
3. GitHub Actionsが自動的に実行される
4. **Actions**タブで進行状況を確認

```bash
git add .
git commit -m "feat: 新機能を追加"
git push origin main
```

### デプロイの確認

1. GitHubリポジトリの**Actions**タブを開く
2. 最新のワークフロー実行を確認
3. すべて緑色のチェックマークなら成功
4. ブラウザでEC2のURLにアクセスして動作確認

### トラブルシューティング

#### デプロイが失敗する場合

**SSH接続エラー:**
- EC2のセキュリティグループでGitHub ActionsのIPからのSSH（ポート22）を許可
- `EC2_SSH_KEY`の改行が正しく保存されているか確認

**権限エラー:**
```bash
# EC2で実行
sudo chown -R $USER:$USER /var/www/html
chmod 755 /var/www/html
```

**known_hostsエラー:**
- ワークフローファイルに`ssh-keyscan`が含まれているか確認

#### 手動デプロイ

GitHub Actionsを使わずに手動でデプロイする場合：

```bash
# ローカルPCで実行
npm run build
scp -r dist/* user@ec2-host:/var/www/html/
```

### セキュリティ上の注意

- SSH秘密鍵は絶対にコードにコミットしない
- GitHub Secretsは暗号化されて保存される
- EC2のセキュリティグループで不要なポートを開放しない
- 本番環境ではHTTPS（SSL/TLS）を設定することを推奨

### 開発環境

開発サーバーを起動する場合：

```bash
npm run dev
# http://localhost:5173 でアクセス
```

### 本番ビルドのテスト

デプロイ前にローカルで本番ビルドをテスト：

```bash
npm run build
npm run preview
# http://localhost:4173 でアクセス
```
