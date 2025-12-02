# シナリオ1: VSCodeでのWiz Code統合とリアルタイムスキャン

## 📋 目的
VSCode IDE内でWiz Code拡張機能を使用し、開発中にリアルタイムでセキュリティ問題を検出する能力を検証します。

## 🎯 検証内容
- Wiz Code拡張機能のインストールと設定
- IaCファイル（Terraform、Dockerfile）のリアルタイムスキャン
- 脆弱性の検出とフィードバック確認
- ワンクリック修正機能の検証
- Wiz CLI との連携確認

## ⏱️ 所要時間
- 初回セットアップ: **30分**
- 検証実行: **20分**
- 再検証: **15分**

---

## 📚 前提条件

### 必要なツール
- [x] Visual Studio Code（最新版）
- [x] Wiz アカウント（検証環境）
- [x] Wiz CLI（インストール済み）
- [x] Git（ブランチ管理用）

### 必要な権限
- Wiz: `read:issues`, `read:projects`, `read:vulnerabilities`

### 事前準備
```bash
# 環境変数の確認
echo $WIZ_CLIENT_ID
echo $WIZ_CLIENT_SECRET

# 未設定の場合は、ENVIRONMENT_VARIABLES_GUIDE.mdを参照
```

---

## 🗂️ 検証ブランチの作成

このシナリオは再検証可能にするため、専用ブランチで作業します。

### ブランチ作成
```bash
# WizCodeVerificationリポジトリのルートに移動
cd ~/WizCodeVerification

# 最新のmasterを取得
git checkout master
git pull origin master

# S01専用ブランチを作成
git checkout -b feature/test-s01-ide-integration

# ブランチ確認
git branch
# * feature/test-s01-ide-integration
#   master
```

> **再検証時**: 既存のブランチを削除して新規作成します。詳細は [BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md) を参照。

---

## 🔧 手順1: Wiz Service Accountの作成（WizCloudコンソール）

### 1.1 Wizポータルにログイン

1. ブラウザで以下のURLを開く:
   ```
   https://app.wiz.io/
   ```

2. **ログイン画面** で以下を入力:
   - Email: あなたのWizアカウントメールアドレス
   - Password: パスワード
   - **Sign In** ボタンをクリック

3. **ダッシュボード画面** が表示されることを確認

### 1.2 Service Account作成画面に移動

1. **左サイドバー** の一番下にある **⚙️ Settings** アイコンをクリック

2. Settings画面が開いたら、左側メニューから **Service Accounts** を選択
   ```
   Settings
   ├── General
   ├── Users
   ├── Service Accounts  ← ここをクリック
   ├── API Keys
   └── ...
   ```

3. 右上の **+ Create Service Account** ボタンをクリック

### 1.3 Service Accountの設定

**Create Service Account** ダイアログが表示されます。以下を入力:

```yaml
Name: vscode-dev-s01
Description: S01: VSCode IDE統合検証用のサービスアカウント
```

**Scopes（権限）** セクションで以下を選択:
- [x] `read:issues` - 検出された問題を読み取る
- [x] `read:projects` - プロジェクト情報を読み取る
- [x] `read:vulnerabilities` - 脆弱性情報を読み取る

> **重要**: `write:*` 権限は不要です。読み取り専用で十分です。

### 1.4 認証情報の取得と保存

1. **Create** ボタンをクリック

2. **Service Account Created** ダイアログが表示されます:
   ```
   ✅ Service Account created successfully!

   Client ID: [32文字の英数字]
   Client Secret: [64文字の英数字]  ← 一度しか表示されません！

   [Copy Client ID] [Copy Client Secret]
   ```

3. **Copy Client ID** をクリックしてコピー

4. **Copy Client Secret** をクリックしてコピー

5. **ローカル環境に保存**:

   **Linux/macOS:**
   ```bash
   # ~/.bashrcまたは~/.zshrcに追加
   echo 'export WIZ_CLIENT_ID="コピーしたClient ID"' >> ~/.bashrc
   echo 'export WIZ_CLIENT_SECRET="コピーしたClient Secret"' >> ~/.bashrc
   source ~/.bashrc

   # 確認
   echo $WIZ_CLIENT_ID
   ```

   **Windows PowerShell:**
   ```powershell
   # 永続的な環境変数として設定
   [System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_ID', 'コピーしたClient ID', 'User')
   [System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_SECRET', 'コピーしたClient Secret', 'User')

   # PowerShellを再起動後、確認
   echo $env:WIZ_CLIENT_ID
   ```

> **セキュリティ注意**: Client Secretは二度と表示されません。紛失した場合は新しいService Accountを作成してください。

### 1.5 Wiz CLIでの認証確認

Service Accountが正しく作成されたか、Wiz CLIで確認します。

```bash
# Wiz CLIで認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# 期待される出力:
# ✅ Successfully authenticated with Wiz
# Account: your-tenant-name
# User: vscode-dev-s01
```

