# AWS環境デプロイガイド

## 📋 概要

このガイドでは、Wiz Code検証プロジェクトで必要なAWSインフラ環境のセットアップ手順を説明します。

### 対象Phase

| Phase | シナリオ | AWS環境の使用目的 |
|-------|---------|-----------------|
| **Phase 1** | S04 | IaCスキャン結果の実環境確認、Drift検出の準備 |
| **Phase 2** | S06 | SBOM生成とECRイメージの追跡 |
| **Phase 2** | S07 | ECS Fargateコンテナのソースコード追跡 |
| **Phase 2** | S08 | ランタイム脆弱性の優先順位付け |
| **Phase 3** | S09 | IaC Drift検出（コードと実環境の差分） |
| **Phase 3** | S10 | インシデント対応フロー検証 |
| **Phase 3** | S11 | AWS Inspector vs Wiz比較検証 |

### デプロイするAWSリソース

```
AWS Infrastructure (ap-northeast-1 / Tokyo)
├─ VPC
│  ├─ Public Subnet × 2 (Multi-AZ)
│  ├─ Private Subnet × 2 (Multi-AZ)
│  ├─ Internet Gateway
│  ├─ NAT Gateway × 1
│  └─ Route Tables
├─ Application Load Balancer (ALB)
├─ ECR Repository × 2
│  ├─ taskflow-backend
│  └─ taskflow-frontend
├─ RDS PostgreSQL
│  ├─ Instance: db.t3.micro
│  ├─ Storage: 20GB (暗号化)
│  └─ Multi-AZ: false (dev環境)
└─ ECS Fargate
   ├─ Cluster: taskflow-cluster
   ├─ Service: backend, frontend
   └─ Task Definition: Fargate 1.4
```

### 検証期間とコスト見積もり（1週間）

| サービス | 構成 | 月額概算 | 1週間概算 |
|---------|------|---------|----------|
| **VPC** | NAT Gateway 1台 | $32 | $8 |
| **ALB** | 1台 | $23 | $6 |
| **ECR** | 2リポジトリ, 10GB | $1 | $0.25 |
| **RDS** | db.t3.micro, 20GB | $25 | $6 |
| **ECS Fargate** | 2タスク, 0.5vCPU, 1GB | $20 | $5 |
| **データ転送** | 適量 | $5 | $1 |
| **合計** | - | **$106** | **$26** |

**💡 コスト削減のヒント**:
- 検証終了後は必ずリソースを削除
- 検証時間外（夜間・週末）はECSタスクを停止
- RDS自動バックアップを無効化（dev環境のため）

---

## 📋 前提条件

### ✅ 必須要件

- [x] **AWSアカウント**: 有効なAWSアカウント（管理者権限推奨）
- [x] **AWS CLI**: v2.0以上がインストール・設定済み
- [x] **Terraform**: v1.6以上がインストール済み
- [x] **Docker**: DockerデスクトップまたはDocker Engineが起動中
- [x] **Git**: プロジェクトをクローン済み
- [x] **Wizアカウント**: WizCloudアカウントとService Account作成済み

### 📦 必要なツール確認

```bash
# ツールのバージョン確認
aws --version          # aws-cli/2.x.x以上
terraform --version    # Terraform v1.6.x以上
docker --version       # Docker version 20.10.x以上
git --version          # git version 2.30.x以上
```

### 🔑 AWS認証情報の設定

```bash
# AWS CLIの設定（初回のみ）
aws configure

# 入力内容:
# AWS Access Key ID: AKIAXXXXXXXXXXXXXXXX
# AWS Secret Access Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Default region name: ap-northeast-1
# Default output format: json

# 認証確認
aws sts get-caller-identity
```

**期待される出力**:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### 🌏 リージョン設定

このプロジェクトでは**東京リージョン（ap-northeast-1）**を使用します：

```bash
# 環境変数で設定
export AWS_REGION=ap-northeast-1
export AWS_DEFAULT_REGION=ap-northeast-1

# 永続化（Bash）
echo 'export AWS_REGION=ap-northeast-1' >> ~/.bashrc
echo 'export AWS_DEFAULT_REGION=ap-northeast-1' >> ~/.bashrc

# 永続化（PowerShell）
[System.Environment]::SetEnvironmentVariable('AWS_REGION', 'ap-northeast-1', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_DEFAULT_REGION', 'ap-northeast-1', 'User')
```

---

## 🔧 Phase 1: Terraformバックエンド設定（オプション）

本番環境ではS3バックエンドを推奨しますが、検証環境ではローカルバックエンドでも可：

### オプション1: ローカルバックエンド（簡単、検証用）

