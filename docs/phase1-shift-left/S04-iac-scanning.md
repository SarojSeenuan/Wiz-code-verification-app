# シナリオ4: IaC（Infrastructure as Code）セキュリティスキャン

## 📋 シナリオ概要

### 目的
Infrastructure as Code（Terraform）の設定ミスをデプロイ前に検出し、クラウドインフラのセキュリティリスクを未然に防ぐWizの能力を検証します。

### 検証内容
- ✅ Terraformファイルのセキュリティ設定ミス検出
- ✅ コンプライアンス基準（CIS、AWS Well-Architected）との照合
- ✅ 具体的な修正ガイダンスの提供
- ✅ VSCode拡張機能によるリアルタイムフィードバック
- ✅ CI/CDパイプラインでの自動IaCスキャン

---

## ⏱️ 所要時間

| フェーズ | 所要時間 | 説明 |
|---------|---------|------|
| **初回セットアップ** | 45-60分 | Terraformファイル作成、ローカルスキャン、修正版作成 |
| **検証作業** | 30-40分 | WizCloud確認、VSCode拡張確認、エビデンス収集 |
| **再検証** | 15-20分 | 新しいブランチで同じIaCファイルをスキャン |

**💡 ヒント**: Terraformファイルは一度作成すれば再利用可能です。再検証時は新しいブランチにコピーするだけです。

---

## 📋 前提条件

### ✅ 必須要件
- [x] **シナリオ1完了**: Wiz Service Accountが作成済み、Wiz CLIインストール済み
- [x] **シナリオ2完了**: GitHubリポジトリが存在
- [x] **シナリオ3完了**: GitHub Actionsワークフローの基本理解
- [x] **Terraform**: Terraform 1.6以上がインストール済み
- [x] **VSCode**: Wiz拡張機能がインストール済み（シナリオ1で実施）

### 📦 必要なツール
```bash
# ツールのバージョン確認
terraform --version     # Terraform v1.6以上
wizcli version         # Wiz CLI（シナリオ1でインストール済み）
code --version         # VSCode 1.80以上
```

### 🔑 必要な情報
- Wiz Service Account認証情報（環境変数設定済み）
- GitHubリポジトリのURL

---

## 🗂️ 検証ブランチの作成

IaCスキャン検証専用のブランチを作成します：

```bash
# 既存リポジトリに移動
cd ~/wiz-code-verification/scenario-01

# 検証用ブランチを作成
git checkout -b scenario-04-iac-scanning

# Terraformディレクトリを作成
mkdir -p terraform/vulnerable terraform/secure

# ブランチの確認
git branch
# * scenario-04-iac-scanning
#   scenario-03-cicd-integration
#   main
```

**💡 ヒント**: このシナリオでは`terraform/vulnerable`（脆弱な設定）と`terraform/secure`（修正済み設定）の2つのディレクトリを作成して比較します。

---

## 🔧 手順1: 脆弱なTerraformコードの作成

### 1.1 意図的に問題のあるTerraformコードを作成

```bash
cat > terraform/vulnerable/main.tf << 'EOF'
# 意図的に脆弱な設定を含むTerraform構成
# 本番環境では絶対に使用しないでください

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# 問題1: パブリックアクセス可能なRDS（CRITICAL）
resource "aws_db_instance" "vulnerable_rds" {
  identifier           = "vulnerable-rds"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  username             = "admin"
  password             = "hardcoded_password123"  # ハードコードされたパスワード
  publicly_accessible  = true                     # パブリックアクセス有効
  skip_final_snapshot  = true
  storage_encrypted    = false                    # 暗号化なし

  tags = {
    Name        = "Vulnerable RDS"
    Environment = "test"
  }
}

# 問題2: パブリックアクセスブロックが無効なS3バケット（HIGH）
resource "aws_s3_bucket" "vulnerable_bucket" {
  bucket = "my-vulnerable-bucket-${random_string.suffix.result}"

  tags = {
    Name        = "Vulnerable S3 Bucket"
    Environment = "test"
  }
}

resource "aws_s3_bucket_public_access_block" "vulnerable_pab" {
  bucket = aws_s3_bucket.vulnerable_bucket.id

  block_public_acls       = false  # パブリックACL許可
  block_public_policy     = false  # パブリックポリシー許可
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 問題3: 過度に開放されたセキュリティグループ（CRITICAL）
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

  tags = {
    Name        = "Vulnerable Security Group"
    Environment = "test"
  }
}

# 問題4: ログが無効化されたS3バケット（MEDIUM）
# aws_s3_bucket_logging が定義されていない

# 問題5: 暗号化が無効なS3バケット（HIGH）
# aws_s3_bucket_server_side_encryption_configuration が定義されていない

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
EOF
```