**トラブルシューティング:**
```bash
# 認証失敗時のエラー例
# ❌ Error: invalid_client
#    → Client IDまたはSecretが間違っています

# ❌ Error: insufficient_scope
#    → 必要な権限が付与されていません（手順1.3を確認）
```

---

## 🔧 手順2: VSCode拡張機能のインストール

### 2.1 Wiz Code拡張機能のインストール

**方法1: VSCode UIからインストール**

1. VSCodeを開く

2. 左サイドバーの **拡張機能アイコン** (四角が4つ並んだアイコン) をクリック
   - ショートカット: `Ctrl+Shift+X` (Windows/Linux) / `Cmd+Shift+X` (macOS)

3. 検索バーに `Wiz Code` と入力

4. **Wiz Code** 拡張機能（パブリッシャー: WizCloud）を見つけて **Install** をクリック

5. インストール完了後、**Reload Required** が表示されたら **Reload** をクリック

**方法2: コマンドラインからインストール**

```bash
# VSCodeを閉じてから実行
code --install-extension WizCloud.wiz-vscode

# インストール確認
code --list-extensions | grep Wiz
# WizCloud.wiz-vscode
```

### 2.2 拡張機能の認証設定

VSCodeでWiz拡張機能にService Accountを連携します。

1. VSCodeで **Command Palette** を開く:
   - Windows/Linux: `Ctrl+Shift+P`
   - macOS: `Cmd+Shift+P`

2. `Wiz: Authenticate` と入力して選択

3. **認証方法の選択** ダイアログが表示:
   ```
   Choose authentication method:
   ○ Service Account (recommended for CI/CD)
   ○ OAuth (browser-based login)
   ```
   **Service Account** を選択

4. **Client ID入力** ダイアログが表示:
   ```
   Enter Wiz Client ID:
   [                                    ]
   ```
   手順1.4でコピーしたClient IDを貼り付けて Enter

5. **Client Secret入力** ダイアログが表示:
   ```
   Enter Wiz Client Secret:
   [                                    ]
   ```
   手順1.4でコピーしたClient Secretを貼り付けて Enter

6. **認証成功の確認**:
   - VSCode右下に通知が表示: `✅ Successfully authenticated with Wiz`
   - VSCodeのステータスバー（下部）に `Wiz: Connected` と表示される

### 2.3 拡張機能の設定確認

VSCodeの設定でWiz拡張機能が有効になっているか確認します。

1. VSCodeの設定を開く:
   - Windows/Linux: `Ctrl+,`
   - macOS: `Cmd+,`

2. 検索バーに `Wiz` と入力

3. 以下の設定を確認:

   ```json
   {
     // リアルタイムスキャンを有効化
     "wiz.enableAutoScan": true,

     // ファイル保存時に自動スキャン
     "wiz.scanOnSave": true,

     // コード内にインライン警告を表示
     "wiz.showInlineAnnotations": true,

     // 表示する問題の重要度フィルター
     "wiz.severityFilter": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],

     // スキャン対象ファイルのパターン
     "wiz.filePatterns": {
       "include": [
         "**/*.tf",
         "**/Dockerfile",
         "**/*.py",
         "**/*.js",
         "**/*.ts",
         "**/*.yaml",
         "**/*.yml",
         "**/*.json"
       ],
       "exclude": [
         "**/node_modules/**",
         "**/.git/**",
         "**/dist/**",
         "**/build/**"
       ]
     }
   }
   ```

4. **設定を変更した場合**: VSCodeを再起動

---

## 🔧 手順3: 検証用プロジェクトの準備

### 3.1 検証用ディレクトリの作成

```bash
# WizCodeVerificationリポジトリのルートに移動
cd ~/WizCodeVerification

# S01検証用ディレクトリを作成
mkdir -p verification-samples/s01-ide-integration
cd verification-samples/s01-ide-integration

# VSCodeで開く
code .
```

> **ディレクトリ構造**:
> ```
> WizCodeVerification/
> └── verification-samples/
>     └── s01-ide-integration/      ← ここで作業
>         ├── Dockerfile
>         ├── main.tf
>         ├── config.py
>         └── README.md
> ```

### 3.2 検証用ファイルの作成

以下の3つのファイルを作成します。これらには **意図的なセキュリティ脆弱性** が含まれています。

#### a. 脆弱性のあるDockerfileを作成

**ファイル作成:**
```bash
touch Dockerfile
code Dockerfile
```

**以下の内容を貼り付け:**
```dockerfile
# S01検証用: 意図的に脆弱性を含むDockerfile
# 本番環境では絶対に使用しないでください

FROM ubuntu:18.04

# 【脆弱性1】古くて脆弱なバージョンのパッケージを使用
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    python=2.7.17-1~18.04 \
    && rm -rf /var/lib/apt/lists/*

# 【脆弱性2】ハードコードされたシークレット
ENV DATABASE_PASSWORD=admin123
ENV AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
ENV AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# 【脆弱性3】rootユーザーで実行（セキュリティリスク）
USER root

WORKDIR /app
COPY . /app

CMD ["python", "app.py"]
```