```bash
# taskflow-appディレクトリに移動
cd ~/WizCodeVerification/taskflow-app

# dev環境に移動
cd terraform/environments/dev

# 初期化（バックエンド設定なし）
terraform init -backend=false
```

### オプション2: S3バックエンド（推奨、チーム共有用）

```bash
# S3バケット作成（バックエンド用）
aws s3 mb s3://wiz-code-verification-tfstate-$(aws sts get-caller-identity --query Account --output text) --region ap-northeast-1

# DynamoDBテーブル作成（ロック用）
aws dynamodb create-table \
  --table-name wiz-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1

# backend.tfファイルを作成
cat > terraform/environments/dev/backend.tf << 'EOF'
terraform {
  backend "s3" {
    bucket         = "wiz-code-verification-tfstate-<YOUR_ACCOUNT_ID>"
    key            = "dev/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "wiz-tfstate-lock"
  }
}
EOF

# 初期化
terraform init
```

---

## 🔧 Phase 2: ネットワークインフラのデプロイ

### ステップ1: Dev環境の変数設定

```bash
cd ~/WizCodeVerification/taskflow-app/terraform/environments/dev

# variables.tfの確認
cat variables.tf
```

### ステップ2: terraform.tfvarsファイルの作成

```bash
cat > terraform.tfvars << 'EOF'
# AWS Region
aws_region = "ap-northeast-1"

# Environment
environment = "dev"

# Project Name
project_name = "TaskFlow-WizVerification"

# Network Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["ap-northeast-1a", "ap-northeast-1c"]

# NAT Gateway (1週間検証用: 1台のみでコスト削減)
enable_nat_gateway = true
single_nat_gateway = true  # コスト削減のため1台のみ

# Database Configuration
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_engine_version    = "15.4"
db_name              = "taskflow"
db_username          = "taskflow_admin"

# ECS Configuration
ecs_task_cpu    = 512   # 0.5 vCPU
ecs_task_memory = 1024  # 1 GB

# Container Configuration
backend_container_port  = 3000
frontend_container_port = 3000

# Tags
tags = {
  Environment     = "dev"
  Project         = "TaskFlow-WizVerification"
  ManagedBy       = "Terraform"
  WizVerification = "true"
  CostCenter      = "Security-Testing"
}
EOF
```

### ステップ3: Terraform Plan実行

```bash
# 実行計画の確認
terraform plan -out=tfplan

# 期待される出力:
# Plan: 45 to add, 0 to change, 0 to destroy
#
# リソース一覧:
# - VPC
# - Subnets (public × 2, private × 2)
# - Internet Gateway
# - NAT Gateway × 1
# - Route Tables
# - Security Groups
# - ALB
# - ECR Repositories × 2
# - RDS PostgreSQL
# - ECS Cluster
# - IAM Roles
```

### ステップ4: Terraform Apply実行

```bash
# インフラのデプロイ（15-20分かかります）
terraform apply tfplan

# 進行状況:
# module.networking.aws_vpc.main: Creating...
# module.networking.aws_subnet.public[0]: Creating...
# ...
# module.rds.aws_db_instance.main: Still creating... [10m30s elapsed]
# ...
# Apply complete! Resources: 45 added, 0 changed, 0 destroyed.
```

### ステップ5: 出力値の確認

```bash
# デプロイ結果の確認
terraform output

# 期待される出力:
# alb_dns_name = "taskflow-alb-123456789.ap-northeast-1.elb.amazonaws.com"
# ecr_backend_repository_url = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/taskflow-backend"
# ecr_frontend_repository_url = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/taskflow-frontend"
# ecs_cluster_name = "taskflow-dev-cluster"
# rds_endpoint = "taskflow-dev-db.xxxxxx.ap-northeast-1.rds.amazonaws.com:5432"
# vpc_id = "vpc-0123456789abcdef0"
```

**💡 重要な出力値を保存**:
```bash
# 後で使用する値をエクスポート
export ECR_BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)
export ECR_FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
export ALB_DNS=$(terraform output -raw alb_dns_name)

# 保存を確認
echo "ECR Backend: $ECR_BACKEND_REPO"
echo "ECR Frontend: $ECR_FRONTEND_REPO"
echo "RDS Endpoint: $RDS_ENDPOINT"
echo "ALB DNS: $ALB_DNS"
```

---

## 🔧 Phase 3: Dockerイメージのビルドとプッシュ

### ステップ1: ECRログイン

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-northeast-1.amazonaws.com

