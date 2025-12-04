# 手動セットアップガイド

本ガイドでは、Wiz Code 検証環境を手動でセットアップする手順を説明します。

> **📌 このドキュメントを読むべきタイミング**
> プロジェクト開始時、初めて環境をセットアップする際に必ず読んでください。

> **📖 次に読むべきドキュメント**
>
> - Windows 環境の方 → [WINDOWS_SETUP_GUIDE.md](./WINDOWS_SETUP_GUIDE.md)
> - その他の方 → [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)
> - AWS 環境デプロイ（Phase 2-3）→ [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)

> **🔙 ガイド一覧に戻る** > [ガイド一覧](./README.md)

---

## 🗺️ セットアップロードマップ

```
┌─────────────────────────────────────────────────────────────┐
│                      セットアップフロー                        │
└─────────────────────────────────────────────────────────────┘

1️⃣ 前提条件確認 ────────────────────────► 所要時間: 5分
   ├─ アカウント（GitHub, Wiz, AWS）
   └─ ツール（Node.js, Git, Docker, AWS CLI, Terraform）

2️⃣ GitHub環境セットアップ ──────────────► 所要時間: 10分
   ├─ リポジトリ作成/フォーク
   ├─ ブランチ戦略設定
   └─ GitHub Secrets設定

3️⃣ Wiz認証情報取得と設定 ──────────────► 所要時間: 10分
   ├─ Wizサービスアカウント作成
   ├─ Wiz CLIインストール
   └─ 認証テスト

4️⃣ AWS認証情報取得と設定（Phase 2以降）► 所要時間: 15分
   ├─ IAMユーザー作成
   ├─ AWS CLI設定
   └─ 認証テスト

5️⃣ ローカル開発環境セットアップ ────────► 所要時間: 15分
   ├─ プロジェクト依存関係インストール
   └─ 環境変数ファイル作成

6️⃣ データベースセットアップ ────────────► 所要時間: 5-30分
   ├─ オプションA: Docker Compose（推奨）
   ├─ オプションB: ローカルPostgreSQL
   └─ オプションC: AWS RDS（Phase 2以降）

7️⃣ 動作確認 ────────────────────────────► 所要時間: 5分
   ├─ バックエンド起動確認
   ├─ フロントエンド起動確認
   └─ Wizスキャンテスト

┌─────────────────────────────────────────────────────────────┐
│ 合計所要時間: 約1-2時間（Phase 1のみ）                         │
│             約2-3時間（全Phase）                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase 別セットアップ概要

### Phase 1 のみ実施する場合（AWS 不要）

**実施するシナリオ**: S01 ～ S05（IDE 統合、VCS 統合、CI/CD 統合、IaC スキャン、シークレット検出）

**必要な環境**:

- ✅ GitHub アカウント
- ✅ Wiz 認証情報
- ✅ ローカル開発環境（Node.js, Docker）
- ❌ AWS 環境（不要）

**スキップ可能なセクション**:

- [AWS 認証情報の取得と設定](#aws認証情報の取得と設定) - スキップ可能
- データベースセットアップの「オプション C: AWS RDS」 - スキップ

### 全 Phase 実施する場合（AWS 必要）

**実施するシナリオ**: S01 ～ S11（全シナリオ）

**必要な環境**:

- ✅ GitHub アカウント
- ✅ Wiz 認証情報
- ✅ ローカル開発環境（Node.js, Docker）
- ✅ AWS 環境（ECS Fargate, RDS, ECR, VPC, ALB）

**すべてのセクションを実施**

**🚀 AWS 環境のデプロイ手順**:

- 詳細は [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) を参照してください
- リージョン: 東京（ap-northeast-1）
- 検証期間: 1 週間（想定コスト: 約$26）
- 必要リソース: ECS Fargate, ECR, RDS PostgreSQL, VPC, NAT Gateway, ALB

---

## 目次

1. [前提条件](#前提条件)
2. [GitHub 環境のセットアップ](#github環境のセットアップ)
3. [Wiz 認証情報の取得と設定](#wiz認証情報の取得と設定)
4. [AWS 認証情報の取得と設定](#aws認証情報の取得と設定)
5. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
6. [データベースのセットアップ](#データベースのセットアップ)
7. [動作確認](#動作確認)

---

## 前提条件

### 必須アカウント

- **GitHub**: リポジトリ作成権限を持つアカウント
- **Wiz**: テナントへのアクセス権限（Service Account または User）
- **AWS**: ECS/EKS 環境を構築できる権限を持つアカウント

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

## GitHub 環境のセットアップ

### 1. リポジトリの作成

#### オプション A: 既存リポジトリをフォーク（推奨）

```bash
# GitHubでこのリポジトリをフォーク
# https://github.com/your-org/WizCodeVerification

