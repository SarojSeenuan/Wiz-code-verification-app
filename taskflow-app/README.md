# TaskFlow - Wiz 検証用サンプルアプリケーション

このリポジトリは、Wiz Code 検証用のサンプルアプリケーションです。**意図的に脆弱性が含まれています。本番環境では絶対に使用しないでください。**

## ⚠️ 警告

このアプリケーションには、以下の Wiz 検証シナリオ（S01-S11）で検出されるべき、意図的な脆弱性が含まれています：

- **S01**: IDE 統合 - VSCode 拡張機能によるリアルタイム脆弱性検出
- **S02**: VCS 統合 - GitHub App による PR 自動スキャン
- **S03**: GitHub Actions 統合 - CI/CD パイプラインでの脆弱性検出
- **S04**: IaC スキャン - Terraform の設定ミス検出
- **S05**: シークレット検出 - ハードコードされた認証情報の検出
- **S06**: SBOM 生成 - ソフトウェア部品表の作成と脆弱性追跡
- **S07**: コンテナスキャン - Docker イメージの脆弱性検出と Code-to-Cloud traceability
- **S08**: ランタイムコンテキスト - 実行中のリソースに基づく優先順位付け
- **S09**: IaC ドリフト検出 - 実際のクラウド環境と IaC コードの差分検出
- **S10**: Toxic Combination 検出 - 複数の脆弱性の組み合わせによるリスク評価
- **S11**: AWS Inspector vs Wiz 比較 - Code-to-Cloud トレーサビリティによる迅速な対応

## 🏗️ アーキテクチャ

```
taskflow-app/
├── backend/              # Node.js/Express APIサーバー
├── frontend/             # Next.js Webアプリケーション
├── terraform/            # インフラストラクチャコード（AWS）
│   ├── modules/         # 再利用可能なTerraformモジュール
│   └── environments/    # 環境別設定（dev/prod）
├── k8s/                 # Kubernetesマニフェスト（Kustomize）
│   ├── base/           # 基本設定
│   └── overlays/       # 環境別オーバーレイ
├── .github/workflows/   # GitHub Actionsワークフロー
└── scripts/            # セットアップ・検証・クリーンアップスクリプト
```

## 🛠️ 技術スタック

### バックエンド

- **Runtime**: Node.js 18.x LTS
- **Framework**: Express.js 4.x（意図的に古いバージョン）
- **Database**: PostgreSQL 15.x on Amazon RDS
- **認証**: JWT（jsonwebtoken）
- **依存関係**: 意図的に脆弱なバージョンを使用

### フロントエンド

- **Framework**: Next.js 13.x（Pages Router）
- **UI Library**: React 18.x
- **スタイリング**: Tailwind CSS 3.x
- **HTTP Client**: Axios 0.21.1（意図的に古いバージョン）

### インフラストラクチャ

- **クラウドプロバイダー**: AWS
- **コンピューティング**: Amazon ECS/EKS
- **コンテナレジストリ**: Amazon ECR
- **データベース**: Amazon RDS (PostgreSQL)
- **ネットワーク**: VPC, ALB, Security Groups
- **IaC**: Terraform 1.6+

## 🚀 クイックスタート

### 前提条件

- Node.js 18.x 以上
- PostgreSQL 15.x
- Docker Desktop
- AWS CLI v2
- Terraform 1.6+
- Wiz CLI

### ローカル開発環境のセットアップ

#### 1. バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してデータベース接続情報を設定

# データベースの初期化
cd ../scripts/setup
./init-database.sh

# 開発サーバーの起動
cd ../../backend
npm run dev
```

バックエンドは http://localhost:3001 で起動します。

#### 2. フロントエンドのセットアップ

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

フロントエンドは http://localhost:3000 で起動します。

### Docker Compose での起動（推奨）

最も簡単な方法は、Docker Compose を使用して全てのサービスを一度に起動することです：

```bash
# 全サービス（PostgreSQL、Backend、Frontend、Redis）を起動
docker-compose up -d

# サービスの状態を確認
docker-compose ps

# ログを確認
docker-compose logs -f

# 特定のサービスのログを確認
docker-compose logs -f backend
docker-compose logs -f frontend

