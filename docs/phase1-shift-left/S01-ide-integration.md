# シナリオ1: VSCodeでのWiz Code統合とリアルタイムスキャン

## 📋 目的
VSCode IDE内でWiz Code拡張機能を使用し、開発中にリアルタイムでセキュリティ問題を検出する能力を検証します。

## 🎯 検証内容
- Wiz Code拡張機能のインストールと設定
- IaCファイル（Terraform、Dockerfile）のリアルタイムスキャン
- 脆弱性の検出とフィードバック確認
- ワンクリック修正機能の検証

---

## 📚 前提条件

### 必要なツール
- Visual Studio Code（最新版）
- Wiz アカウント（検証環境）
- Wiz Service Account（Client ID / Client Secret）

### 必要な権限
- Wiz: `read:issues`, `read:projects`

---

## 🔧 手順1: Wiz Service Accountの作成

### 1.1 Wizポータルにログイン
```bash
# Wizポータルにアクセス
https://app.wiz.io/
```

### 1.2 Service Accountの作成
1. 左サイドバーから **Settings** > **Service Accounts** を選択
2. **Create Service Account** をクリック
3. 以下の設定を入力:
   ```
   Name: vscode-dev-account
   Description: VSCode統合用のサービスアカウント
   Scopes: 
     - read:issues
     - read:projects
   ```
4. **Create** をクリック
5. **Client ID** と **Client Secret** をコピーして安全に保存

```bash
# 保存例（ローカルの.envファイルに保存）
WIZ_CLIENT_ID=your_client_id_here
WIZ_CLIENT_SECRET=your_client_secret_here
```

---

## 🔧 手順2: VSCode拡張機能のインストール

### 2.1 Wiz Code拡張機能のインストール
1. VSCodeを開く
2. 左サイドバーの拡張機能アイコン（□□□□）をクリック
3. 検索バーに「Wiz Code」と入力
4. **Wiz Code** 拡張機能を見つけて **Install** をクリック

または、コマンドラインからインストール:
```bash
code --install-extension WizCloud.wiz-vscode
```

### 2.2 拡張機能の設定
1. VSCodeで **Command Palette** を開く（Cmd/Ctrl + Shift + P）
2. `Wiz: Authenticate` と入力して選択
3. Client IDとClient Secretを入力:
   ```
   Client ID: [手順1.2でコピーしたClient ID]
   Client Secret: [手順1.2でコピーしたClient Secret]
   ```
4. 認証が成功すると、ステータスバーに「Wiz: Connected」と表示される

---

## 🔧 手順3: 検証用プロジェクトの準備

### 3.1 ローカルディレクトリの作成
```bash
# プロジェクトディレクトリを作成
mkdir -p ~/wiz-code-verification/scenario-01
cd ~/wiz-code-verification/scenario-01

# VSCodeで開く
code .
```

### 3.2 検証用ファイルの作成

#### a. 脆弱性のあるDockerfileを作成
```bash
# Dockerfileを作成
cat > Dockerfile << 'EOF'
FROM ubuntu:18.04

# 古くて脆弱なバージョンのパッケージを使用
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    python=2.7.17-1~18.04 \
    && rm -rf /var/lib/apt/lists/*

# ハードコードされたシークレット（検証用）
ENV DATABASE_PASSWORD=admin123
ENV AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
ENV AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# rootユーザーで実行（セキュリティリスク）
USER root

WORKDIR /app
COPY . /app

CMD ["python", "app.py"]
EOF
```

#### b. 設定ミスのあるTerraformファイルを作成
```bash
# main.tfを作成
cat > main.tf << 'EOF'
provider "aws" {
  region = "us-east-1"
}

# パブリックアクセスを許可するS3バケット（設定ミス）
resource "aws_s3_bucket" "public_bucket" {
  bucket = "wiz-test-public-bucket"
  
  tags = {
    Name        = "Test Bucket"
    Environment = "Verification"
  }
}

resource "aws_s3_bucket_public_access_block" "public_bucket" {
  bucket = aws_s3_bucket.public_bucket.id

  block_public_acls       = false  # 脆弱な設定
  block_public_policy     = false  # 脆弱な設定
  ignore_public_acls      = false  # 脆弱な設定
  restrict_public_buckets = false  # 脆弱な設定
}

# 暗号化されていないRDSインスタンス（設定ミス）
resource "aws_db_instance" "unencrypted_db" {
  identifier          = "wiz-test-db"
  engine              = "mysql"
  engine_version      = "5.7"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "admin"
  password            = "password123"  # ハードコードされたパスワード
  
  # 暗号化が無効
  storage_encrypted = false
  
  # パブリックアクセスを許可
  publicly_accessible = true
  
  skip_final_snapshot = true
  
  tags = {
    Name        = "Test Database"
    Environment = "Verification"
  }
}

# 過度に開放されたセキュリティグループ
resource "aws_security_group" "open_sg" {
  name        = "wiz-test-open-sg"
  description = "Wide open security group for testing"
  
  ingress {
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
    Name = "Test Open SG"
  }
}
EOF
```