# ローカルにクローン
git clone https://github.com/YOUR_USERNAME/WizCodeVerification.git
cd WizCodeVerification
```

#### オプション B: 新規リポジトリを作成

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

Wiz 検証を繰り返し実行できるようにブランチ戦略を設定します：

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

- `feature/test-s01-*`: S01（IDE 統合）のテスト用
- `feature/test-s02-*`: S02（VCS 統合）のテスト用
- `feature/test-s03-*`: S03（CI/CD 統合）のテスト用
- 以降、S04-S11 も同様

### 3. GitHub Secrets の設定

GitHub Actions 用の Secrets を設定します：

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

## Wiz 認証情報の取得と設定

### 1. Wiz サービスアカウントの作成

1. **Wiz コンソールにログイン**

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
   - Service Account を作成すると、**Client ID**と**Client Secret**が表示されます
   - **⚠️ 重要**: Client Secret は一度しか表示されないため、必ず安全な場所に保存してください

### 2. Wiz CLI のインストールと認証

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

## AWS 認証情報の取得と設定

### 1. AWS IAM ユーザーの作成（Phase 2 以降で必要）

1. **AWS Management Console にログイン**

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
   - CSV ファイルをダウンロードして安全に保管

### 2. AWS CLI の設定

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

#### ⚠️ 社内ネットワーク環境での証明書エラー対処

企業のプロキシやファイアウォールで自己署名証明書を使用している場合、npm install で以下のようなエラーが発生することがあります：

```
SELF_SIGNED_CERT_IN_CHAIN
unable to get local issuer certificate
certificate has expired
```

**解決方法 1: SSL 検証を一時的に無効化（開発環境のみ推奨）**

```bash
# 現在のセッションのみ有効
npm config set strict-ssl false

# または、環境変数で設定
export NODE_TLS_REJECT_UNAUTHORIZED=0  # Linux/macOS
$env:NODE_TLS_REJECT_UNAUTHORIZED=0    # Windows PowerShell

# npm install を実行
npm install

# 完了後、設定を戻す（セキュリティのため）
npm config set strict-ssl true
unset NODE_TLS_REJECT_UNAUTHORIZED     # Linux/macOS
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED  # Windows PowerShell
```

**解決方法 2: .npmrc ファイルでプロジェクト単位で設定**

```bash
# プロジェクトルートまたはユーザーホームディレクトリに .npmrc を作成
cat > ~/.npmrc << 'EOF'
# SSL検証を無効化（開発環境のみ）
strict-ssl=false

# または、企業のプロキシ設定を追加
# proxy=http://proxy.company.com:8080
# https-proxy=http://proxy.company.com:8080

# タイムアウト設定を延長（大きなパッケージのダウンロード用）
fetch-timeout=60000
EOF
```

**解決方法 3: 企業の CA 証明書を追加（最も安全な方法）**

```bash
# 企業のルートCA証明書を取得（例: company-ca.crt）
# IT部門から証明書ファイルを取得してください

# Node.jsに証明書を追加
export NODE_EXTRA_CA_CERTS=/path/to/company-ca.crt  # Linux/macOS
$env:NODE_EXTRA_CA_CERTS="C:\path\to\company-ca.crt"  # Windows PowerShell

# または、.npmrc に追加
echo "cafile=/path/to/company-ca.crt" >> ~/.npmrc

# npm install を実行
npm install
```

**解決方法 4: プロキシ経由での接続設定**

```bash
# 企業プロキシの設定
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 認証が必要な場合
npm config set proxy http://username:password@proxy.company.com:8080
npm config set https-proxy http://username:password@proxy.company.com:8080

# プロキシを経由しないドメインを指定
npm config set noproxy "localhost,127.0.0.1,*.internal.com"
```

**設定の確認**

```bash
# 現在のnpm設定を確認
npm config list
npm config get strict-ssl
npm config get proxy
npm config get https-proxy