### 1.2 Terraform設定の初期化

```bash
cd terraform/vulnerable

# Terraformの初期化（プロバイダーのダウンロード）
terraform init

# 構文チェック
terraform validate
# Success! The configuration is valid.
```

**💡 重要**: `terraform apply` は実行しません。スキャンのみ実施します。実際にAWSリソースをデプロイすると課金が発生します。

---

## 🔧 手順2: Wiz CLIによるローカルスキャン

### 2.1 基本的なIaCスキャンの実行

```bash
# プロジェクトルートに戻る
cd ~/wiz-code-verification/scenario-01

# 認証確認（シナリオ1で設定済み）
wizcli auth status

# IaCスキャンの実行
wizcli iac scan --path ./terraform/vulnerable

# 期待される出力:
# ✅ Authentication successful
# 🔍 Scanning IaC files in ./terraform/vulnerable
# ❌ Found 7 issues (3 CRITICAL, 3 HIGH, 1 MEDIUM)
```

### 2.2 詳細なスキャン結果の出力

```bash
# JSON形式で詳細出力
wizcli iac scan \
  --path ./terraform/vulnerable \
  --output iac-scan-results.json,json

# SARIF形式でGitHub Security用に出力
wizcli iac scan \
  --path ./terraform/vulnerable \
  --output iac-scan-results.sarif,sarif

# ポリシー違反のみ表示
wizcli iac scan \
  --path ./terraform/vulnerable \
  --policy "Default IaC policy" \
  --policy-hits-only \
  --severity HIGH,CRITICAL
```

### 2.3 スキャン結果の確認

```bash
# JSON結果をjqで整形して確認
cat iac-scan-results.json | jq '.findings[] | {
  severity: .severity,
  title: .title,
  file: .location.file,
  line: .location.line,
  recommendation: .recommendation
}'
```

**期待される検出項目**:

| 問題 | Severity | ファイル | 説明 |
|------|----------|---------|------|
| ハードコードされたDBパスワード | CRITICAL | main.tf:26 | パスワードがコードに直接記述されている |
| パブリックアクセス可能なRDS | HIGH | main.tf:27 | RDSがインターネットからアクセス可能 |
| RDS暗号化なし | HIGH | main.tf:29 | ストレージ暗号化が無効 |
| S3パブリックアクセスブロック無効 | HIGH | main.tf:45-48 | S3バケットが公開される可能性 |
| セキュリティグループ全開放 | CRITICAL | main.tf:57-61 | 0.0.0.0/0からすべてのポートが開放 |
| S3暗号化なし | HIGH | main.tf | 暗号化設定が存在しない |
| S3ログなし | MEDIUM | main.tf | アクセスログが無効 |

---

## 🔧 手順3: WizCloudコンソールでの結果確認

### 3.1 Code Scansページでの確認

1. **WizCloudにログイン**: https://app.wiz.io/
2. **Code** > **Scans** に移動
3. リポジトリ名で検索: `scenario-01`

**確認ポイント**:
```
最新のIaCスキャン結果が表示されている
├─ Scan Type: IaC (Terraform)
├─ Issues Found: 7
├─ Critical: 3
├─ High: 3
└─ Medium: 1
```

### 3.2 Code Issuesページでの詳細確認

```
Code > Issues に移動
├─ フィルター: "Repository = scenario-01" & "Severity = CRITICAL"
└─ 検出されたIssuesの例:
    ├─ [IaC] Hardcoded database password
    │   ├─ File: terraform/vulnerable/main.tf:26
    │   ├─ Resource: aws_db_instance.vulnerable_rds
    │   └─ Recommendation: Use AWS Secrets Manager or Parameter Store
    │
    ├─ [IaC] Security group allows unrestricted ingress
    │   ├─ File: terraform/vulnerable/main.tf:57-61
    │   ├─ Resource: aws_security_group.vulnerable_sg
    │   └─ Recommendation: Restrict source CIDR to specific IP ranges
    │
    └─ [IaC] S3 bucket public access not blocked
        ├─ File: terraform/vulnerable/main.tf:45-48
        ├─ Resource: aws_s3_bucket_public_access_block.vulnerable_pab
        └─ Recommendation: Set all public access block settings to true
```

---

## 🔧 手順4: VSCode拡張機能でのリアルタイムスキャン

### 4.1 VSCodeでのTerraformファイルの確認

```bash
# VSCodeでプロジェクトを開く
code ~/wiz-code-verification/scenario-01
```

### 4.2 Wiz拡張機能での問題確認