# 停止
docker-compose down

# ボリュームも含めて完全削除
docker-compose down -v
```

**⚠️ Code-to-Cloudトレーサビリティのためのビルド引数**

環境変数を設定してビルドすることで、Wizがコンテナイメージをソースコードまで追跡できます：

```bash
# Git情報を含めてビルド
export GIT_COMMIT=$(git rev-parse HEAD)
export GIT_BRANCH=$(git branch --show-current)
export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export BUILD_ID=local-$(date +%s)
export GITHUB_REPOSITORY=$(git remote get-url origin)

docker-compose up -d --build
```

**接続情報**:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
  - Database: taskflow
  - User: postgres
  - Password: postgres123
- **Redis**: localhost:6379（パスワードなし）

**ヘルスチェック**:

```bash
# バックエンドAPI
curl http://localhost:3001/health

# フロントエンド
curl http://localhost:3000
```

### Docker イメージでの起動

```bash
# バックエンドのビルドと起動
cd backend
docker build -t taskflow-backend:latest .
docker run -p 3001:3001 \
  -e DATABASE_HOST=host.docker.internal \
  -e DATABASE_PORT=5432 \
  -e DATABASE_NAME=taskflow \
  -e DATABASE_USER=postgres \
  -e DATABASE_PASSWORD=postgres \
  taskflow-backend:latest

# フロントエンドのビルドと起動
cd frontend
docker build -t taskflow-frontend:latest .
docker run -p 3000:3000 taskflow-frontend:latest
```

## 📦 Wiz 検証の実行

### S03: GitHub Actions による自動スキャン

1. GitHub リポジトリにプッシュ
2. GitHub Actions が自動的に実行され、Wiz スキャンが実施される
3. ワークフローの結果を確認

### S04: IaC スキャン

```bash
# Terraformコードのスキャン
wizcli iac scan --path ./terraform --policy-hits-only
```

### S05: シークレットスキャン

```bash
# リポジトリ全体のシークレットスキャン
wizcli dir scan --path . --secret-scan-only
```

### S06: SBOM 生成

```bash
# バックエンドのSBOM生成
wizcli dir scan --path ./backend --sbom-output backend-sbom.json --sbom-format cyclonedx

# フロントエンドのSBOM生成
wizcli dir scan --path ./frontend --sbom-output frontend-sbom.json --sbom-format spdx
```

### S07: Docker イメージスキャン

```bash
# イメージのビルド
docker build -t taskflow-backend:latest ./backend

# Wizスキャン
wizcli docker scan --image taskflow-backend:latest

# Code-to-Cloudメタデータのタグ付け
wizcli docker tag \
  --image taskflow-backend:latest \
  --source-repo "YOUR_GITHUB_REPO" \
  --source-branch "main" \
  --source-commit "$(git rev-parse HEAD)"
```

### 統合スキャンスクリプト

```bash
# すべてのWizスキャンを一括実行
cd scripts/verification
./run-wiz-scan.sh
```

## 🏭 AWS 環境へのデプロイ

詳細な手順は [MANUAL_SETUP_GUIDE.md](../../docs/guides/MANUAL_SETUP_GUIDE.md) を参照してください。

### 前提条件

```bash
# AWS認証情報の設定
aws configure

# Terraform, AWS CLI, kubectl, Wiz CLIがインストールされていることを確認
terraform --version  # v1.6.x以上
aws --version        # AWS CLI v2.x
kubectl version      # v1.28.x以上
wizcli version       # 最新版
```

### 1. Terraform によるインフラ構築

```bash
cd terraform/environments/dev

# 変数ファイルの作成
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集して必要な値を設定

# 初期化
terraform init

# プラン確認（意図的な脆弱性を確認）
terraform plan

# S04検証: Terraformコードのスキャン
wizcli iac scan --path . --policy-hits-only

# 適用
terraform apply