# 期待される出力:
# Login Succeeded
```

### ステップ2: バックエンドイメージのビルドとプッシュ

```bash
# taskflow-appディレクトリに移動
cd ~/WizCodeVerification/taskflow-app

# バックエンドイメージのビルド
cd backend
docker build -t taskflow-backend:latest .

# タグ付け
docker tag taskflow-backend:latest $ECR_BACKEND_REPO:latest
docker tag taskflow-backend:latest $ECR_BACKEND_REPO:$(git rev-parse --short HEAD)

# ECRにプッシュ
docker push $ECR_BACKEND_REPO:latest
docker push $ECR_BACKEND_REPO:$(git rev-parse --short HEAD)

# プッシュ確認
aws ecr describe-images --repository-name taskflow-backend --region ap-northeast-1
```

### ステップ3: フロントエンドイメージのビルドとプッシュ

```bash
# フロントエンドディレクトリに移動
cd ../frontend

# フロントエンドイメージのビルド
docker build -t taskflow-frontend:latest .

# タグ付け
docker tag taskflow-frontend:latest $ECR_FRONTEND_REPO:latest
docker tag taskflow-frontend:latest $ECR_FRONTEND_REPO:$(git rev-parse --short HEAD)

# ECRにプッシュ
docker push $ECR_FRONTEND_REPO:latest
docker push $ECR_FRONTEND_REPO:$(git rev-parse --short HEAD)

# プッシュ確認
aws ecr describe-images --repository-name taskflow-frontend --region ap-northeast-1
```

---

## 🔧 Phase 4: データベース初期化

### ステップ1: RDS接続確認

```bash
# RDSエンドポイントの確認
echo $RDS_ENDPOINT

# PostgreSQLクライアントで接続テスト（EC2経由またはVPN経由）
# 注: RDSはプライベートサブネットにあるため、直接接続できません

# オプション1: Session Manager経由で接続（推奨）
# （別途EC2インスタンスが必要）

# オプション2: Cloud9環境を使用
# Cloud9環境をVPC内に作成して接続

# オプション3: ローカルからのポートフォワーディング
# SSMポートフォワーディングを使用
```

### ステップ2: データベーススキーマ作成

```bash
# バックエンドディレクトリに移動
cd ~/WizCodeVerification/taskflow-app/backend

# マイグレーションスクリプト実行
# （環境変数設定が必要）
export DATABASE_URL="postgresql://taskflow_admin:<PASSWORD>@$RDS_ENDPOINT/taskflow"

# マイグレーション実行例（アプリケーション依存）
npm run migrate

# または、SQLファイル直接実行
psql $DATABASE_URL -f db/schema.sql
```

---

## 🔧 Phase 5: ECS Fargateタスク起動

### ステップ1: ECSタスク定義の確認

```bash
# ECSタスク定義を確認
aws ecs list-task-definitions --region ap-northeast-1

# 期待される出力:
# {
#     "taskDefinitionArns": [
#         "arn:aws:ecs:ap-northeast-1:123456789012:task-definition/taskflow-backend:1",
#         "arn:aws:ecs:ap-northeast-1:123456789012:task-definition/taskflow-frontend:1"
#     ]
# }
```

### ステップ2: ECSサービス起動

```bash
# バックエンドサービス起動
aws ecs update-service \
  --cluster taskflow-dev-cluster \
  --service taskflow-backend-service \
  --desired-count 1 \
  --region ap-northeast-1

# フロントエンドサービス起動
aws ecs update-service \
  --cluster taskflow-dev-cluster \
  --service taskflow-frontend-service \
  --desired-count 1 \
  --region ap-northeast-1

# タスク起動確認（2-3分かかります）
aws ecs list-tasks --cluster taskflow-dev-cluster --region ap-northeast-1
```

### ステップ3: アプリケーション動作確認

```bash
# ALBのDNS名でアクセス
echo "Application URL: http://$ALB_DNS"

# ヘルスチェック確認
curl http://$ALB_DNS/health