**保存:** `Ctrl+S` (Windows/Linux) / `Cmd+S` (macOS)

> **Wiz拡張機能が自動スキャン開始**: 保存直後に問題が検出されます（後の手順で確認）。

#### b. 設定ミスのあるTerraformファイルを作成

**ファイル作成:**
```bash
touch main.tf
code main.tf
```

**以下の内容を貼り付け:**
```hcl
# S01検証用: 意図的に設定ミスを含むTerraform
# 本番環境では絶対に使用しないでください

provider "aws" {
  region = "us-east-1"
}

# 【設定ミス1】パブリックアクセスを許可するS3バケット
resource "aws_s3_bucket" "public_bucket" {
  bucket = "wiz-test-public-bucket-s01"

  tags = {
    Name        = "S01 Test Bucket"
    Environment = "Verification"
    Scenario    = "S01"
  }
}

resource "aws_s3_bucket_public_access_block" "public_bucket" {
  bucket = aws_s3_bucket.public_bucket.id

  block_public_acls       = false  # 脆弱な設定
  block_public_policy     = false  # 脆弱な設定
  ignore_public_acls      = false  # 脆弱な設定
  restrict_public_buckets = false  # 脆弱な設定
}

# 【設定ミス2】暗号化されていないRDSインスタンス
resource "aws_db_instance" "unencrypted_db" {
  identifier          = "wiz-test-db-s01"
  engine              = "mysql"
  engine_version      = "5.7"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "admin"
  password            = "password123"  # ハードコードされたパスワード

  # 【脆弱性1】暗号化が無効
  storage_encrypted = false

  # 【脆弱性2】パブリックアクセスを許可
  publicly_accessible = true

  skip_final_snapshot = true

  tags = {
    Name        = "S01 Test Database"
    Environment = "Verification"
    Scenario    = "S01"
  }
}

# 【設定ミス3】過度に開放されたセキュリティグループ
resource "aws_security_group" "open_sg" {
  name        = "wiz-test-open-sg-s01"
  description = "Wide open security group for S01 testing"

  ingress {
    description = "Allow all TCP traffic from anywhere"
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
    Name     = "S01 Test Open SG"
    Scenario = "S01"
  }
}
```

**保存:** `Ctrl+S` (Windows/Linux) / `Cmd+S` (macOS)

#### c. シークレットが含まれるconfig.pyを作成

**ファイル作成:**
```bash
touch config.py
code config.py
```

**以下の内容を貼り付け:**
```python
# S01検証用: 意図的にシークレットを含む設定ファイル
# 本番環境では絶対に使用しないでください

# 【脆弱性1】データベース設定（ハードコードされた認証情報）
DATABASE_CONFIG = {
    'host': 'prod-db.example.com',
    'port': 3306,
    'user': 'admin',
    'password': 'SuperSecret123!',  # ハードコードされたパスワード
    'database': 'production_db'
}

# 【脆弱性2】AWS設定（ハードコードされたアクセスキー）
AWS_CONFIG = {
    'access_key_id': 'AKIAIOSFODNN7EXAMPLE',
    'secret_access_key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    'region': 'us-east-1'
}

# 【脆弱性3】APIキー（ハードコードされたトークン）
GITHUB_TOKEN = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz'
SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'

# 【脆弱性4】JWT秘密鍵
JWT_SECRET_KEY = 'my-super-secret-jwt-key-12345'

# 【脆弱性5】暗号化キー
ENCRYPTION_KEY = 'ThisIsASecretEncryptionKey123'
```

**保存:** `Ctrl+S` (Windows/Linux) / `Cmd+S` (macOS)

### 3.3 検証ファイルの追加とコミット

```bash
# Git追加
git add verification-samples/s01-ide-integration/

# コミット
git commit -m "S01: Add intentionally vulnerable files for IDE integration testing

- Dockerfile with hardcoded secrets and old base image
- main.tf with misconfigured S3, RDS, and security group
- config.py with hardcoded credentials and API keys

⚠️  These files contain intentional vulnerabilities for Wiz Code verification.
   DO NOT use in production environments."

# 確認
git log -1
```

---

## 🔧 手順4: リアルタイムスキャンの実行と確認

Wiz拡張機能は保存時に自動的にスキャンを実行します。ここでは検出結果を確認します。

### 4.1 VSCode問題パネルを開く

1. VSCodeで **Problems Panel** を開く:
   - Windows/Linux: `Ctrl+Shift+M`
   - macOS: `Cmd+Shift+M`
   - または、下部ステータスバーの **⚠️ 警告アイコン** をクリック

2. Problems Panelに検出された問題が表示されます:
   ```
   Problems (32)
   🔴 CRITICAL (12)   🟠 HIGH (8)   🟡 MEDIUM (9)   🔵 LOW (3)
   ```

### 4.2 Dockerfileのスキャン結果確認

