# シナリオ4: IaC（Infrastructure as Code）セキュリティスキャン

## 📋 シナリオ概要

### 目的
Infrastructure as Code（Terraform）の設定ミスをデプロイ前に検出し、クラウドインフラのセキュリティリスクを未然に防ぐWizの能力を検証します。

### 検証内容
- ✅ Terraformファイルのセキュリティ設定ミス検出
- ✅ 脆弱な設定（vulnerable）とセキュアな設定（dev/prod）の比較
- ✅ コンプライアンス基準（CIS、AWS Well-Architected）との照合
- ✅ VSCode拡張機能によるリアルタイムフィードバック
- ✅ CI/CDパイプラインでの自動IaCスキャン
- ✅ GitHub Security統合とSARIF形式レポート

---

## ⏱️ 所要時間

| フェーズ | 所要時間 | 説明 |
|---------|---------|------|
| **初回セットアップ** | 30-40分 | 既存Terraformファイル確認、ワークフロー実行 |
| **検証作業** | 20-30分 | WizCloud確認、VSCode拡張確認、エビデンス収集 |
| **再検証** | 10-15分 | 新しいブランチで同じ検証を実施 |

**💡 ヒント**: 既存のTerraformファイルとワークフローを使用するため、設定は最小限で済みます。

---

## 📋 前提条件

### ✅ 必須要件
- [x] **シナリオ1完了**: Wiz Service Accountが作成済み、Wiz CLIインストール済み
- [x] **シナリオ2完了**: GitHubリポジトリが存在
- [x] **シナリオ3完了**: GitHub Actionsワークフローの基本理解、Secretsが設定済み
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
- Wiz Service Account認証情報（シナリオ3でGitHub Secretsに設定済み）
- GitHubリポジトリのURL

---

## 📁 プロジェクト構造の確認

このシナリオでは、**既存の`taskflow-app`プロジェクト**のTerraform構成を使用します。

### ディレクトリ構造

```
WizCodeVerification/
└── taskflow-app/
    ├── .github/
    │   └── workflows/
    │       └── S04-wiz-iac-scan.yml        ⭐ 既存のIaCスキャンワークフロー
    └── terraform/
        ├── modules/                         # 再利用可能なモジュール
        │   ├── ecr/                        # ECRリポジトリ
        │   ├── ecs/                        # ECS Fargate
        │   ├── networking/                 # VPC, subnet, NAT, ALB
        │   └── rds/                        # RDS PostgreSQL
        └── environments/                    # 環境別設定
            ├── dev/                        ⭐ セキュアな開発環境設定
            │   ├── main.tf
            │   ├── variables.tf
            │   └── outputs.tf
            ├── prod/                       ⭐ セキュアな本番環境設定
            │   ├── main.tf
            │   ├── variables.tf
            │   └── outputs.tf
            └── vulnerable/                 ⭐ 検証用の脆弱な設定
                ├── main.tf
                ├── variables.tf
                └── outputs.tf
```

### 🎯 検証対象

| 環境 | パス | 目的 | 期待される検出 |
|------|------|------|--------------|
| **vulnerable** | `terraform/environments/vulnerable/` | Wizの検出能力を検証 | CRITICAL 3件、HIGH 5件、MEDIUM 2件 |
| **dev** | `terraform/environments/dev/` | セキュアな設定の確認 | 検出なし（ベストプラクティス準拠） |
| **prod** | `terraform/environments/prod/` | セキュアな設定の確認 | 検出なし（ベストプラクティス準拠） |

---

## 🔧 手順1: 既存Terraformファイルの確認

### 1.1 脆弱な設定の確認（vulnerable環境）

既存の脆弱なTerraform設定を確認します：

```bash
# taskflow-appディレクトリに移動
cd ~/WizCodeVerification/taskflow-app

# 脆弱な設定ファイルを確認
cat terraform/environments/vulnerable/main.tf
```

**意図的に含まれている脆弱性**:

| 問題 | リソース | 重大度 | 設定 |
|------|---------|--------|------|
| **ハードコードパスワード** | `aws_db_instance.vulnerable_rds` | CRITICAL | `password = "hardcoded_password123"` |
| **パブリックRDS** | `aws_db_instance.vulnerable_rds` | CRITICAL | `publicly_accessible = true` |
| **全ポート開放** | `aws_security_group.vulnerable_sg` | CRITICAL | `cidr_blocks = ["0.0.0.0/0"]`, `from_port = 0` |
| **RDS暗号化なし** | `aws_db_instance.vulnerable_rds` | HIGH | `storage_encrypted = false` |
| **S3パブリックアクセス** | `aws_s3_bucket_public_access_block` | HIGH | `block_public_acls = false` |
| **S3暗号化なし** | `aws_s3_bucket.vulnerable_bucket` | HIGH | 暗号化設定なし |
| **EBS暗号化なし** | `aws_ebs_volume.vulnerable_ebs` | HIGH | `encrypted = false` |
| **SSH/RDP開放** | `aws_security_group.vulnerable_sg` | HIGH | port 22, 3389を`0.0.0.0/0`に開放 |
| **S3ログなし** | `aws_s3_bucket.vulnerable_bucket` | MEDIUM | ログ設定なし |
| **RDSバックアップなし** | `aws_db_instance.vulnerable_rds` | MEDIUM | `backup_retention_period = 0` |

**期待される検出結果（outputs.tfに記載）**:
```bash
# 検出結果サマリーを確認
cat terraform/environments/vulnerable/outputs.tf
```

### 1.2 セキュアな設定の確認（dev環境）

ベストプラクティスに準拠したセキュアな設定を確認します：

```bash
# dev環境の設定を確認
cat terraform/environments/dev/main.tf
```

**セキュアな設定のポイント**:

| 設定項目 | セキュア設定 | 説明 |
|---------|------------|------|
| **RDS暗号化** | `storage_encrypted = true` | データ暗号化有効 |
| **RDS非公開** | `publicly_accessible = false` | プライベートサブネットに配置 |
| **パスワード管理** | AWS Secrets Managerまたは変数 | ハードコード禁止 |
| **S3暗号化** | `aws_s3_bucket_server_side_encryption_configuration` | AES256またはKMS暗号化 |
| **S3ブロック** | `block_public_acls = true` | パブリックアクセスブロック |
| **セキュリティグループ** | 最小権限の原則 | 必要なポート・送信元のみ許可 |
| **ログ記録** | CloudWatch Logs有効 | 監査証跡の記録 |
| **バックアップ** | `backup_retention_period = 7` | 自動バックアップ有効 |

### 1.3 Terraformモジュール構造の確認

再利用可能なモジュールを確認：

```bash
# モジュール一覧を確認
ls -la terraform/modules/

# ECRモジュールの例
cat terraform/modules/ecr/main.tf
```

**モジュールの利点**:
- ✅ DRY原則（Don't Repeat Yourself）
- ✅ セキュアな設定を標準化
- ✅ 環境間で一貫性を保つ
- ✅ 変更を一箇所で管理

---

## 🔧 手順2: VSCode拡張機能でのリアルタイムスキャン

### 2.1 VSCodeでTerraformファイルを開く

```bash
# VSCodeでvulnerable環境のファイルを開く
code terraform/environments/vulnerable/main.tf
```

### 2.2 Wiz拡張機能によるリアルタイム検出の確認

VSCodeでファイルを開くと、Wiz拡張機能が自動的にスキャンを開始します：

**確認ポイント**:

1. **問題の下線表示**:
   - ハードコードされたパスワード（line 53）に赤い波線
   - `publicly_accessible = true`（line 54）に赤い波線
   - セキュリティグループの`0.0.0.0/0`（line 118）に赤い波線

2. **ホバー時の詳細情報**:
   ```
   ⚠️  [Wiz] Hardcoded database password detected
   Severity: CRITICAL

   Hardcoded passwords in code can be extracted from version control.
   Use AWS Secrets Manager or environment variables instead.

   Recommendation:
   - Store password in AWS Secrets Manager
   - Reference via data source: data.aws_secretsmanager_secret_version
   ```

3. **Problems パネル**:
   - VSCodeの下部「Problems」タブを開く
   - Wizが検出した全問題が一覧表示される
   - 重大度（CRITICAL/HIGH/MEDIUM）でフィルタリング可能

### 2.3 セキュアな設定との比較

```bash
# dev環境のファイルを開いて比較
code terraform/environments/dev/main.tf
```

**確認ポイント**:
- ✅ Problems パネルに警告が表示されない
- ✅ セキュアな設定では下線が表示されない
- ✅ Wizがベストプラクティスを認識している

