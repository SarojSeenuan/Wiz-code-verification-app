# S04: IaCスキャン

## 概要

Infrastructure as Code（Terraform、CloudFormation等）の設定ミスをデプロイ前に検出し、セキュリティリスクを未然に防ぐことを検証します。

## 検証目的

- IaC（Terraform）の設定ミスを自動検出できることを確認
- コンプライアンス基準（CIS、AWS Well-Architected等）との照合
- 修正のための具体的なガイダンス提供を評価

## 前提条件

### 必須ツール
- Terraform 1.6以上
- Wiz CLI
- Visual Studio Code（推奨）
- Git

### 必要な権限
- Wiz テナントへのアクセス
- Wiz CLI認証情報（Service Account）

### 環境変数
```bash
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
```

## 検証手順

### Step 1: 脆弱なTerraformコードの準備

意図的に問題のあるTerraformコードを作成します。

```hcl
# terraform/vulnerable/main.tf

# 問題1: パブリックアクセス可能なRDS
resource "aws_db_instance" "vulnerable_rds" {
  identifier           = "vulnerable-rds"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  username             = "admin"
  password             = "hardcoded_password123"  # ハードコードされたパスワード
  publicly_accessible  = true                     # パブリックアクセス有効
  skip_final_snapshot  = true

  # 問題: 暗号化なし
  storage_encrypted = false
}

# 問題2: 暗号化なしのS3バケット
resource "aws_s3_bucket" "vulnerable_bucket" {
  bucket = "my-vulnerable-bucket-${random_string.suffix.result}"
}

# 問題3: パブリックアクセスブロックの無効化
resource "aws_s3_bucket_public_access_block" "vulnerable_pab" {
  bucket = aws_s3_bucket.vulnerable_bucket.id

  block_public_acls       = false  # パブリックACL許可
  block_public_policy     = false  # パブリックポリシー許可
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 問題4: 過度に開放されたセキュリティグループ
resource "aws_security_group" "vulnerable_sg" {
  name        = "vulnerable-sg"
  description = "Overly permissive security group"

  ingress {
    description = "Allow all traffic from anywhere"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # 全世界に開放
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 問題5: ログが無効化されたS3バケット
# aws_s3_bucket_logging が定義されていない

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
```

### Step 2: ローカルでのIaCスキャン実行

```bash
# Wiz CLI認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# Terraformディレクトリのスキャン
wizcli iac scan --path ./terraform/vulnerable

# 詳細出力でスキャン
wizcli iac scan --path ./terraform/vulnerable --output-format json > iac-scan-results.json

# 特定のポリシーのみチェック
wizcli iac scan \
  --path ./terraform/vulnerable \
  --policy-hits-only \
  --severity HIGH,CRITICAL
```

### Step 3: CI/CDパイプラインでの自動スキャン

GitHub Actionsワークフローを作成します。

```yaml
# .github/workflows/S04-wiz-iac-scan.yml
name: S04 - IaC Security Scan

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches:
      - main
    paths:
      - 'terraform/**'

jobs:
  iac-scan:
    name: Terraform Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Wiz CLI
        run: |
          curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/

      - name: Authenticate with Wiz
        env:
          WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}
          WIZ_CLIENT_SECRET: ${{ secrets.WIZ_CLIENT_SECRET }}
        run: |
          wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

      - name: Scan Terraform configurations
        run: |
          wizcli iac scan \
            --path ./terraform \
            --output-format sarif \
            --output-file terraform-scan.sarif

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: terraform-scan.sarif
          category: terraform-security

      - name: Generate HTML report
        if: always()
        run: |
          wizcli iac scan \
            --path ./terraform \
            --output-format html > terraform-report.html

      - name: Upload scan report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: terraform-scan-report
          path: terraform-report.html

      - name: Check for critical issues
        run: |
          CRITICAL_COUNT=$(wizcli iac scan --path ./terraform --severity CRITICAL --format json | jq '.findings | length')
          if [ "$CRITICAL_COUNT" -gt 0 ]; then
            echo "Found $CRITICAL_COUNT critical issues!"
            exit 1
          fi
```

### Step 4: VSCode拡張機能での検証

1. **Wiz VSCode拡張機能を開く**
2. **Terraformファイルを開く**
3. **リアルタイムで問題が表示されることを確認**
4. **各問題の詳細と修正提案を確認**

### Step 5: 検出結果の確認

期待される検出項目:

| カテゴリ | 検出内容 | 重大度 |
|---------|---------|--------|
| ネットワーク露出 | RDSのパブリックアクセス有効化 | HIGH |
| 暗号化 | RDSストレージの暗号化なし | HIGH |
| シークレット | ハードコードされたDBパスワード | CRITICAL |
| ストレージセキュリティ | S3パブリックアクセスブロック無効 | HIGH |
| ネットワーク | セキュリティグループの過度な開放（0.0.0.0/0） | CRITICAL |
| ログ・監査 | S3バケットアクセスログの未設定 | MEDIUM |
| 暗号化 | S3バケット暗号化の未設定 | HIGH |