1. Problems Panelで **Dockerfile** をフィルター:
   - 検索バーに `Dockerfile` と入力

2. **期待される検出結果:**

   | 重要度 | 問題 | 行番号 | 説明 |
   |--------|------|--------|------|
   | 🔴 CRITICAL | Hardcoded AWS Secret Access Key | 11 | AWS認証情報が平文で含まれています |
   | 🔴 CRITICAL | Hardcoded AWS Access Key ID | 10 | AWSアクセスキーIDが平文で含まれています |
   | 🟠 HIGH | Using deprecated base image | 4 | Ubuntu 18.04はEOL（サポート終了）です |
   | 🟠 HIGH | Running container as root | 14 | rootユーザーでの実行はセキュリティリスクです |
   | 🟡 MEDIUM | Hardcoded database password | 9 | データベースパスワードが平文で含まれています |
   | 🟡 MEDIUM | Using Python 2.7 (EOL) | 7 | Python 2.7はサポート終了しています |

### 4.3 main.tfのスキャン結果確認

1. Problems Panelで **main.tf** をフィルター

2. **期待される検出結果:**

   | 重要度 | 問題 | 行番号 | 説明 |
   |--------|------|--------|------|
   | 🔴 CRITICAL | S3 bucket allows public access | 22-26 | パブリックアクセスブロックが無効です |
   | 🔴 CRITICAL | RDS instance is not encrypted | 40 | ストレージ暗号化が無効です |
   | 🔴 CRITICAL | RDS instance is publicly accessible | 43 | RDSインスタンスがインターネットに公開されています |
   | 🔴 CRITICAL | Security group allows all traffic | 61-65 | 0.0.0.0/0からの全ポートアクセスを許可 |
   | 🟡 MEDIUM | Hardcoded database password | 38 | RDSパスワードがコードに含まれています |

### 4.4 config.pyのスキャン結果確認

1. Problems Panelで **config.py** をフィルター

2. **期待される検出結果:**

   | 重要度 | 問題 | 行番号 | 説明 |
   |--------|------|--------|------|
   | 🔴 CRITICAL | Hardcoded AWS Access Key | 15 | AWS認証情報が検出されました |
   | 🔴 CRITICAL | Hardcoded AWS Secret Key | 16 | AWSシークレットキーが検出されました |
   | 🔴 CRITICAL | Hardcoded GitHub Token | 21 | GitHub Personal Access Tokenが検出されました |
   | 🟠 HIGH | Hardcoded Slack Webhook | 22 | Slack Webhook URLが含まれています |
   | 🟡 MEDIUM | Hardcoded DB Password | 10 | データベースパスワードが平文です |
   | 🟡 MEDIUM | Hardcoded JWT Secret | 25 | JWT署名キーがハードコードされています |

### 4.5 インライン警告の確認

1. VSCodeで `Dockerfile` を開く

2. 問題のある行に **波線（squiggly line）** が表示されます:
   - 🔴 赤い波線: CRITICAL
   - 🟠 オレンジ色の波線: HIGH
   - 🟡 黄色い波線: MEDIUM

3. 波線にマウスをホバーすると、**詳細ポップアップ** が表示:
   ```
   🔴 Hardcoded AWS Secret Access Key detected

   Description:
   AWS Secret Access Keyがコード内に平文で含まれています。
   これは重大なセキュリティリスクです。

   Impact:
   - 認証情報が流出すると、AWSリソースへの不正アクセスが可能
   - GitHubなどにコミットすると、自動スキャナに検出される

   Recommendation:
   - AWS Secrets Managerを使用
   - 環境変数から読み取る
   - IAMロールを使用する

   CWE: CWE-798 (Use of Hard-coded Credentials)
   ```

---

## 🔧 手順5: Wiz Code Findings Panelでの詳細確認

### 5.1 Wiz Findings Panelを開く

1. VSCodeの左サイドバーで **Wizアイコン** をクリック
   - Wizロゴ（盾のアイコン）が表示されています

2. **Wiz Code Security Findings** パネルが開きます

### 5.2 ファイルごとのグループ表示

Findings Panelには、ファイルごとにグループ化された問題が表示されます:

```
Wiz Code Security Findings (32 issues)

📂 verification-samples/s01-ide-integration/

  📄 Dockerfile (6 issues)
    🔴 Hardcoded AWS Secret Access Key (line 11)
    🔴 Hardcoded AWS Access Key ID (line 10)
    🟠 Deprecated base image: ubuntu:18.04 (line 4)
    🟠 Running as root user (line 14)
    🟡 Hardcoded database password (line 9)
    🟡 Python 2.7 is EOL (line 7)

  📄 main.tf (5 issues)
    🔴 S3 bucket public access enabled (line 22)
    🔴 RDS storage encryption disabled (line 40)
    🔴 RDS publicly accessible (line 43)
    🔴 Security group allows 0.0.0.0/0 (line 63)
    🟡 Hardcoded RDS password (line 38)

  📄 config.py (6 issues)
    🔴 AWS Access Key detected (line 15)
    🔴 AWS Secret Key detected (line 16)
    🔴 GitHub Token detected (line 21)
    🟠 Slack Webhook URL detected (line 22)
    🟡 Database password hardcoded (line 10)
    🟡 JWT secret key hardcoded (line 25)
```