1. `terraform/vulnerable/main.tf` をVSCodeで開く
2. Wiz拡張機能が自動的にスキャンを開始
3. 問題のある行に波線（squiggly line）が表示される

**期待される表示**:
```
Line 26: password = "hardcoded_password123"
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         🔴 Hardcoded secret detected
         Severity: CRITICAL

         Recommendation:
         Store sensitive values in AWS Secrets Manager:

         data "aws_secretsmanager_secret_version" "db_password" {
           secret_id = "rds-password"
         }

         password = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string)["password"]
```

4. **Problems パネル**（Ctrl+Shift+M）で全問題を確認
5. 各問題をクリックして該当行にジャンプ

---

## 🔧 手順5: 修正済みTerraformコードの作成

### 5.1 セキュアな設定の作成

```bash
cat > terraform/secure/main.tf << 'EOF'
# セキュアな設定のTerraform構成
# ベストプラクティスに従った実装

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# 修正1: セキュアなRDS（パスワード管理、暗号化、プライベート配置）
resource "aws_db_instance" "secure_rds" {
  identifier           = "secure-rds"
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  username             = "admin"
  password             = random_password.db_password.result  # ランダムパスワード生成
  publicly_accessible  = false                                # プライベート配置
  skip_final_snapshot  = true
  storage_encrypted    = true                                 # 暗号化有効
  kms_key_id          = aws_kms_key.rds.arn                  # KMS暗号化キー

  # バックアップ設定
  backup_retention_period = 7

  # 監査ログ有効化
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "Secure RDS"
    Environment = "test"
  }
}

# パスワード生成
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Secrets Managerにパスワードを保存
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "rds-password-${random_string.suffix.result}"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.secure_rds.username
    password = random_password.db_password.result
  })
}

# RDS暗号化用KMSキー
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "RDS Encryption Key"
  }
}

# 修正2: セキュアなS3バケット（暗号化、パブリックアクセスブロック、ログ有効）
resource "aws_s3_bucket" "secure_bucket" {
  bucket = "my-secure-bucket-${random_string.suffix.result}"

  tags = {
    Name        = "Secure S3 Bucket"
    Environment = "test"
  }
}

# S3暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "secure_sse" {
  bucket = aws_s3_bucket.secure_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}

# パブリックアクセスブロック（すべて有効）
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

  tags = {
    Name = "Logs Bucket"
  }
}

# S3暗号化用KMSキー
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "S3 Encryption Key"
  }
}

# 修正3: セキュアなセキュリティグループ（最小権限原則）
resource "aws_security_group" "secure_sg" {
  name        = "secure-sg"
  description = "Properly configured security group with least privilege"

  # 特定のIPレンジからのHTTPSのみ許可
  ingress {
    description = "HTTPS from corporate network only"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # 内部ネットワークのみ
  }

  # Egressも必要最小限に制限
  egress {
    description = "HTTPS to internet for updates"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "Secure Security Group"
    Environment = "test"
  }
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
EOF
```

### 5.2 修正版のスキャン

```bash
# 修正版のスキャン
wizcli iac scan --path ./terraform/secure

# 期待される出力:
# ✅ Authentication successful
# 🔍 Scanning IaC files in ./terraform/secure
# ✅ No critical or high severity issues found
# ℹ️  Found 0 issues (0 CRITICAL, 0 HIGH, 0 MEDIUM)
```

### 5.3 修正前後の比較

```bash
# スキャン結果の比較スクリプト
cat > compare_iac_scans.sh << 'EOF'
#!/bin/bash

echo "========================================="
echo "Vulnerable Configuration Scan Results"
echo "========================================="
wizcli iac scan --path ./terraform/vulnerable --severity HIGH,CRITICAL

echo ""
echo "========================================="
echo "Secure Configuration Scan Results"
echo "========================================="
wizcli iac scan --path ./terraform/secure --severity HIGH,CRITICAL

echo ""
echo "✅ Comparison complete!"
EOF

chmod +x compare_iac_scans.sh
./compare_iac_scans.sh
```

---

## 🔧 手順6: GitHub Actionsでの自動IaCスキャン

### 6.1 IaCスキャン専用ワークフローの作成（オプション）