---

## 🔧 手順3: Wiz CLI によるローカルスキャン

### 3.1 vulnerable環境のスキャン

```bash
# vulnerable環境をスキャン
wizcli iac scan \
  --path terraform/environments/vulnerable \
  --name "vulnerable-env-local-scan" \
  --tag "environment=vulnerable" \
  --tag "scan-type=local" \
  --policy-hits-only

# 期待される出力:
# ✗ Found 10 policy violations
# CRITICAL: 3
# HIGH: 5
# MEDIUM: 2
```

### 3.2 dev環境のスキャン

```bash
# dev環境をスキャン（セキュアな設定）
wizcli iac scan \
  --path terraform/environments/dev \
  --name "dev-env-local-scan" \
  --tag "environment=dev" \
  --tag "scan-type=local" \
  --policy-hits-only

# 期待される出力:
# ✓ No policy violations found
```

### 3.3 全体スキャン

```bash
# Terraformディレクトリ全体をスキャン
wizcli iac scan \
  --path terraform \
  --name "terraform-full-scan" \
  --output iac-scan-results.json,json \
  --policy-hits-only

# JSON結果の確認
cat iac-scan-results.json | jq '.issues[] | {severity, resource, message}'
```

---

## 🔧 手順4: 既存ワークフローの確認

### 4.1 IaCスキャンワークフローの内容確認

既存のワークフローファイルを確認します：

```bash
# ワークフローファイルを確認
cat .github/workflows/S04-wiz-iac-scan.yml
```

**ワークフローの主要な構成**:

1. **トリガー設定**:
   ```yaml
   on:
     push:
       branches: [main, develop]
       paths: ['terraform/**']
     pull_request:
       branches: [main]
       paths: ['terraform/**']
   ```
   - Terraformファイル変更時のみトリガー
   - パフォーマンス最適化

2. **スキャンジョブ**:
   - Terraform全体スキャン
   - Dev環境スキャン
   - Prod環境スキャン
   - Vulnerable環境スキャン（SARIF出力）

3. **検証ジョブ**:
   - Terraform format check
   - Terraform validate
   - Terraform plan（PRの場合）

### 4.2 ワークフローの重要な機能