### 5.3 問題の詳細表示

1. 任意の問題をクリック（例: `Hardcoded AWS Secret Access Key`）

2. **詳細パネル** が右側に表示:
   ```
   🔴 Hardcoded AWS Secret Access Key

   File: Dockerfile
   Line: 11
   Severity: CRITICAL

   Description:
   AWS Secret Access Keyがコード内に平文で検出されました。

   Impact:
   この認証情報が流出すると、攻撃者はAWSアカウントに
   アクセスし、リソースを操作・削除できます。

   Remediation:
   1. このコミットを削除し、認証情報をローテーション
   2. AWS Secrets Managerを使用して保存
   3. 環境変数から読み取るようにコードを変更

   References:
   - CWE-798: Use of Hard-coded Credentials
   - OWASP A07:2021 - Identification and Authentication Failures

   [View in Code] [Suppress] [Learn More]
   ```

3. **[View in Code]** をクリック → 該当行にジャンプ

---

## 🔧 手順6: ワンクリック修正機能（Quick Fix）の検証

Wizは一部の問題に対して自動修正を提供します。

### 6.1 Dockerfileの自動修正

**修正対象: 古いベースイメージ**

1. VSCodeで `Dockerfile` を開く

2. 4行目 `FROM ubuntu:18.04` の行にカーソルを置く

3. **電球アイコン** (💡) が行番号の左側に表示される

4. 電球アイコンをクリック、または `Ctrl+.` (Windows/Linux) / `Cmd+.` (macOS)

5. **Quick Fix** メニューが表示:
   ```
   💡 Quick Fix

   ✨ Update to latest LTS version (ubuntu:22.04)
   📝 Suppress this warning
   📚 Learn more about this issue
   ```

6. **Update to latest LTS version** を選択

7. **自動修正後**:
   ```dockerfile
   # 修正前
   FROM ubuntu:18.04

   # 修正後
   FROM ubuntu:22.04
   ```

8. ファイルを保存: `Ctrl+S` (Windows/Linux) / `Cmd+S` (macOS)

9. Problems Panelを確認: **"Deprecated base image"** の警告が消える

### 6.2 main.tfの自動修正

**修正対象: S3パブリックアクセス設定**

1. VSCodeで `main.tf` を開く

2. 22行目 `block_public_acls = false` にカーソルを置く

3. 電球アイコン (💡) をクリック

4. **Quick Fix** メニュー:
   ```
   💡 Quick Fix

   ✨ Block all public access (recommended)
   ✨ Block public ACLs only
   📝 Suppress this warning
   ```

5. **Block all public access** を選択

6. **自動修正後**:
   ```hcl
   # 修正前
   resource "aws_s3_bucket_public_access_block" "public_bucket" {
     bucket = aws_s3_bucket.public_bucket.id

     block_public_acls       = false
     block_public_policy     = false
     ignore_public_acls      = false
     restrict_public_buckets = false
   }

   # 修正後
   resource "aws_s3_bucket_public_access_block" "public_bucket" {
     bucket = aws_s3_bucket.public_bucket.id

     block_public_acls       = true  # ✅ 修正済み
     block_public_policy     = true  # ✅ 修正済み
     ignore_public_acls      = true  # ✅ 修正済み
     restrict_public_buckets = true  # ✅ 修正済み
   }
   ```

7. ファイルを保存

### 6.3 修正できない問題（手動修正が必要）

**ハードコードされたシークレット** は自動修正できません。以下のように手動で修正します:

**config.py修正例:**

```python
# 修正前（脆弱）
AWS_CONFIG = {
    'access_key_id': 'AKIAIOSFODNN7EXAMPLE',
    'secret_access_key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    'region': 'us-east-1'
}

# 修正後（推奨）
import os

AWS_CONFIG = {
    'access_key_id': os.environ.get('AWS_ACCESS_KEY_ID'),
    'secret_access_key': os.environ.get('AWS_SECRET_ACCESS_KEY'),
    'region': os.environ.get('AWS_REGION', 'us-east-1')
}
```

---

## 🔧 手順7: Wiz CLIでのディレクトリスキャン（比較検証）

IDE統合の検出結果をWiz CLIの結果と比較します。

### 7.1 Wiz CLIでスキャン実行

```bash
# S01検証ディレクトリに移動
cd ~/WizCodeVerification/verification-samples/s01-ide-integration

# Wiz CLIでディレクトリスキャン
wizcli dir scan \
  --path . \
  --name "S01-IDE-Integration-Scan" \
  --tag "scenario=S01" \
  --tag "verification=ide-integration" \
  --output-format json \
  --output-file s01-scan-results.json

# スキャン実行中...
# ✅ Scan completed successfully
# 📊 Results: 32 issues found
#    - CRITICAL: 12
#    - HIGH: 8
#    - MEDIUM: 9
#    - LOW: 3
```