### Step 6: 修正版の作成と再スキャン

問題を修正したTerraformコードを作成します。

```hcl
# terraform/secure/main.tf

# 修正済み: セキュアなRDS
resource "aws_db_instance" "secure_rds" {
  identifier           = "secure-rds"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  username             = "admin"
  password             = random_password.db_password.result  # シークレット管理から取得
  publicly_accessible  = false                                # プライベート配置
  skip_final_snapshot  = true

  # 暗号化を有効化
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn

  # バックアップ設定
  backup_retention_period = 7

  # 監査ログ有効化
  enabled_cloudwatch_logs_exports = ["postgresql"]
}

# パスワード管理
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "rds-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# 暗号化キー
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

# セキュアなS3バケット
resource "aws_s3_bucket" "secure_bucket" {
  bucket = "my-secure-bucket-${random_string.suffix.result}"
}

# S3暗号化
resource "aws_s3_bucket_server_side_encryption_configuration" "secure_sse" {
  bucket = aws_s3_bucket.secure_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}

# パブリックアクセスブロック
resource "aws_s3_bucket_public_access_block" "secure_pab" {
  bucket = aws_s3_bucket.secure_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3アクセスログ
resource "aws_s3_bucket_logging" "secure_logging" {
  bucket = aws_s3_bucket.secure_bucket.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/"
}

# ログ用バケット
resource "aws_s3_bucket" "logs" {
  bucket = "logs-bucket-${random_string.suffix.result}"
}

# セキュアなセキュリティグループ
resource "aws_security_group" "secure_sg" {
  name        = "secure-sg"
  description = "Properly configured security group"

  # 特定のIPレンジからのHTTPSのみ許可
  ingress {
    description = "HTTPS from corporate network"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # 内部ネットワークのみ
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
```

再スキャンを実行:

```bash
# 修正版のスキャン
wizcli iac scan --path ./terraform/secure

# 修正前後の比較
echo "=== Vulnerable Configuration ==="
wizcli iac scan --path ./terraform/vulnerable --severity HIGH,CRITICAL

echo "=== Secure Configuration ==="
wizcli iac scan --path ./terraform/secure --severity HIGH,CRITICAL
```

## 期待される結果

### 脆弱なコード
- **CRITICAL問題**: 2-3件（ハードコードされたシークレット、全開放セキュリティグループ等）
- **HIGH問題**: 3-5件（暗号化なし、パブリックアクセス等）
- **MEDIUM問題**: 1-2件（ログ未設定等）

### 修正後のコード
- **CRITICAL問題**: 0件
- **HIGH問題**: 0件
- **MEDIUM問題**: 0件またはポリシー違反のみ

## 検証ポイント

### 1. 検出精度
- [ ] すべての意図的な設定ミスが検出される
- [ ] 重大度が適切に分類される
- [ ] False Positiveが少ない（10%未満）

### 2. フィードバック品質
- [ ] 各問題の説明が明確で理解しやすい
- [ ] 修正方法が具体的に提示される
- [ ] 関連するコンプライアンス基準が示される

### 3. 統合性
- [ ] VSCodeでリアルタイム検出が機能する
- [ ] CI/CDパイプラインで自動スキャンが実行される
- [ ] SARIF形式でGitHub Security Tabに連携される

### 4. パフォーマンス
- [ ] スキャン完了時間が許容範囲（大規模コードでも5分以内）
- [ ] 開発フローを妨げない

## トラブルシューティング

### 問題: スキャンが開始されない
```bash
# 認証状態を確認
wizcli auth status

# 再認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
```

### 問題: 特定のリソースタイプが検出されない
```bash
# サポートされているIaCフォーマットを確認
wizcli iac scan --help

# Terraformバージョンの確認
terraform version
```

### 問題: CI/CDパイプラインでスキャンが失敗する
```bash
# GitHub Secretsが正しく設定されているか確認
# Settings > Secrets and variables > Actions
# WIZ_CLIENT_ID, WIZ_CLIENT_SECRET が設定されていること
```

## 関連シナリオ

- [S03: CI/CD統合](S03-cicd-integration.md) - IaCスキャンをパイプラインに統合
- [S05: シークレット検出](S05-secret-detection.md) - IaC内のハードコードされたシークレット検出
- [S09: IaC Drift検出](../phase2-code-to-cloud/S09-iac-drift-detection.md) - デプロイ後の設定変更追跡

## 参考資料

- [Wiz IaCスキャンガイド](https://docs.wiz.io/wiz-docs/docs/iac-scanning)
- [Terraform IaCスキャンのベストプラクティス](https://docs.wiz.io/wiz-docs/docs/terraform-best-practices)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