# 期待される出力:
# {"status":"ok","database":"connected","version":"1.0.0"}
```

---

## 🔧 Phase 6: WizCloudとAWS連携設定

### ステップ1: WizCloud AWS Connector設定

1. **WizCloudにログイン**: https://app.wiz.io/

2. **Settings > Cloud Accounts** に移動

3. **Connect Cloud Account** をクリック

4. **AWS** を選択

5. **CloudFormation Stack**方式を選択（推奨）:
   ```
   1. CloudFormation テンプレートURLをコピー
   2. AWSコンソールでCloudFormation Stackを作成
   3. Wiz用のIAMロールとポリシーが自動作成される
   4. Stack作成完了後、External IDをWizに入力
   ```

6. **接続確認**:
   ```
   Settings > Cloud Accounts > AWS Account
   ├─ Status: Connected (緑)
   ├─ Last Scan: 数分前
   └─ Resources Discovered: 45個
   ```

### ステップ2: Code-to-Cloud連携設定

1. **GitHub Appが接続済みであることを確認**（S02で設定済み）

2. **WizCloud > Code > Settings** に移動

3. **Container Image Tracking** を有効化:
   ```
   ☑ Enable container image tracking
   ☑ Track images from ECR
   ☑ Link to source code repositories
   ```

4. **ECRリポジトリとGitHubリポジトリの紐付け**:
   ```
   ECR Repository: taskflow-backend
   ├─ GitHub Repository: your-org/WizCodeVerification
   ├─ Path: taskflow-app/backend
   └─ Dockerfile: taskflow-app/backend/Dockerfile

   ECR Repository: taskflow-frontend
   ├─ GitHub Repository: your-org/WizCodeVerification
   ├─ Path: taskflow-app/frontend
   └─ Dockerfile: taskflow-app/frontend/Dockerfile
   ```

5. **タグ付けルールの設定**:
   ```yaml
   # GitHub Actionsワークフロー（既に設定済み）
   - name: Dockerイメージスキャン
     run: |
       wizcli docker scan \
         --image taskflow-backend:${{ github.sha }} \
         --tag "source-repo=${{ github.repository }}" \
         --tag "source-branch=${{ github.ref_name }}" \
         --tag "source-commit=${{ github.sha }}" \
         --tag "dockerfile-path=backend/Dockerfile"
   ```

### ステップ3: Wiz Runtime Sensor デプロイ（オプション）

ランタイム脆弱性の優先順位付け（S08）のために、Wiz Sensorをデプロイ：

```bash
# Wiz Sensor DaemonSetをECSに追加
# （Wizコンソールから提供されるデプロイ手順に従う）

# または、ECS Task Definitionに Wiz Sidecar Container を追加
```

---

## 🔧 Phase 7: 検証シナリオ実行の準備

### S04: IaC Drift検出の準備

```bash
# Terraformで作成したリソースを手動変更してDriftを作成
aws ec2 modify-vpc-attribute \
  --vpc-id $(terraform output -raw vpc_id) \
  --enable-dns-hostnames

# Wiz IaC Drift スキャンを実行
# WizCloud > Code > Drift Detection で確認
```

### S06: SBOM生成とECRイメージ追跡

```bash
# SBOMは既にGitHub Actionsワークフローで生成済み
# taskflow-app/.github/workflows/S03-wiz-full-scan.yml

# WizCloudで確認:
# Code > Container Images > taskflow-backend > SBOM タブ
```

### S07: コンテナトレーサビリティ

```bash
# WizCloudで実行中のコンテナを確認:
# Cloud > Resources > ECS Tasks

# ソースコード追跡を確認:
# 1. ECS Task を選択
# 2. "Source Code" タブをクリック
# 3. GitHubリポジトリ、コミットSHA、Dockerfileへのリンクを確認
```

### S08: ランタイム脆弱性の優先順位付け

```bash
# WizCloudで実行中のコンテナの脆弱性を確認:
# Cloud > Vulnerabilities > Container Images
# フィルター: Runtime Status = Running

# Code-to-Cloudの優先順位付けを確認:
# - 実行中のコンテナの脆弱性が上位に表示される
# - 未使用のイメージの脆弱性は低優先度
```

### S09: IaC Drift検出

```bash
# Terraformコードと実環境の差分を検出
# WizCloud > Code > Drift Detection

# 手動変更の検出例:
# - セキュリティグループルールの追加
# - タグの変更
# - 設定値の変更
```

---

## 🔧 検証終了後のクリーンアップ

### ステップ1: ECSタスク停止

```bash
# ECSサービスのタスク数を0に設定
aws ecs update-service \
  --cluster taskflow-dev-cluster \
  --service taskflow-backend-service \
  --desired-count 0 \
  --region ap-northeast-1

aws ecs update-service \
  --cluster taskflow-dev-cluster \
  --service taskflow-frontend-service \
  --desired-count 0 \
  --region ap-northeast-1
```

### ステップ2: ECRイメージ削除

```bash
# ECRイメージを削除（オプション）
aws ecr batch-delete-image \
  --repository-name taskflow-backend \
  --image-ids imageTag=latest \
  --region ap-northeast-1

aws ecr batch-delete-image \
  --repository-name taskflow-frontend \
  --image-ids imageTag=latest \
  --region ap-northeast-1