### 7.2 スキャン結果の確認

```bash
# 結果ファイルを確認
cat s01-scan-results.json | jq '.summary'

# 出力例:
# {
#   "total_issues": 32,
#   "critical": 12,
#   "high": 8,
#   "medium": 9,
#   "low": 3,
#   "files_scanned": 3,
#   "scan_duration": "2.3s"
# }
```

### 7.3 検出結果の比較

| 検出方法 | Critical | High | Medium | Low | 合計 |
|----------|----------|------|--------|-----|------|
| **VSCode IDE統合** | 12 | 8 | 9 | 3 | **32** |
| **Wiz CLI** | 12 | 8 | 9 | 3 | **32** |

✅ **結果一致**: IDEとCLIで同じ問題が検出されました。

---

## 🔧 手順8: WizCloudコンソールでの結果確認

IDE統合のスキャン結果はWizCloudコンソールにも送信されます。

### 8.1 WizCloudポータルにアクセス

1. ブラウザで https://app.wiz.io/ を開く

2. ログイン

3. 左サイドバーから **Code** > **Repositories** を選択

### 8.2 スキャン結果の表示

1. **Repositories** 画面で、検索バーに `WizCodeVerification` と入力

2. リポジトリ一覧から **WizCodeVerification** をクリック

3. **Branches** タブを選択

4. `feature/test-s01-ide-integration` ブランチを探してクリック

5. **Security Findings** セクションに以下が表示:
   ```
   🔴 Critical Issues: 12
   🟠 High Issues: 8
   🟡 Medium Issues: 9
   🔵 Low Issues: 3

   Files with Issues:
   - verification-samples/s01-ide-integration/Dockerfile (6)
   - verification-samples/s01-ide-integration/main.tf (5)
   - verification-samples/s01-ide-integration/config.py (6)
   ```

### 8.3 個別の問題詳細を確認

1. **Findings** タブをクリック

2. フィルターで重要度を選択: **CRITICAL**

3. 任意の問題をクリック（例: **Hardcoded AWS Secret Key**）

4. **詳細パネル** が表示:
   - **File Path**: `verification-samples/s01-ide-integration/config.py`
   - **Line Number**: 16
   - **Code Snippet**: 該当コードが表示
   - **Remediation**: 修正方法
   - **First Detected**: スキャン日時
   - **Last Seen**: 最終確認日時

---

## 📊 検証チェックリスト

以下のすべてにチェックが入れば、S01検証は成功です。

### セットアップ
- [ ] Wiz Service Accountが正常に作成された（手順1）
- [ ] VSCode Wiz拡張機能がインストールされた（手順2.1）
- [ ] Wiz拡張機能の認証が成功した（手順2.2）
- [ ] ステータスバーに「Wiz: Connected」が表示される

### ファイル準備
- [ ] Dockerfile、main.tf、config.pyが作成された（手順3.2）
- [ ] 検証ブランチ `feature/test-s01-ide-integration` が作成された（手順3.3）

### リアルタイムスキャン
- [ ] Dockerfileで6件の問題が検出された（手順4.2）
- [ ] main.tfで5件の問題が検出された（手順4.3）
- [ ] config.pyで6件の問題が検出された（手順4.4）
- [ ] Problems Panelに合計32件の問題が表示された（手順4.1）
- [ ] インライン警告（波線）が表示された（手順4.5）

### 詳細機能
- [ ] Wiz Findings Panelが正常に表示された（手順5.1）
- [ ] 問題の詳細情報が確認できた（手順5.3）
- [ ] Quick Fixで自動修正ができた（手順6.1, 6.2）

### CLI/Cloud連携
- [ ] Wiz CLIスキャンが実行できた（手順7.1）
- [ ] IDEとCLIの検出結果が一致した（手順7.3）
- [ ] WizCloudコンソールで結果が確認できた（手順8.2）

---

## 📸 エビデンス収集

### スクリーンショット取得

以下の画面をスクリーンショットとして保存してください。

#### 1. Wiz拡張機能のインストール
**撮影画面**: VSCode Extensions画面
**内容**: Wiz Code拡張機能がインストール済みの状態
**ファイル名**: `s01_01_vscode_wiz_extension.png`

#### 2. 認証成功画面
**撮影画面**: VSCode下部ステータスバー
**内容**: 「Wiz: Connected」が表示されている状態
**ファイル名**: `s01_02_wiz_connected.png`

#### 3. Problems Panel（全体）
**撮影画面**: VSCode Problems Panel
**内容**: 32件の問題が重要度別に表示されている
**ファイル名**: `s01_03_problems_panel_all.png`

#### 4. Dockerfileのインライン警告
**撮影画面**: Dockerfile編集画面
**内容**: 赤い波線とホバー時の詳細ポップアップ
**ファイル名**: `s01_04_dockerfile_inline_warning.png`