# 出力値を確認
terraform output
export ECR_REGISTRY=$(terraform output -raw ecr_registry)
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
```

**作成されるリソース**:
- VPC、サブネット、セキュリティグループ
- Amazon ECR リポジトリ（backend/frontend）
- Amazon RDS PostgreSQL
- Amazon ECS クラスター、タスク定義、サービス
- Application Load Balancer

### 2. Docker イメージのビルドとプッシュ（Wizスキャン付き）

```bash
# ECRログイン
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# バックエンドイメージのビルド（Code-to-Cloudメタデータ付き）
cd ../../backend
export IMAGE_TAG=$(git rev-parse --short HEAD)
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg GIT_BRANCH=$(git branch --show-current) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg BUILD_ID=manual-$(date +%s) \
  --build-arg GITHUB_REPOSITORY=$(git remote get-url origin) \
  -t $ECR_REGISTRY/taskflow-backend:$IMAGE_TAG \
  -t $ECR_REGISTRY/taskflow-backend:latest \
  .

# S07検証: Wizスキャンの実行
wizcli docker scan \
  --image $ECR_REGISTRY/taskflow-backend:$IMAGE_TAG \
  --policy "Default vulnerabilities policy" \
  --policy-hits-only

# Code-to-Cloudメタデータのタグ付け
wizcli docker tag \
  --image $ECR_REGISTRY/taskflow-backend:$IMAGE_TAG \
  --source-repo "$(git remote get-url origin)" \
  --source-branch "$(git branch --show-current)" \
  --source-commit "$(git rev-parse HEAD)" \
  --ci-build-id "manual-$(date +%s)"

# ECRにプッシュ
docker push $ECR_REGISTRY/taskflow-backend:$IMAGE_TAG
docker push $ECR_REGISTRY/taskflow-backend:latest

# フロントエンドも同様に
cd ../frontend
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg GIT_BRANCH=$(git branch --show-current) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg BUILD_ID=manual-$(date +%s) \
  --build-arg GITHUB_REPOSITORY=$(git remote get-url origin) \
  -t $ECR_REGISTRY/taskflow-frontend:$IMAGE_TAG \
  -t $ECR_REGISTRY/taskflow-frontend:latest \
  .

wizcli docker scan --image $ECR_REGISTRY/taskflow-frontend:$IMAGE_TAG --policy-hits-only
wizcli docker tag --image $ECR_REGISTRY/taskflow-frontend:$IMAGE_TAG \
  --source-repo "$(git remote get-url origin)" \
  --source-branch "$(git branch --show-current)" \
  --source-commit "$(git rev-parse HEAD)"

docker push $ECR_REGISTRY/taskflow-frontend:$IMAGE_TAG
docker push $ECR_REGISTRY/taskflow-frontend:latest
```

### 3. ECS へのデプロイ

```bash
# Terraformで自動的にECSタスク定義とサービスが作成されます
# イメージを更新した場合は、ECSサービスを強制的に再デプロイ
aws ecs update-service \
  --cluster dev-taskflow-cluster \
  --service dev-taskflow-backend-service \
  --force-new-deployment

aws ecs update-service \
  --cluster dev-taskflow-cluster \
  --service dev-taskflow-frontend-service \
  --force-new-deployment

# デプロイ状況の確認
aws ecs describe-services \
  --cluster dev-taskflow-cluster \
  --services dev-taskflow-backend-service dev-taskflow-frontend-service

# ALBのDNS名を取得
terraform output alb_dns_name
```

### 4. EKS へのデプロイ（オプション）

```bash
# EKSクラスターへの接続
aws eks update-kubeconfig --name dev-taskflow-cluster --region us-east-1

# Namespaceの確認
kubectl get namespaces

# Kustomizeでデプロイ
kubectl apply -k k8s/overlays/dev

# デプロイ状況の確認
kubectl get pods -n taskflow
kubectl get services -n taskflow
kubectl get ingress -n taskflow

# ログ確認
kubectl logs -f deployment/backend -n taskflow
kubectl logs -f deployment/frontend -n taskflow
```

### 5. S08-S09検証: ランタイムコンテキストとドリフト検出

```bash
# S08: Wizコンソールでランタイムコンテキストを確認
# 1. Wiz Console → Inventory → Workloads
# 2. ECS TasksまたはKubernetes Podsを検索
# 3. "In Use"フィルターを適用して実行中の脆弱性を確認