| 機能 | 説明 | ファイル内の位置 |
|------|------|-----------------|
| **permissions設定** | `security-events: write`でGitHub Security統合 | line 21-24 |
| **paths フィルター** | terraform/**変更時のみトリガー | line 13-14, 18-19 |
| **SARIF出力** | vulnerable環境のみSARIF生成 | line 94-96 |
| **GitHub Security統合** | SARIFアップロードでアラート表示 | line 99-104 |
| **Artifact保存** | スキャン結果を保存 | line 107-113 |
| **continue-on-error** | スキャン失敗でもワークフロー継続 | line 97 |

---

## 🗂️ 検証ブランチの作成

IaCスキャン検証専用のブランチを作成します：

```bash
# taskflow-appディレクトリに移動
cd ~/WizCodeVerification/taskflow-app

# 検証用ブランチを作成
git checkout -b scenario-04-iac-verification-$(date +%Y%m%d)

# ブランチの確認
git branch
```

---

## 🔧 手順5: ワークフローのトリガーとテスト

### 5.1 Terraformファイルの軽微な変更

```bash
# vulnerable環境のREADME追加（ワークフロートリガー用）
cat > terraform/environments/vulnerable/README.md << 'EOF'
# Vulnerable Terraform Configuration

**⚠️ 警告**: このディレクトリは検証目的で意図的に脆弱な設定を含んでいます。

## 期待される検出結果

- CRITICAL: 3件
- HIGH: 5件
- MEDIUM: 2件

詳細は `outputs.tf` を参照してください。
EOF

# 変更を確認
git status
```

### 5.2 コミットとプッシュ

```bash
# 変更をステージング
git add terraform/environments/vulnerable/README.md

# コミット
git commit -m "S04: Add vulnerable environment documentation

- Add README for vulnerable Terraform configuration
- Trigger IaC scan workflow
- Verify Wiz detection capabilities"

# GitHubにプッシュ（mainブランチにマージしてトリガー）
git push -u origin $(git branch --show-current)

# プルリクエストを作成（これによりワークフローがトリガーされる）
gh pr create \
  --title "S04: IaC Scanning Verification" \
  --body "Terraform IaC security scanning test for scenario S04" \
  --base main
```

### 5.3 GitHub Actionsの実行確認

```bash
# ワークフローの実行状況を確認
gh run list --workflow="S04-wiz-iac-scan.yml" --limit 5

# 最新のワークフローをウォッチ
gh run watch
```

**期待される実行ログ**:

```
terraform-iac-scan
├─ ✅ コードチェックアウト
├─ ✅ Terraformセットアップ
├─ ✅ Terraformフォーマットチェック
├─ ✅ Wiz CLIダウンロード
├─ ✅ Wiz認証
├─ ✅ Terraform全体スキャン (3 environments scanned)
├─ ✅ Terraform Dev環境スキャン (No violations)
├─ ✅ Terraform Prod環境スキャン (No violations)
├─ ❌ Terraform Vulnerable環境スキャン (10 violations found)
├─ 📤 SARIF結果をGitHub Securityにアップロード
└─ 📦 スキャン結果をArtifactとして保存

terraform-validation
├─ ✅ Terraformセットアップ
├─ ✅ Terraform Init (dev)
├─ ✅ Terraform Validate (dev)
├─ ✅ Terraform Init (prod)
└─ ✅ Terraform Validate (prod)
```

---

## 🔧 手順6: GitHub Securityタブでの結果確認

### 6.1 Code Scanningアラートの確認

1. GitHubリポジトリを開く
2. **Security** タブをクリック
3. **Code scanning** を選択
4. フィルター: `is:open branch:scenario-04-iac-verification-YYYYMMDD`

**期待される結果**:

| Severity | Rule | File | Line |
|----------|------|------|------|
| CRITICAL | Hardcoded database password | terraform/environments/vulnerable/main.tf | 53 |
| CRITICAL | Database publicly accessible | terraform/environments/vulnerable/main.tf | 54 |
| CRITICAL | Security group allows all traffic | terraform/environments/vulnerable/main.tf | 118 |
| HIGH | RDS storage not encrypted | terraform/environments/vulnerable/main.tf | 56 |
| HIGH | S3 bucket allows public access | terraform/environments/vulnerable/main.tf | 89-92 |

### 6.2 アラートの詳細確認

アラートをクリックして詳細を確認：

```
⚠️  CRITICAL: Hardcoded database password detected

Description:
The RDS instance 'vulnerable_rds' contains a hardcoded password.
Hardcoded credentials in code can be extracted from version control
history and pose a significant security risk.

Location:
File: terraform/environments/vulnerable/main.tf
Line: 53
Code:
  password = "hardcoded_password123"  # ハードコードされたパスワード

Recommendation:
Use AWS Secrets Manager or Parameter Store to manage database passwords:

resource "aws_secretsmanager_secret" "db_password" {
  name = "rds-password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
}

resource "aws_db_instance" "secure_rds" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # ... other settings
}

CIS Benchmark: 2.3.1
AWS Well-Architected: SEC03-BP02
```

---

## 🔧 手順7: WizCloudコンソールでの結果確認

### 7.1 Code Scansページでの確認

1. **WizCloudにログイン**: https://app.wiz.io/
2. **Code** > **Scans** に移動
3. リポジトリ名で検索: `taskflow-app`
4. フィルター: `Scan Type = IaC`

**確認ポイント**:

| 項目 | 期待される値 | 確認 |
|------|------------|------|
| **Scan Type** | IaC | ✅ |
| **Environment Tag** | vulnerable / dev / prod | ✅ |
| **Branch** | scenario-04-iac-verification-YYYYMMDD | ✅ |
| **Files Scanned** | ~10-15 Terraformファイル | ✅ |
| **Policy Hits (vulnerable)** | 10件 | ✅ |
| **Policy Hits (dev/prod)** | 0件 | ✅ |

### 7.2 Issuesの詳細確認

```
Code > Issues に移動
├─ フィルター: Repository = taskflow-app, Type = IaC
└─ 検出されたIssuesの例:
    ├─ [IaC] RDS instance publicly accessible
    │   ├─ Severity: CRITICAL
    │   ├─ Resource: aws_db_instance.vulnerable_rds
    │   ├─ File: terraform/environments/vulnerable/main.tf:46
    │   ├─ Line: publicly_accessible = true
    │   ├─ CIS Benchmark: 2.3.1
    │   └─ Recommendation: Set publicly_accessible = false
    │
    ├─ [IaC] Security group allows unrestricted ingress
    │   ├─ Severity: CRITICAL
    │   ├─ Resource: aws_security_group.vulnerable_sg
    │   ├─ File: terraform/environments/vulnerable/main.tf:108
    │   ├─ Rule violated: 0.0.0.0/0 on all ports
    │   └─ Recommendation: Restrict to specific IPs and ports
    │
    └─ [IaC] S3 bucket does not have encryption enabled
        ├─ Severity: HIGH
        ├─ Resource: aws_s3_bucket.vulnerable_bucket
        ├─ File: terraform/environments/vulnerable/main.tf:75
        ├─ Missing: aws_s3_bucket_server_side_encryption_configuration
        └─ Recommendation: Enable AES256 or KMS encryption
```

### 7.3 Compliance Mappingの確認

WizCloudで検出結果とコンプライアンス基準の対応を確認：

```
Code > Issues > [Issue Detail]
└─ Compliance Mappings:
    ├─ CIS AWS Foundations Benchmark v1.4.0
    │   └─ 2.3.1: Ensure RDS instances are not publicly accessible
    ├─ AWS Well-Architected Framework
    │   └─ SEC03-BP02: Encrypt data at rest
    ├─ PCI DSS v4.0
    │   └─ Requirement 8: Identify users and authenticate access
    └─ NIST CSF
        └─ PR.AC-4: Access permissions are managed
```

---

## ✅ 検証チェックリスト

### VSCode拡張機能

- [ ] **リアルタイム検出が動作する**
  - [ ] vulnerableファイルで問題に下線が表示される
  - [ ] ホバーで詳細情報が表示される
  - [ ] Problemsパネルに全問題が表示される

- [ ] **セキュアな設定で警告なし**
  - [ ] dev/prodファイルで警告が表示されない
  - [ ] ベストプラクティス準拠を確認

### Wiz CLI ローカルスキャン

- [ ] **vulnerable環境で検出あり**
  - [ ] CRITICAL: 3件
  - [ ] HIGH: 5件
  - [ ] MEDIUM: 2件

- [ ] **dev/prod環境で検出なし**
  - [ ] セキュアな設定が正しく認識される

### GitHub Actions統合

- [ ] **ワークフローが正常に実行される**
  - [ ] Terraformファイル変更時にトリガー
  - [ ] 4つのスキャンジョブが実行される
  - [ ] 検証ジョブ（format, validate, plan）が成功

- [ ] **SARIF アップロードが成功**
  - [ ] vulnerable環境のSARIFが生成される
  - [ ] GitHub Securityタブにアラート表示される

### GitHub Security統合

- [ ] **アラートが正しく表示される**
  - [ ] 10件のアラートが表示される
  - [ ] 重大度が正しく分類される
  - [ ] ファイル・行番号が正確

- [ ] **修正推奨事項が表示される**
  - [ ] 具体的なコード例が提示される
  - [ ] CIS Benchmark/AWS Well-Architected参照が表示される

### WizCloud連携

- [ ] **Code Scansに結果が表示される**
  - [ ] 3つの環境すべてがスキャンされる
  - [ ] タグ情報が正しく記録される

- [ ] **Code Issuesで詳細確認可能**
  - [ ] Compliance mappingが表示される
  - [ ] 修正ガイダンスが表示される

---

## 📸 エビデンス収集

以下のスクリーンショットを取得してエビデンスとして保存します：

### 1. VSCode拡張機能（必須）
```
evidence/phase1/S04/
├── 01_vscode_vulnerable_main_tf.png
│   └── vulnerableファイルの問題下線表示
├── 02_vscode_hover_detail.png
│   └── ホバー時の詳細情報
├── 03_vscode_problems_panel.png
│   └── Problemsパネルの全警告一覧
└── 04_vscode_dev_secure.png
    └── dev環境ファイル（警告なし）
```

### 2. Wiz CLI ローカルスキャン（必須）
```
evidence/phase1/S04/
├── 05_cli_scan_vulnerable.png
│   └── vulnerable環境スキャン結果（10件検出）
└── 06_cli_scan_dev.png
    └── dev環境スキャン結果（検出なし）
```

### 3. GitHub Actions（必須）
```
evidence/phase1/S04/
├── 07_github_actions_workflow_list.png
│   └── S04ワークフロー実行一覧
├── 08_iac_scan_job_logs.png
│   └── IaCスキャンジョブログ
└── 09_terraform_validation_job.png
    └── Terraform検証ジョブログ
```

### 4. GitHub Security（必須）
```
evidence/phase1/S04/
├── 10_github_security_alerts_list.png
│   └── Code scanningアラート一覧
├── 11_alert_detail_hardcoded_password.png
│   └── ハードコードパスワードアラート詳細
└── 12_alert_detail_public_rds.png
    └── パブリックRDSアラート詳細
```

### 5. WizCloud Console（必須）
```
evidence/phase1/S04/
├── 13_wizcloud_iac_scans_list.png
│   └── Code > Scans、IaCスキャン一覧
├── 14_scan_detail_vulnerable.png
│   └── vulnerable環境スキャン詳細
├── 15_code_issues_list.png
│   └── Code > Issues、IaC問題一覧
└── 16_issue_detail_compliance.png
    └── Issue詳細とCompliance mapping
```

---

## 🔧 トラブルシューティング

### ❌ 問題1: Terraformフォーマットチェック失敗

**症状**:
```
Error: terraform fmt -check failed
Files not formatted: terraform/environments/vulnerable/main.tf
```

**原因と対処**:
```bash
# Terraformファイルを自動フォーマット
terraform fmt -recursive terraform/

# 変更をコミット
git add terraform/
git commit -m "Format Terraform files"
git push
```

### ❌ 問題2: VSCode拡張機能で問題が表示されない

**症状**:
```
vulnerableファイルを開いても下線が表示されない
```

**原因と対処**:
1. **Wiz拡張機能の有効化確認**:
   - VSCode左下のWizアイコンをクリック
   - "Sign in to Wiz" をクリックして認証

2. **拡張機能の再起動**:
   - Command Palette（Ctrl+Shift+P / Cmd+Shift+P）
   - "Developer: Reload Window"

3. **ファイルタイプの確認**:
   - VSCode右下の言語モードが "Terraform" になっているか確認
   - HashiCorp Terraform拡張機能もインストール推奨

### ❌ 問題3: ワークフローがTerraform変更でトリガーされない

**症状**:
```
Terraformファイルを変更してプッシュしてもワークフローが実行されない
```

**原因と対処**:
1. **paths フィルターの確認**:
   ```yaml
   # ワークフローファイル確認
   on:
     push:
       paths:
         - 'terraform/**'  # ← このパスと一致するか確認
   ```

2. **変更ファイルパスの確認**:
   ```bash
   # 最後のコミットで変更されたファイルを確認
   git show --name-only HEAD

   # terraform/で始まるパスであることを確認
   ```

3. **mainブランチへのマージ**:
   ```bash
   # ブランチがmainまたはdevelopにマージされているか確認
   git checkout main
   git merge scenario-04-iac-verification-20251203
   git push origin main
   ```

### ❌ 問題4: Terraform validate エラー

**症状**:
```
Error: terraform validate failed
Error: Missing required argument
```

**原因と対処**:
```bash
# ローカルでvalidateテスト
cd terraform/environments/dev
terraform init -backend=false
terraform validate

# エラーメッセージを確認し、必要な変数を追加
# variables.tf や terraform.tfvars を修正
```

---

## 🎯 次のステップ

✅ **S04完了後の推奨アクション**:

1. **S05: シークレット検出へ進む**
   - [S05-secret-detection.md](./S05-secret-detection.md) を参照
   - ハードコードされた認証情報の検出検証

2. **IaCスキャンの活用**
   - PRマージ時のブランチ保護ルール設定
   - Terraformモジュールのセキュリティ標準化
   - 定期的なコンプライアンススキャン実施

3. **Phase 2への準備**
   - 実際のAWS環境へのTerraformデプロイ
   - IaC Drift検出（S09）の準備
   - デプロイ済みリソースとコードの差分検出

---

## 📚 参考資料

- [Wiz IaC Scanning Documentation](https://docs.wiz.io/wiz-docs/docs/iac-scanning)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [AWS Well-Architected Framework - Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)
- [Terraform Security Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

---

**✅ シナリオ4完了**: Terraform IaCのセキュリティスキャンと、デプロイ前の設定ミス検出の検証が完了しました。