#### c. シークレットが含まれるconfig.pyを作成
```bash
# config.pyを作成
cat > config.py << 'EOF'
# アプリケーション設定ファイル

# データベース設定（ハードコードされた認証情報）
DATABASE_CONFIG = {
    'host': 'prod-db.example.com',
    'port': 3306,
    'user': 'admin',
    'password': 'SuperSecret123!',  # ハードコードされたパスワード
    'database': 'production_db'
}

# AWS設定（ハードコードされたアクセスキー）
AWS_CONFIG = {
    'access_key_id': 'AKIAIOSFODNN7EXAMPLE',
    'secret_access_key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    'region': 'us-east-1'
}

# APIキー（ハードコードされたトークン）
GITHUB_TOKEN = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz'
SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'

# JWT秘密鍵
JWT_SECRET_KEY = 'my-super-secret-jwt-key-12345'
EOF
```

---

## 🔧 手順4: リアルタイムスキャンの実行と確認

### 4.1 Dockerfileのスキャン結果確認
1. VSCodeで `Dockerfile` を開く
2. Wiz拡張機能が自動的にファイルをスキャン（数秒で完了）
3. **問題パネル** (Problems panel) を確認:
   - Cmd/Ctrl + Shift + M で開く
   - または、下部のステータスバーの警告アイコンをクリック

**期待される検出結果:**
```
🔴 Critical Issues:
- Hardcoded AWS credentials detected (line 8-9)
- Using deprecated base image: ubuntu:18.04
- Running container as root user (line 12)

🟡 Medium Issues:
- Hardcoded database password (line 7)
- Using Python 2.7 which is EOL
```

### 4.2 main.tfのスキャン結果確認
1. VSCodeで `main.tf` を開く
2. インラインで問題が波線で強調表示される
3. **問題パネル** を確認

**期待される検出結果:**
```
🔴 Critical Issues:
- S3 bucket allows public access (line 10-18)
- RDS instance is not encrypted (line 25)
- RDS instance is publicly accessible (line 31)
- Security group allows all traffic from 0.0.0.0/0 (line 43-48)

🟡 Medium Issues:
- Hardcoded database password (line 27)
```

### 4.3 config.pyのスキャン結果確認
1. VSCodeで `config.py` を開く
2. **問題パネル** を確認

**期待される検出結果:**
```
🔴 Critical Issues:
- Hardcoded AWS Access Key ID detected (line 14)
- Hardcoded AWS Secret Access Key detected (line 15)
- Hardcoded GitHub Personal Access Token detected (line 20)

🟡 Medium Issues:
- Hardcoded database password (line 7)
- Hardcoded Slack webhook URL (line 21)
- Hardcoded JWT secret key (line 24)
```

---

## 🔧 手順5: 検出結果の詳細確認

### 5.1 問題の詳細を確認
1. 問題パネルの任意の問題をクリック
2. 該当コードにジャンプし、詳細情報が表示される:
   - **問題の説明**: なぜこれが問題なのか
   - **影響範囲**: どのようなリスクがあるか
   - **推奨事項**: どのように修正すべきか
   - **CWE/CVE情報**: 該当する場合

### 5.2 Wiz Code Findings Panelを開く
1. VSCodeのサイドバーでWizアイコンをクリック
2. **Code Security Findings** セクションを確認
3. ファイルごとにグループ化された問題リストが表示される

---

## 🔧 手順6: ワンクリック修正機能の検証

### 6.1 自動修正可能な問題を修正
1. Dockerfileの `FROM ubuntu:18.04` の行にカーソルを置く
2. 電球アイコン（💡）が表示される
3. クリックして **Quick Fix** を選択
4. **Update to latest LTS version** を選択

**修正後:**
```dockerfile
FROM ubuntu:22.04
```