```

### ステップ3: Terraform Destroy

```bash
# taskflow-app/terraform/environments/dev に移動
cd ~/WizCodeVerification/taskflow-app/terraform/environments/dev

# 削除プランの確認
terraform plan -destroy

# リソース削除（10-15分かかります）
terraform destroy -auto-approve

# 削除確認
# Destroy complete! Resources: 45 destroyed.
```

### ステップ4: Terraformバックエンドのクリーンアップ（S3使用時）

```bash
# S3バケットの削除
aws s3 rb s3://wiz-code-verification-tfstate-$(aws sts get-caller-identity --query Account --output text) --force --region ap-northeast-1

# DynamoDBテーブルの削除
aws dynamodb delete-table --table-name wiz-tfstate-lock --region ap-northeast-1
```

### ステップ5: WizCloud連携の無効化（オプション）

```
WizCloud > Settings > Cloud Accounts > AWS Account
└─ Actions > Disconnect

# 注: 検証継続の場合は接続を維持してください
```

---

## 📊 検証期間中のモニタリング

### AWSコスト確認

```bash
# 現在のコストを確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --region us-east-1

# または、AWSコンソールでCost Explorerを使用
# https://console.aws.amazon.com/cost-management/home#/cost-explorer
```

### リソース使用状況確認

```bash
# ECSタスクの状態確認
aws ecs describe-services \
  --cluster taskflow-dev-cluster \
  --services taskflow-backend-service taskflow-frontend-service \
  --region ap-northeast-1

# RDS使用率確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=taskflow-dev-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region ap-northeast-1
```

---

## 🔧 トラブルシューティング

### ❌ 問題1: Terraform Apply エラー

**症状**:
```
Error: Error creating VPC: VpcLimitExceeded
```

**原因と対処**:
```bash
# VPC上限の確認
aws ec2 describe-account-attributes --attribute-names vpc-max-elastic-ips

# 既存VPCの削除または上限緩和申請
aws support create-case ...
```

### ❌ 問題2: ECRプッシュエラー

**症状**:
```
denied: User: arn:aws:iam::xxx:user/xxx is not authorized to perform: ecr:InitiateLayerUpload
```

**原因と対処**:
```bash
# ECR権限の確認
aws ecr get-repository-policy --repository-name taskflow-backend

# 必要であれば権限追加
aws ecr set-repository-policy --repository-name taskflow-backend --policy-text file://policy.json
```

### ❌ 問題3: ECSタスク起動失敗

**症状**:
```
Task failed to start: CannotPullContainerError
```

**原因と対処**:
```bash
# タスクログの確認
aws ecs describe-tasks \
  --cluster taskflow-dev-cluster \
  --tasks <task-arn> \
  --region ap-northeast-1

# ECRイメージの存在確認
aws ecr describe-images --repository-name taskflow-backend --region ap-northeast-1

# タスク実行ロールの権限確認
aws iam get-role-policy --role-name ecsTaskExecutionRole --policy-name AmazonECSTaskExecutionRolePolicy
```

### ❌ 問題4: RDS接続エラー

**症状**:
```
could not connect to server: Connection timed out
```

**原因と対処**:
```bash
# セキュリティグループの確認
aws ec2 describe-security-groups --group-ids <rds-sg-id>

# NACLの確認
aws ec2 describe-network-acls --filters "Name=vpc-id,Values=<vpc-id>"

# RDSエンドポイントの疎通確認（VPC内のEC2から）
telnet $RDS_ENDPOINT 5432
```

---

## 📚 参考資料

### AWS公式ドキュメント
- [AWS ECS Developer Guide](https://docs.aws.amazon.com/ecs/)
- [Amazon ECR User Guide](https://docs.aws.amazon.com/ecr/)
- [Amazon RDS User Guide](https://docs.aws.amazon.com/rds/)
- [VPC User Guide](https://docs.aws.amazon.com/vpc/)

### Wiz公式ドキュメント
- [Wiz AWS Integration](https://docs.wiz.io/wiz-docs/docs/aws-integration)
- [Wiz Container Image Scanning](https://docs.wiz.io/wiz-docs/docs/container-image-scanning)
- [Wiz IaC Drift Detection](https://docs.wiz.io/wiz-docs/docs/iac-drift-detection)
- [Code-to-Cloud Traceability](https://docs.wiz.io/wiz-docs/docs/code-to-cloud)

### Terraform
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Modules](https://www.terraform.io/docs/language/modules/index.html)

---

**✅ AWS環境デプロイ完了**: これでPhase 2-3の検証に必要なAWSインフラ環境の準備が整いました。