```bash
cat > .github/workflows/S04-wiz-iac-scan.yml << 'EOF'
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

permissions:
  contents: read
  security-events: write

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
        run: |
          wizcli auth --id "${{ secrets.WIZ_CLIENT_ID }}" --secret "${{ secrets.WIZ_CLIENT_SECRET }}"

      - name: Scan Terraform configurations
        id: iac_scan
        run: |
          wizcli iac scan \
            --path ./terraform \
            --output terraform-scan.sarif,sarif \
            --output terraform-scan.json,json \
            --policy "Default IaC policy" \
            --policy-hits-only
        continue-on-error: true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: terraform-scan.sarif
          category: terraform-security

      - name: Upload scan results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: terraform-scan-results
          path: |
            terraform-scan.sarif
            terraform-scan.json

      - name: Check for critical issues
        if: steps.iac_scan.outcome == 'failure'
        run: |
          echo "❌ IaC scan found policy violations"
          cat terraform-scan.json | jq '.summary'
          exit 1
EOF
```

**💡 ヒント**: シナリオ3で作成した`wiz-iac-scan.yml`がある場合は、このステップはスキップできます。

---

## ✅ 検証チェックリスト

以下のチェックリストを使用して、シナリオ4の検証が完了したことを確認してください：

### Terraformファイル作成
- [ ] `terraform/vulnerable/main.tf` が作成され、意図的な脆弱性が含まれている
- [ ] `terraform init` が成功し、プロバイダーがダウンロードされた
- [ ] `terraform validate` でTerraform構文が正しいことを確認

### ローカルIaCスキャン
- [ ] `wizcli iac scan` が正常に実行される
- [ ] 7つ程度の問題が検出される（CRITICAL 3件、HIGH 3件、MEDIUM 1件）
- [ ] JSON形式とSARIF形式で結果が出力される
- [ ] 各問題に具体的な修正提案が含まれている

### WizCloud確認
- [ ] Code > Scansページに最新のIaCスキャン結果が表示される
- [ ] Code > Issuesページで個別の問題詳細を確認できる
- [ ] ファイル名と行番号が正しく記録されている
- [ ] Recommendationに具体的な修正方法が記載されている

### VSCode拡張機能
- [ ] VSCodeでTerraformファイルを開くと自動スキャンが実行される
- [ ] 問題のある行に波線（squiggly line）が表示される
- [ ] Problemsパネルですべての問題が一覧表示される
- [ ] 問題をクリックすると該当行にジャンプする

### 修正済み設定
- [ ] `terraform/secure/main.tf` が作成され、すべての問題が修正されている
- [ ] 修正版のスキャンでCRITICAL/HIGH問題が0件になる
- [ ] 修正前後の比較スクリプトが正常に動作する

### GitHub Actions統合（オプション）
- [ ] IaCスキャンワークフローが作成されている
- [ ] Terraformファイルの変更時にワークフローが自動実行される
- [ ] GitHub SecurityタブにIaC問題がアップロードされる

---

## 📸 エビデンス収集

以下の画面をスクリーンショットとして保存し、検証レポートに添付してください：

### 必須エビデンス（6-8枚）

| # | スクリーンショット | 取得タイミング | ファイル名例 |
|---|------------------|--------------|--------------|
| 1 | **ローカルIaCスキャン結果** | `wizcli iac scan`実行後 | `s04-01-local-scan-results.png` |
|   | ターミナルに表示される検出結果の全体 |  |  |
| 2 | **JSON結果の詳細** | `jq`でJSON整形後 | `s04-02-json-details.png` |
|   | 問題の詳細とRecommendation |  |  |
| 3 | **WizCloud Scans画面** | WizCloudログイン後 | `s04-03-wizcloud-scans.png` |
|   | IaCスキャン結果が表示されている |  |  |
| 4 | **WizCloud Issues詳細** | Issuesページで問題クリック後 | `s04-04-wizcloud-issue-detail.png` |
|   | CRITICALまたはHIGH問題の詳細画面 |  |  |
| 5 | **VSCode Wiz拡張機能** | Terraformファイルを開いた状態 | `s04-05-vscode-inline-warnings.png` |
|   | 波線と問題の説明が表示されている |  |  |
| 6 | **VSCode Problemsパネル** | Ctrl+Shift+M押下後 | `s04-06-vscode-problems-panel.png` |
|   | すべての問題が一覧表示 |  |  |
| 7 | **修正版スキャン結果** | セキュア版スキャン後 | `s04-07-secure-scan-clean.png` |
|   | 問題が0件になったことを示す |  |  |
| 8 | **修正前後の比較** | 比較スクリプト実行後 | `s04-08-before-after-comparison.png` |
|   | 脆弱版と修正版の結果を並べて表示 |  |  |

### オプションエビデンス
- [ ] GitHub Actions IaCスキャンワークフローのログ
- [ ] GitHub Security タブのIaC問題表示
- [ ] Terraformファイルのコード比較（diff表示）

---

## 🔧 トラブルシューティング

### 問題1: IaCスキャンが開始されない