# .npmrc ファイルの場所を確認
npm config get userconfig  # ユーザー設定: ~/.npmrc
npm config get globalconfig  # グローバル設定: /etc/npmrc
```

### 2. 環境変数ファイルの作成

#### バックエンド環境変数

```bash
cd taskflow-app/backend

# .env.example を .env にコピー
cp .env.example .env

# .envファイルを編集（必要に応じて）
# 以下は .env.example の内容です
```

**backend/.env の設定内容**:

```bash
# ⚠️ Wiz検証用 - 意図的な脆弱性設定を含む
# ⚠️ 本番環境では絶対に使用しないでください

# サーバー設定
PORT=3001
NODE_ENV=development

# データベース設定（ローカルPostgreSQL用）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow
DB_USER=postgres
DB_PASSWORD=postgres123

# ストレージモード（development: localStorage, production: postgresql）
STORAGE_MODE=localStorage

# JWT設定（⚠️ 意図的に弱い設定 - Wiz検出用）
JWT_SECRET=secret123
JWT_EXPIRES_IN=24h

# CORS設定
CORS_ORIGIN=http://localhost:3000

# ⚠️ 意図的な脆弱性：ハードコードされたシークレット（S05検出用）
API_KEY=pk_live_1234567890abcdef1234567890abcdef
ADMIN_PASSWORD=admin123

# デバッグモード（⚠️ 本番では false にすべき）
DEBUG_MODE=true
LOG_LEVEL=debug
```

**💡 ポイント**:

- `STORAGE_MODE=localStorage`: Phase 1 では簡単のためローカルストレージを使用
- `STORAGE_MODE=postgresql`: Phase 2 以降で RDS を使用する場合に変更
- 意図的な脆弱性が含まれているため、Wiz スキャンで検出されます

#### フロントエンド環境変数

```bash
cd taskflow-app/frontend

# .env.example を .env.local にコピー
cp .env.example .env.local

# .env.local ファイルを編集（必要に応じて）
```

**frontend/.env.local の設定内容**:

```bash
# ============================================================
# TaskFlow Frontend 環境変数
# ============================================================

# APIエンドポイント設定
NEXT_PUBLIC_API_URL=http://localhost:3001

# Next.js設定
NODE_ENV=development

# 認証設定（NextAuth.js）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here_minimum_32_characters

# 外部API設定（必要に応じて）
# NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=UA-XXXXX-Y
# NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_XXXXX
```

**💡 ポイント**:

- `NEXT_PUBLIC_API_URL`: バックエンドの URL を指定（開発環境では localhost:3001）
- `NEXTAUTH_SECRET`: 32 文字以上のランダムな文字列を生成して設定してください

---

## データベースのセットアップ

### オプション A: ローカル PostgreSQL を使用（推奨）

#### Docker Compose でセットアップ

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
# docker-composeを使用（推奨）
docker-compose up -d
```

### オプション B: AWS RDS を使用（Phase 2 以降）

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
- TaskFlow ダッシュボードが表示されれば成功

### 3. API 接続の確認

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

### 4. Wiz スキャンのテスト

```bash
# ディレクトリスキャン
cd WizCodeVerification
wizcli dir scan --path ./taskflow-app/backend --policy-hits-only

# 成功すれば脆弱性が検出されます（意図的な脆弱性）
```

---

## 📁 プロジェクト構造の詳細

セットアップ完了後、プロジェクトは以下の構造になります：