#### 5. main.tfのインライン警告
**撮影画面**: main.tf編集画面
**内容**: S3バケット設定ミスの警告
**ファイル名**: `s01_05_terraform_inline_warning.png`

#### 6. Wiz Findings Panel
**撮影画面**: VSCode Wiz Findings Panel
**内容**: ファイルごとにグループ化された問題リスト
**ファイル名**: `s01_06_wiz_findings_panel.png`

#### 7. 問題詳細画面
**撮影画面**: Wiz Findings Panelの詳細パネル
**内容**: Hardcoded AWS Secret Keyの詳細情報
**ファイル名**: `s01_07_issue_detail.png`

#### 8. Quick Fixメニュー
**撮影画面**: Dockerfile編集画面
**内容**: 電球アイコンとQuick Fixメニューが表示された状態
**ファイル名**: `s01_08_quick_fix_menu.png`

#### 9. 自動修正前後の比較
**撮影画面**: VSCodeの差分ビュー（またはbefore/afterの2枚）
**内容**: ubuntu:18.04 → ubuntu:22.04の変更
**ファイル名**: `s01_09_auto_fix_comparison.png`

#### 10. Wiz CLIスキャン結果
**撮影画面**: ターミナル
**内容**: `wizcli dir scan` コマンド実行結果
**ファイル名**: `s01_10_wiz_cli_scan_result.png`

#### 11. WizCloudコンソール - Repository画面
**撮影画面**: WizCloudブラウザ画面
**内容**: WizCodeVerificationリポジトリの詳細
**ファイル名**: `s01_11_wizcloud_repository.png`

#### 12. WizCloudコンソール - Findings一覧
**撮影画面**: WizCloudブラウザ画面
**内容**: ブランチの検出結果一覧
**ファイル名**: `s01_12_wizcloud_findings.png`

### スクリーンショット保存先

```bash
# エビデンスディレクトリを作成
mkdir -p ~/WizCodeVerification/evidence/phase1/s01-ide-integration/screenshots

# スクリーンショットを保存
# Windows: Win+Shift+S → 選択してクリップボードにコピー → ペイントに貼り付け
# macOS: Cmd+Shift+4 → ドラッグして選択
# Linux: Ctrl+Shift+PrtScn → 選択して保存
```

詳細は [EVIDENCE_COLLECTION_GUIDE.md](../guides/EVIDENCE_COLLECTION_GUIDE.md) を参照。

---

## 🔄 再検証手順

このシナリオを再度検証する場合の手順です。

### 再検証の準備

```bash
# 1. masterブランチに戻る
git checkout master
git pull origin master

# 2. 既存のS01ブランチを削除
git branch -D feature/test-s01-ide-integration

# 3. 新しくブランチを作成
git checkout -b feature/test-s01-ide-integration

# 4. 検証用ファイルを再作成
cd ~/WizCodeVerification/verification-samples/s01-ide-integration
# 手順3.2のファイルを再度作成

# 5. 再検証開始
# 手順4から再実行
```

詳細は [BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md) を参照。

---

## ❓ トラブルシューティング

### 問題1: 拡張機能が認証できない

**症状**: `Authentication failed` エラーが表示される

**原因と解決策**:

```bash
# 原因1: Client IDまたはSecretが間違っている
# → 手順1.4で保存した値を再確認

# 原因2: Service Accountが無効化されている
# → WizCloudコンソールで確認:
#   Settings > Service Accounts > vscode-dev-s01 > Status: Active

# 原因3: 必要なスコープが不足
# → WizCloudコンソールで確認:
#   Settings > Service Accounts > vscode-dev-s01 > Scopes
#   必須: read:issues, read:projects, read:vulnerabilities

# 原因4: 環境変数が設定されていない
echo $WIZ_CLIENT_ID        # 空の場合は未設定
echo $WIZ_CLIENT_SECRET    # 空の場合は未設定

# 環境変数を再設定（ENVIRONMENT_VARIABLES_GUIDE.md参照）
```

### 問題2: スキャンが実行されない

**症状**: ファイルを開いても問題が表示されない

**原因と解決策**:

```bash
# 原因1: 自動スキャンが無効
# → VSCode設定を確認:
#   Ctrl+, → "wiz.enableAutoScan" を検索 → true に設定

# 原因2: ファイルタイプが除外されている
# → VSCode設定を確認:
#   "wiz.filePatterns" > "include" にファイルタイプが含まれているか

# 原因3: Wiz拡張機能がクラッシュしている
# → VSCode Output Panelを確認:
#   View > Output > ドロップダウンから "Wiz" を選択
#   エラーメッセージを確認

# 原因4: ネットワーク接続問題
# → Wizサービスに接続できるか確認:
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
```

### 問題3: Quick Fixが表示されない

**症状**: 電球アイコンが表示されない

**原因と解決策**:

```bash
# 原因1: Quick Fix非対応の問題タイプ
# → ハードコードされたシークレットなど、一部の問題は自動修正非対応
# → 手動で修正する必要があります

# 原因2: VSCodeバージョンが古い
# → VSCodeを最新版に更新:
code --version
# 最新版: https://code.visualstudio.com/

# 原因3: カーソル位置が問題の行にない
# → 波線が表示されている行に正確にカーソルを置く
```

### 問題4: Problems Panelに問題が多すぎて見づらい

**症状**: 検証対象以外のファイルの問題も表示される

**解決策**:

```bash
# フィルターを使用
# Problems Panel上部の検索バーに以下を入力:

# Dockerfileのみ表示
Dockerfile

# 重要度でフィルター（CRITICALのみ）
@severity:critical

# ファイルパスでフィルター
verification-samples/s01-ide-integration/
```

### 問題5: Wiz CLIスキャンがエラー

**症状**: `wizcli dir scan` 実行時にエラー

**原因と解決策**:

```bash
# エラー1: 認証エラー
# ❌ Error: invalid_client
# → 認証情報を再確認:
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# エラー2: パス指定エラー
# ❌ Error: path not found
# → カレントディレクトリを確認:
pwd
# 正しいパス: ~/WizCodeVerification/verification-samples/s01-ide-integration

# エラー3: ネットワークタイムアウト
# ❌ Error: connection timeout
# → プロキシ設定を確認:
echo $HTTPS_PROXY
# プロキシ経由の場合: export HTTPS_PROXY=http://proxy.example.com:8080
```

---

## 🎓 学んだこと

### S01検証で確認できたWiz Code機能

#### 1. リアルタイムセキュリティフィードバック
- 開発者がコードを書きながら、**即座に**セキュリティ問題を検出
- 問題が発生した時点で修正できるため、後工程でのコストを削減
- ビルド失敗やデプロイ後の発覚を防ぐ

#### 2. 多様な脆弱性検出
- **シークレット検出**: ハードコードされたAWS認証情報、APIキー、パスワード
- **IaC設定ミス**: パブリックアクセス、暗号化無効、過度に開放されたSG
- **依存関係の脆弱性**: 古いベースイメージ、EOLパッケージ
- **コーディングベストプラクティス**: rootユーザー実行、権限昇格リスク

#### 3. 開発者体験の向上
- IDE内で完結（外部ツールへの切り替え不要）
- インライン警告で該当箇所が一目瞭然
- Quick Fixによる自動修正で修正時間を短縮
- 詳細な説明とリファレンス提供で学習効果

#### 4. Code-to-Cloudの基盤
- IDEで検出された問題がWizCloudと連携
- 開発段階から本番環境まで一貫した可視性
- 次のシナリオ（S02-S11）の基礎となる

---

## 🔄 次のステップ

S01検証が完了したら、次のシナリオに進みます:

### Phase 1: シフトレフト（続き）

- **[S02: GitHub連携とプルリクエストスキャン](./S02-vcs-integration.md)**
  - Wiz GitHub Appのインストール
  - PRへの自動コメント機能
  - マージブロック設定

- **[S03: CI/CDパイプラインでのWiz CLI統合](./S03-cicd-integration.md)**
  - GitHub Actionsワークフロー作成
  - ビルド時の自動スキャン
  - CI失敗条件の設定

### その他のガイド

- **[BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md)**: 再検証用ブランチ戦略
- **[EVIDENCE_COLLECTION_GUIDE.md](../guides/EVIDENCE_COLLECTION_GUIDE.md)**: エビデンス収集方法
- **[ENVIRONMENT_VARIABLES_GUIDE.md](../guides/ENVIRONMENT_VARIABLES_GUIDE.md)**: 環境変数管理

---

## 📚 参考資料

### Wiz公式ドキュメント
- [Wiz Code Overview](https://docs.wiz.io/wiz-docs/docs/wiz-code)
- [VSCode Extension Guide](https://docs.wiz.io/wiz-docs/docs/ide-plugins#vscode)
- [Wiz CLI Reference](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [Service Account Management](https://docs.wiz.io/wiz-docs/docs/service-accounts)

### セキュリティリファレンス
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf)

### 技術スタック
- [Visual Studio Code Documentation](https://code.visualstudio.com/docs)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 📝 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|---------|
| 2025-01-XX | 2.0 | WizCloudメニュー操作、Wiz CLIコマンド、再検証手順を追加 |
| 2024-XX-XX | 1.0 | 初版作成 |

---

**⚠️  重要な注意事項**

このシナリオで作成されるファイルには、**意図的なセキュリティ脆弱性**が含まれています。
- これらのファイルは検証目的のみに使用してください
- 本番環境では絶対に使用しないでください
- GitHubにpushする前に、実際の認証情報が含まれていないことを確認してください
- 検証完了後は、ブランチを適切に削除してください

---

**🎉 S01検証完了おめでとうございます！**

次のシナリオ [S02: GitHub連携とプルリクエストスキャン](./S02-vcs-integration.md) に進んでください。