### 6.2 main.tfの自動修正
1. S3バケットのパブリックアクセス設定の行にカーソルを置く
2. Quick Fixから **Block public access** を選択

**修正後:**
```hcl
resource "aws_s3_bucket_public_access_block" "public_bucket" {
  bucket = aws_s3_bucket.public_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

---

## 🔧 手順7: スキャン設定のカスタマイズ

### 7.1 Wiz拡張機能の設定を開く
1. VSCodeの設定を開く（Cmd/Ctrl + ,）
2. `Wiz` で検索
3. 以下の設定を確認・調整:

```json
{
  "wiz.enableAutoScan": true,
  "wiz.scanOnSave": true,
  "wiz.showInlineAnnotations": true,
  "wiz.severityFilter": ["CRITICAL", "HIGH", "MEDIUM"],
  "wiz.filePatterns": {
    "include": ["**/*.tf", "**/Dockerfile", "**/*.py", "**/*.yaml", "**/*.json"],
    "exclude": ["**/node_modules/**", "**/.git/**"]
  }
}
```

---

## 📊 検証結果の確認

### 成功基準
以下がすべて確認できれば、検証成功です:

✅ **Wiz Code拡張機能が正常にインストールされ、認証できた**
✅ **Dockerfileの脆弱性（ハードコードされたシークレット、古いベースイメージ）が検出された**
✅ **Terraformの設定ミス（パブリックS3、暗号化なしRDS、開放されたSG）が検出された**
✅ **config.pyのハードコードされたシークレット（AWS keys、GitHub token）が検出された**
✅ **問題の詳細情報（説明、影響範囲、推奨事項）が表示された**
✅ **ワンクリック修正機能が動作した**
✅ **リアルタイムスキャンが保存時に自動実行された**

---

## 📸 スクリーンショット取得ポイント

以下の画面をスクリーンショットとして保存し、検証レポートに添付してください:

1. **Wiz拡張機能のインストール画面**
2. **認証成功後のステータスバー**（「Wiz: Connected」の表示）
3. **問題パネル**（Problems panel）に表示された検出結果の一覧
4. **Dockerfileのインライン警告**（波線が表示されている状態）
5. **main.tfのインライン警告**
6. **Wiz Code Findings Panel**（サイドバーのWizアイコンをクリックした画面）
7. **問題の詳細情報画面**（任意の問題をクリックした状態）
8. **Quick Fixメニュー**（電球アイコンをクリックした状態）
9. **修正前後のコード比較**

---

## 🎓 学んだこと

このシナリオで検証できた機能:
- **開発者がコードを書きながら、リアルタイムでセキュリティフィードバックを受け取れる**
- **IDE内で問題を発見し、その場で修正できるため、開発速度を落とさない**
- **ハードコードされたシークレットを即座に検出し、流出リスクを防ぐ**
- **IaC（Infrastructure as Code）の設定ミスをデプロイ前に発見できる**

---

## 🔄 次のステップ

シナリオ1が完了したら、次のシナリオに進みます:
- **シナリオ2**: GitHub連携とプルリクエストスキャン
- **シナリオ3**: CI/CDパイプラインでのWiz CLI統合

---

## ❓ トラブルシューティング

### 問題1: 拡張機能が認証できない
**症状**: 「Authentication failed」エラーが表示される
**解決策**:
```bash
# Client IDとSecretが正しいか確認
# Wizポータルで以下を確認:
# 1. Service Accountが有効か
# 2. 必要なスコープ（read:issues, read:projects）が付与されているか
# 3. アカウントがアクティブか
```

### 問題2: スキャンが実行されない
**症状**: ファイルを開いても問題が表示されない
**解決策**:
```bash
# VSCodeの出力パネルを確認
# View > Output を開き、ドロップダウンから「Wiz」を選択
# エラーメッセージを確認
```

### 問題3: 一部のファイルがスキャンされない
**症状**: 特定のファイルタイプだけスキャンされない
**解決策**:
```json
// settings.jsonでファイルパターンを確認
{
  "wiz.filePatterns": {
    "include": ["**/*.tf", "**/Dockerfile", "**/*.py", "**/*.yaml", "**/*.json"]
  }
}
```

---

## 📚 参考資料
- [Wiz Code公式ドキュメント](https://docs.wiz.io/wiz-code)
- [VSCode Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=WizCloud.wiz-vscode)
- [Wiz Code Blog Post](https://www.wiz.io/blog/how-wiz-code-was-built-with-developers-in-mind)