```
WizCodeVerification/
├── README.md                           # プロジェクト概要
├── SCENARIO_MAP.md                     # 検証シナリオ構成図
├── CLAUDE.md                           # Claude Code向け指示書
├── .env.phase1.template                # Phase 1環境変数テンプレート
├── .env.phase2.template                # Phase 2環境変数テンプレート
│
├── docs/                               # ドキュメント
│   ├── guides/                         # セットアップ・検証ガイド
│   │   ├── README.md                   # ガイドナビゲーションハブ
│   │   ├── MANUAL_SETUP_GUIDE.md       # 本ファイル
│   │   ├── WINDOWS_SETUP_GUIDE.md      # Windows環境セットアップ
│   │   ├── ENVIRONMENT_VARIABLES_GUIDE.md  # 環境変数管理
│   │   ├── BRANCH_MANAGEMENT_GUIDE.md  # ブランチ管理
│   │   ├── EVIDENCE_COLLECTION_GUIDE.md    # エビデンス収集
│   │   └── AWS_DEPLOYMENT_GUIDE.md     # AWSデプロイ手順
│   │
│   ├── overview/                       # 全体概要
│   │   └── architecture.md             # アーキテクチャ設計
│   │
│   ├── phase1-shift-left/              # Phase 1ドキュメント
│   │   ├── README.md
│   │   ├── S01-ide-integration.md
│   │   ├── S02-vcs-integration.md
│   │   ├── S03-cicd-integration.md
│   │   ├── S04-iac-scanning.md
│   │   └── S05-secret-detection.md
│   │
│   ├── phase2-code-to-cloud/           # Phase 2ドキュメント
│   │   ├── README.md
│   │   ├── S06-sbom-tracking.md
│   │   ├── S07-container-traceability.md
│   │   ├── S08-runtime-prioritization.md
│   │   └── S09-iac-drift-detection.md
│   │
│   └── phase3-integration/             # Phase 3ドキュメント
│       ├── README.md
│       ├── S10-incident-response.md
│       └── S11-aws-inspector-comparison.md
│
├── scripts/                            # 検証用スクリプト
│   ├── validate-env.ps1                # 環境変数検証（PowerShell）
│   ├── validate-env.sh                 # 環境変数検証（Bash）
│   ├── run-wiz-scan.ps1                # Wizスキャン実行（PowerShell）
│   └── run-wiz-scan.sh                 # Wizスキャン実行（Bash）
│
├── taskflow-app/                       # TaskFlowアプリケーション
│   ├── .github/workflows/              # GitHub Actions CI/CD
│   │   ├── S03-wiz-full-scan.yml       # 全スキャンワークフロー
│   │   ├── S05-wiz-secret-scan.yml     # シークレットスキャン
│   │   ├── S06-sbom-generation.yml     # SBOM生成
│   │   └── S07-container-build.yml     # コンテナビルド
│   │
│   ├── backend/                        # バックエンド（Node.js/Express）
│   │   ├── src/                        # ソースコード
│   │   ├── .env.example                # 環境変数サンプル
│   │   ├── Dockerfile                  # コンテナイメージ定義
│   │   ├── package.json                # 依存関係定義
│   │   └── README.md
│   │
│   ├── frontend/                       # フロントエンド（Next.js/React）
│   │   ├── pages/                      # Reactページ
│   │   ├── components/                 # Reactコンポーネント
│   │   ├── .env.example                # 環境変数サンプル
│   │   ├── Dockerfile                  # コンテナイメージ定義
│   │   ├── package.json                # 依存関係定義
│   │   └── README.md
│   │
│   ├── terraform/                      # Infrastructure as Code
│   │   ├── modules/                    # 再利用可能なモジュール
│   │   │   ├── networking/             # VPC、サブネット
│   │   │   ├── ecr/                    # ECRリポジトリ
│   │   │   ├── ecs/                    # ECSクラスター、サービス
│   │   │   └── rds/                    # RDSデータベース
│   │   │
│   │   └── environments/               # 環境別設定
│   │       ├── dev/                    # 開発環境
│   │       │   ├── main.tf
│   │       │   ├── variables.tf
│   │       │   ├── outputs.tf
│   │       │   └── terraform.tfvars.example
│   │       └── prod/                   # 本番環境（参考用）
│   │
│   └── k8s/                            # Kubernetes manifests
│       ├── base/                       # 基本設定
│       │   ├── namespace.yaml
│       │   ├── backend-deployment.yaml
│       │   ├── backend-service.yaml
│       │   ├── frontend-deployment.yaml
│       │   └── frontend-service.yaml
│       └── overlays/                   # 環境別オーバーレイ
│           ├── dev/
│           └── prod/
│
├── comparison/                         # S11用：比較検証データ
│   ├── aws-inspector/
│   └── wiz/
│
└── evidence/                           # 検証エビデンス（スクリーンショット等）
    ├── phase1/
    ├── phase2/
    └── phase3/
```

### 主要なディレクトリの説明