**症状**:
```
Error: Failed to scan IaC files
Authentication required
```

**原因**: Wiz CLIの認証が期限切れ、または環境変数が未設定

**解決策**:
```bash
# 認証状態を確認
wizcli auth status

# 再認証
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# 環境変数の確認（最初の5文字のみ表示）
echo "Client ID: ${WIZ_CLIENT_ID:0:5}..."
```

---

### 問題2: VSCodeでリアルタイムスキャンが動作しない

**症状**: Terraformファイルを開いても問題が表示されない

**原因**: Wiz拡張機能が無効、または認証が必要

**解決策**:
```bash
# 1. Wiz拡張機能の状態を確認
# VSCode: Extensions > Wiz > Enabled になっているか確認

# 2. Wiz拡張機能の出力ログを確認
# VSCode: View > Output > Wiz を選択してログを確認

# 3. VSCodeからWiz認証
# Command Palette (Ctrl+Shift+P) > "Wiz: Authenticate"

# 4. VSCodeを再起動
```

---

### 問題3: Terraformの初期化に失敗する

**症状**:
```
Error: Failed to install provider
terraform init failed
```

**原因**: ネットワーク問題、またはTerraformバージョンの不一致

**解決策**:
```bash
# 1. Terraformバージョンを確認
terraform --version
# Terraform v1.6.0以上であることを確認

# 2. プロバイダーキャッシュをクリア
rm -rf .terraform .terraform.lock.hcl

# 3. 再度初期化
terraform init

# 4. 特定のミラーを使用（企業プロキシ環境の場合）
terraform init -plugin-dir=/path/to/plugins
```

---

### 問題4: 問題が検出されない、または少なすぎる

**症状**: 脆弱なTerraformコードをスキャンしても問題が検出されない

**原因**: ポリシー設定、またはスキャン対象の指定ミス

**解決策**:
```bash
# 1. ファイルが正しく配置されているか確認
ls -la terraform/vulnerable/
# main.tf が存在することを確認

# 2. すべての重大度で再スキャン
wizcli iac scan --path ./terraform/vulnerable --severity ALL

# 3. ポリシーを指定せずにスキャン
wizcli iac scan --path ./terraform/vulnerable

# 4. デバッグモードでスキャン
wizcli iac scan --path ./terraform/vulnerable --verbose
```

---

## 🎓 まとめ

### このシナリオで検証できたこと

✅ **IaC設定ミスの自動検出**: Terraformファイルのセキュリティ問題を自動的に検出
✅ **コンプライアンス照合**: CIS、AWS Well-Architected基準との照合
✅ **具体的な修正ガイダンス**: 各問題に対する具体的な修正方法の提示
✅ **リアルタイムフィードバック**: VSCode拡張機能によるコーディング中の問題検出
✅ **シフトレフト実現**: デプロイ前にインフラのセキュリティリスクを検出・修正

### 主要なメリット

| メリット | 説明 |
|---------|------|
| **早期検出** | クラウドリソースをデプロイする前に問題を発見 |
| **コスト削減** | 本番環境での設定ミス修正コストを削減 |
| **学習効果** | 開発者がセキュアなIaCベストプラクティスを学習 |
| **コンプライアンス** | 業界標準への自動準拠確認 |

---

## 🔄 次のステップ

シナリオ4が完了したら、次のシナリオに進みます：

- **[シナリオ5: シークレット検出](./S05-secret-detection.md)**: ハードコードされた認証情報の検出と防止
- **[シナリオ6: SBOM生成と追跡](../phase2-code-to-cloud/S06-sbom-tracking.md)**: ソフトウェア部品表の生成と依存関係追跡

---

## 📚 参考資料

### Wiz公式ドキュメント
- [Wiz IaCスキャンガイド](https://docs.wiz.io/wiz-docs/docs/iac-scanning)
- [Terraform IaCスキャンのベストプラクティス](https://docs.wiz.io/wiz-docs/docs/terraform-best-practices)
- [Wiz IaCポリシー設定](https://docs.wiz.io/wiz-docs/docs/iac-policies)

### AWS公式ドキュメント
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

### セキュリティ基準
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [PCI DSS Cloud Security Guidelines](https://www.pcisecuritystandards.org/)

---

**📝 注意事項**: このシナリオで使用するTerraformコードには、意図的にセキュリティ脆弱性が含まれています。Wizの検出機能をテストするためのものであり、`terraform apply` で実際にAWSにデプロイしないでください。

**💡 ヒント**: 再検証時は、新しいブランチを作成してTerraformファイルをコピーすると、履歴を保ちながら複数回の検証が可能です（詳細は [BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md) を参照）。
