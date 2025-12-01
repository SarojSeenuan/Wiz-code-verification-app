# 手動セットアップガイド

本ガイドでは、Wiz Code検証環境を手動でセットアップする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [GitHub環境のセットアップ](#github環境のセットアップ)
3. [Wiz認証情報の取得と設定](#wiz認証情報の取得と設定)
4. [AWS認証情報の取得と設定](#aws認証情報の取得と設定)
5. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
6. [データベースのセットアップ](#データベースのセットアップ)
7. [動作確認](#動作確認)

---

## 前提条件

### 必須アカウント

- **GitHub**: リポジトリ作成権限を持つアカウント
- **Wiz**: テナントへのアクセス権限（Service AccountまたはUser）
- **AWS**: ECS/EKS環境を構築できる権限を持つアカウント

### 必須ツール

以下のツールをインストールしてください：

```bash
# バージョン確認コマンド
node --version      # v18.x 以上
npm --version       # v9.x 以上
git --version       # v2.x 以上
docker --version    # v20.x 以上
aws --version       # AWS CLI v2.x 以上
terraform --version # v1.6.x 以上
```

**インストール方法**:
- Node.js: https://nodejs.org/
- Git: https://git-scm.com/
- Docker Desktop: https://www.docker.com/products/docker-desktop
- AWS CLI: https://aws.amazon.com/cli/
- Terraform: https://www.terraform.io/downloads

---

## GitHub環境のセットアップ

### 1. リポジトリの作成

#### オプションA: 既存リポジトリをフォーク（推奨）

```bash
# GitHubでこのリポジトリをフォーク
# https://github.com/your-org/WizCodeVerification

# ローカルにクローン
git clone https://github.com/YOUR_USERNAME/WizCodeVerification.git
cd WizCodeVerification
```

#### オプションB: 新規リポジトリを作成

```bash
# 新しいリポジトリを作成
gh repo create wiz-code-verification --public

# このディレクトリの内容をプッシュ
cd WizCodeVerification
git init
git add .
git commit -m "Initial commit: Wiz Code verification project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wiz-code-verification.git
git push -u origin main
```

### 2. ブランチ戦略の設定（検証の繰り返し実行用）

Wiz検証を繰り返し実行できるようにブランチ戦略を設定します：

```bash
# 保護ブランチの設定
# 1. GitHubリポジトリ → Settings → Branches
# 2. "Add rule" をクリック
# 3. Branch name pattern: "main"
# 4. 以下を有効化：
#    - Require pull request reviews before merging
#    - Require status checks to pass before merging

# 検証用ブランチの作成
git checkout -b feature/test-s01-ide-integration
git push -u origin feature/test-s01-ide-integration

# 検証完了後、ブランチを削除して再作成することで繰り返し検証可能
git checkout main
git branch -D feature/test-s01-ide-integration
git push origin --delete feature/test-s01-ide-integration
```

**推奨ブランチ命名規則**:
- `feature/test-s01-*`: S01（IDE統合）のテスト用
- `feature/test-s02-*`: S02（VCS統合）のテスト用
- `feature/test-s03-*`: S03（CI/CD統合）のテスト用
- 以降、S04-S11も同様

### 3. GitHub Secretsの設定

GitHub Actions用のSecretsを設定します：

```bash
# Settings → Secrets and variables → Actions → New repository secret

# 必要なSecrets:
WIZ_CLIENT_ID          # WizサービスアカウントのクライアントID
WIZ_CLIENT_SECRET      # Wizサービスアカウントのシークレット
AWS_ACCESS_KEY_ID      # AWSアクセスキー（Phase 2以降）
AWS_SECRET_ACCESS_KEY  # AWSシークレットアクセスキー（Phase 2以降）
AWS_REGION            # AWSリージョン（例: us-east-1）
```

---

## Wiz認証情報の取得と設定

### 1. Wizサービスアカウントの作成

1. **Wizコンソールにログイン**
   - https://app.wiz.io/

2. **Settings → Service Accounts → Create Service Account**
   - Name: `wiz-code-verification`
   - Description: `Wiz Code検証用サービスアカウント`
   - Permissions:
     - `read:vulnerabilities`
     - `read:issues`
     - `create:scans`
     - `read:scans`

3. **認証情報の取得**
   - Service Accountを作成すると、**Client ID**と**Client Secret**が表示されます
   - **⚠️ 重要**: Client Secretは一度しか表示されないため、必ず安全な場所に保存してください

### 2. Wiz CLIのインストールと認証

```bash
# Wiz CLIのダウンロード（Linux/macOS）
curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
chmod +x wizcli
sudo mv wizcli /usr/local/bin/

# Wiz CLIのダウンロード（Windows）
# https://downloads.wiz.io/wizcli/latest/wizcli-windows-amd64.exe をダウンロード
# wizcli.exe にリネームしてPATHに追加

# 認証情報の設定（環境変数）
export WIZ_CLIENT_ID="your_client_id_here"
export WIZ_CLIENT_SECRET="your_client_secret_here"

# 認証テスト
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
```

### 3. 認証情報の永続化

#### Linux/macOS

```bash
# ~/.bashrc または ~/.zshrc に追加
echo 'export WIZ_CLIENT_ID="your_client_id_here"' >> ~/.bashrc
echo 'export WIZ_CLIENT_SECRET="your_client_secret_here"' >> ~/.bashrc
source ~/.bashrc
```

#### Windows (PowerShell)

```powershell
# 環境変数を永続的に設定
[System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_ID', 'your_client_id_here', 'User')
[System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_SECRET', 'your_client_secret_here', 'User')

# 現在のセッションで確認
$env:WIZ_CLIENT_ID
$env:WIZ_CLIENT_SECRET
```

### 4. 認証情報ファイルの作成（オプション）

```bash
# プロジェクトルートに .env ファイルを作成（gitignore済み）
cat > .env << EOF
WIZ_CLIENT_ID=your_client_id_here
WIZ_CLIENT_SECRET=your_client_secret_here
EOF

# 権限を制限
chmod 600 .env
```

---

## AWS認証情報の取得と設定

### 1. AWS IAMユーザーの作成（Phase 2以降で必要）

1. **AWS Management Consoleにログイン**
   - https://console.aws.amazon.com/

2. **IAM → Users → Create user**
   - User name: `wiz-code-verification`
   - Access type: `Programmatic access`

3. **必要な権限の付与**

   以下のポリシーをアタッチ：
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ecr:*",
           "ecs:*",
           "ec2:*",
           "rds:*",
           "s3:*",
           "dynamodb:*",
           "logs:*",
           "iam:PassRole"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

   **⚠️ 注意**: 本番環境では最小権限の原則に従ってください

4. **認証情報の取得**
   - ユーザー作成完了後、**Access Key ID**と**Secret Access Key**が表示されます
   - CSVファイルをダウンロードして安全に保管

### 2. AWS CLIの設定

```bash
# AWS CLIの認証情報を設定
aws configure

# 以下を入力：
AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name: us-east-1
Default output format: json

# 認証テスト
aws sts get-caller-identity
```

### 3. 複数プロファイルの設定（オプション）

```bash
# プロファイル名を指定して設定
aws configure --profile wiz-verification

# プロファイルを使用
export AWS_PROFILE=wiz-verification
aws sts get-caller-identity --profile wiz-verification
```

---

## ローカル開発環境のセットアップ

### 1. プロジェクトの依存関係をインストール

```bash
# バックエンドのセットアップ
cd taskflow-app/backend
npm install

# フロントエンドのセットアップ
cd ../frontend
npm install
```

### 2. 環境変数ファイルの作成

#### バックエンド環境変数

```bash
cd taskflow-app/backend
cp .env.example .env

# .env ファイルを編集
cat > .env << 'EOF'
# Node.js環境
NODE_ENV=development
PORT=3001

# データベース設定（ローカルPostgreSQL用）
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=taskflow
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT設定（開発用）
JWT_SECRET=development-jwt-secret-key-change-in-production

# AWS認証情報（開発用はコメントアウト）
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1

# ログレベル
LOG_LEVEL=debug
EOF
```

#### フロントエンド環境変数

```bash
cd taskflow-app/frontend

# .env.local ファイルを作成
cat > .env.local << 'EOF'
# APIエンドポイント
NEXT_PUBLIC_API_URL=http://localhost:3001

# 開発用設定
NODE_ENV=development
EOF
```

---

## データベースのセットアップ

### オプションA: ローカルPostgreSQLを使用（推奨）

#### Docker Composeでセットアップ

```bash
# プロジェクトルートに docker-compose.yml を作成
cd WizCodeVerification
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: taskflow-postgres
    environment:
      POSTGRES_DB: taskflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - taskflow-network

volumes:
  postgres_data:

networks:
  taskflow-network:
    driver: bridge
EOF

# PostgreSQLコンテナを起動
docker-compose up -d postgres

# データベースの初期化
cd taskflow-app/backend
npm run dev
# 初回起動時にテーブルが自動作成されます
```

#### 手動インストール（PostgreSQL）

```bash
# PostgreSQL 15のインストール
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-15

# macOS (Homebrew)
brew install postgresql@15

# データベースとユーザーの作成
sudo -u postgres psql << EOF
CREATE DATABASE taskflow;
CREATE USER taskflow_admin WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE taskflow TO taskflow_admin;
\q
EOF

# データベースの初期化
cd taskflow-app/scripts/setup
chmod +x init-database.sh
# スクリプトを編集してローカルDB情報に変更してから実行
# ./init-database.sh
```

### オプションB: AWS RDSを使用（Phase 2以降）

```bash
# Terraformでデータベースを作成
cd taskflow-app/terraform/environments/dev
terraform init
terraform apply

# RDSエンドポイントを取得
terraform output rds_endpoint

# バックエンドの .env ファイルを更新
# DATABASE_HOST=<RDSエンドポイント>
```

---

## 動作確認

### 1. バックエンドの起動確認

```bash
cd taskflow-app/backend
npm run dev

# 以下が表示されれば成功:
# TaskFlow Backend running on port 3001
# Environment: development
# WARNING: This application contains intentional vulnerabilities for Wiz verification
```

**ヘルスチェック**:
```bash
curl http://localhost:3001/health
# 期待される出力: {"status":"ok","timestamp":"2025-11-29T..."}
```

### 2. フロントエンドの起動確認

```bash
cd taskflow-app/frontend
npm run dev

# 以下が表示されれば成功:
# ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**ブラウザで確認**:
- http://localhost:3000 にアクセス
- TaskFlowダッシュボードが表示されれば成功

### 3. API接続の確認

```bash
# ユーザー登録のテスト
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# タスク一覧の取得
curl http://localhost:3001/api/tasks
```

### 4. Wizスキャンのテスト

```bash
# ディレクトリスキャン
cd WizCodeVerification
wizcli dir scan --path ./taskflow-app/backend --policy-hits-only

# 成功すれば脆弱性が検出されます（意図的な脆弱性）
```

---

## トラブルシューティング

### データベース接続エラー

```bash
# エラー: ENOTFOUND taskflow-db.xxxxx.us-east-1.rds.amazonaws.com
# 原因: データベースがまだ作成されていない、または接続情報が間違っている

# 解決方法:
# 1. ローカルPostgreSQLを使用する場合
#    - docker-compose up -d postgres
#    - .env の DATABASE_HOST を localhost に変更

# 2. AWS RDSを使用する場合
#    - Terraformでデータベースを作成
#    - RDSエンドポイントを .env に設定
```

### ポート競合エラー

```bash
# エラー: EADDRINUSE: address already in use :::3000
# 原因: ポート3000または3001が既に使用されている

# 解決方法:
# 1. 使用中のプロセスを確認
lsof -i :3000
lsof -i :3001

# 2. プロセスを終了
kill -9 <PID>

# 3. または、ポート番号を変更
# backend/src/index.js の PORT を変更
# frontend/.env.local の NEXT_PUBLIC_API_URL を変更
```

### Wiz認証エラー

```bash
# エラー: Authentication failed
# 原因: 認証情報が正しくない、または期限切れ

# 解決方法:
# 1. 認証情報を再確認
echo $WIZ_CLIENT_ID
echo $WIZ_CLIENT_SECRET

# 2. 再認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# 3. 新しいサービスアカウントを作成（必要に応じて）
```

---

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照して検証を開始してください：

1. **[検証実行ガイド](./VERIFICATION_EXECUTION_GUIDE.md)** - 各シナリオの実行手順
2. **[Phase 1 README](../phase1-shift-left/README.md)** - シフトレフト検証の詳細
3. **[SCENARIO_MAP.md](../../SCENARIO_MAP.md)** - 全体構成図

---

## 参考資料

- [Wiz公式ドキュメント](https://docs.wiz.io/)
- [AWS CLI設定ガイド](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