| ディレクトリ                        | 説明                               | 使用 Phase |
| ----------------------------------- | ---------------------------------- | ---------- |
| **docs/**                           | すべてのドキュメント               | 全 Phase   |
| **taskflow-app/backend/**           | Node.js/Express バックエンドアプリ | 全 Phase   |
| **taskflow-app/frontend/**          | Next.js/React フロントエンドアプリ | 全 Phase   |
| **taskflow-app/.github/workflows/** | GitHub Actions CI/CD パイプライン  | Phase 1, 2 |
| **taskflow-app/terraform/**         | AWS インフラ定義（IaC）            | Phase 2, 3 |
| **taskflow-app/k8s/**               | Kubernetes マニフェスト（参考用）  | Phase 3    |
| **scripts/**                        | 検証用の便利スクリプト             | 全 Phase   |
| **evidence/**                       | 検証エビデンス保存先               | 全 Phase   |

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

### Wiz 認証エラー

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

### npm 証明書エラー（社内ネットワーク環境）

企業のプロキシやファイアウォールで自己署名証明書を使用している場合のエラー：

```bash
# エラー例:
# SELF_SIGNED_CERT_IN_CHAIN
# unable to get local issuer certificate
# certificate has expired
# UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

#### 解決方法 1: SSL 検証を一時的に無効化（最も簡単）

```bash
# npm設定でSSL検証を無効化
npm config set strict-ssl false

# または、環境変数で設定
export NODE_TLS_REJECT_UNAUTHORIZED=0  # Linux/macOS
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"  # Windows PowerShell

# npm install を実行
npm install

# 完了後、元に戻す（推奨）
npm config set strict-ssl true
```

#### 解決方法 2: .npmrc ファイルで設定

```bash
# ユーザーホームディレクトリに .npmrc を作成
# Windows: C:\Users\<username>\.npmrc
# Linux/macOS: ~/.npmrc

cat > ~/.npmrc << 'EOF'
# SSL検証を無効化
strict-ssl=false

# タイムアウト設定を延長
fetch-timeout=60000

# レジストリ設定（必要に応じて）
registry=https://registry.npmjs.org/
EOF
```

#### 解決方法 3: 企業プロキシ設定

```bash
# プロキシ設定を追加
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 認証が必要な場合
npm config set proxy http://username:password@proxy.company.com:8080

# プロキシを経由しないドメイン
npm config set noproxy "localhost,127.0.0.1,*.internal.com"
```

#### 解決方法 4: 企業 CA 証明書の追加（最も安全）

```bash
# IT部門から企業のルートCA証明書を取得
# 例: company-root-ca.crt

# Node.jsに証明書を追加
export NODE_EXTRA_CA_CERTS=/path/to/company-root-ca.crt  # Linux/macOS
$env:NODE_EXTRA_CA_CERTS="C:\certs\company-root-ca.crt"  # Windows PowerShell

# または、.npmrcに追加
echo "cafile=/path/to/company-root-ca.crt" >> ~/.npmrc
```

#### Windows 環境での追加設定

```powershell
# PowerShellでの環境変数設定（永続化）
[System.Environment]::SetEnvironmentVariable('NODE_TLS_REJECT_UNAUTHORIZED', '0', 'User')
[System.Environment]::SetEnvironmentVariable('NODE_EXTRA_CA_CERTS', 'C:\certs\company-ca.crt', 'User')

# 設定確認
$env:NODE_TLS_REJECT_UNAUTHORIZED
$env:NODE_EXTRA_CA_CERTS
```

#### 設定の確認と削除

```bash
# 現在の設定を確認
npm config list
npm config get strict-ssl
npm config get proxy

# 設定を削除
npm config delete strict-ssl
npm config delete proxy
npm config delete https-proxy

# .npmrcファイルを直接編集
# Windows: notepad %USERPROFILE%\.npmrc
# Linux/macOS: nano ~/.npmrc
```

---

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照して検証を開始してください：

1. **[検証実行ガイド](./VERIFICATION_EXECUTION_GUIDE.md)** - 各シナリオの実行手順
2. **[Phase 1 README](../phase1-shift-left/README.md)** - シフトレフト検証の詳細
3. **[SCENARIO_MAP.md](../../SCENARIO_MAP.md)** - 全体構成図

---

## 参考資料

- [Wiz 公式ドキュメント](https://docs.wiz.io/)
- [AWS CLI 設定ガイド](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [PostgreSQL 公式ドキュメント](https://www.postgresql.org/docs/)