# S09: 手動でAWSリソースを変更してドリフトを検出
# 1. AWS Consoleでセキュリティグループのルールを追加
# 2. Terraformでドリフトを確認
cd terraform/environments/dev
terraform plan  # 差分が表示される

# 3. Wizコンソールでドリフトを確認
# Wiz Console → Cloud Configuration → Drift Detection
```

## 🔍 意図的な脆弱性の一覧

### バックエンド (backend/)

1. **SQL インジェクション** (`src/routes/tasks.js`, `src/routes/users.js`)

   - パラメータを直接 SQL クエリに埋め込み
   - 検出シナリオ: S01, S02

2. **XSS 脆弱性** (`src/routes/tasks.js`)

   - ユーザー入力をサニタイズせずに保存
   - 検出シナリオ: S01, S02

3. **認証バイパス** (`src/routes/auth.js`)

   - SQL インジェクションで認証を回避可能
   - 検出シナリオ: S01, S02

4. **IDOR 脆弱性** (`src/routes/tasks.js`, `src/routes/users.js`)

   - 認証・認可チェックなし
   - 検出シナリオ: S01, S02

5. **ハードコードされたシークレット** (`src/index.js`, `.env.example`)

   - JWT Secret, AWS 認証情報など
   - 検出シナリオ: S05

6. **脆弱な依存関係** (`package.json`)
   - express@4.17.1, axios@0.21.1, lodash@4.17.19など
   - 検出シナリオ: S01, S02, S03, S06, S10

### フロントエンド (frontend/)

1. **XSS 脆弱性** (`pages/index.js`, `pages/tasks/[id].js`)

   - dangerouslySetInnerHTML を使用
   - 検出シナリオ: S01, S02

2. **機密情報の localStorage 保存** (`lib/api.js`)

   - トークン、パスワードを localStorage に保存
   - 検出シナリオ: S01, S02

3. **脆弱な依存関係** (`package.json`)
   - next@13.4.1, axios@0.21.1, lodash@4.17.19など
   - 検出シナリオ: S01, S02, S03, S06

### インフラストラクチャ (terraform/)

1. **暗号化無効** (`modules/rds/variables.tf`)

   - storage_encrypted = false
   - 検出シナリオ: S04

2. **パブリックアクセス許可** (`modules/rds/variables.tf`)

   - publicly_accessible = true
   - 検出シナリオ: S04

3. **緩いセキュリティグループ** (`modules/networking/main.tf`)

   - 0.0.0.0/0 からのアクセス許可
   - 検出シナリオ: S04

4. **イメージスキャン無効** (`modules/ecr/main.tf`)
   - scan_on_push = false
   - 検出シナリオ: S04

### Kubernetes (k8s/)

1. **root 権限での実行** (`base/backend-deployment.yaml`, `base/frontend-deployment.yaml`)

   - securityContext が設定されていない
   - 検出シナリオ: S04

2. **リソース制限なし** (`base/backend-deployment.yaml`, `base/frontend-deployment.yaml`)

   - resources.limits が設定されていない
   - 検出シナリオ: S04

3. **環境変数にシークレット** (`base/backend-deployment.yaml`, `base/frontend-deployment.yaml`)
   - ハードコードされた認証情報
   - 検出シナリオ: S05

## 🧹 クリーンアップ

```bash
# AWSリソースの削除
cd scripts/cleanup
./cleanup-resources.sh

# または手動でTerraform destroy
cd terraform/environments/dev
terraform destroy
```

## 📚 関連ドキュメント

- [Wiz 検証シナリオマップ](../../SCENARIO_MAP.md)
- [アーキテクチャ設計](../../docs/overview/architecture.md)
- [Phase 1: シフトレフト検証](../../docs/phase-1/)
- [Phase 2: Code-to-Cloud 構築](../../docs/phase-2/)
- [Phase 3: 実用的検証](../../docs/phase-3/)

## 📝 ライセンス

このプロジェクトは検証・教育目的のみで使用されるべきです。本番環境での使用は禁止されています。

## ⚖️ 免責事項

このアプリケーションには意図的にセキュリティ脆弱性が含まれています。これらは教育および Wiz 検証の目的でのみ存在します。実際の本番環境でこれらのパターンを使用しないでください。
