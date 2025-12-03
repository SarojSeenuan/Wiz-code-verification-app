# 環境変数ガイド

本ガイドでは、WizCode検証プロジェクトで使用する環境変数の設定と管理方法を説明します。

> **📌 このドキュメントを読むべきタイミング**
> セットアップの最終段階、または環境変数設定時に読んでください。

> **📖 次に読むべきドキュメント**
> [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)

> **🔙 ガイド一覧に戻る**
> [ガイド一覧](./README.md)

---

## 目次

1. [環境変数の概要](#環境変数の概要)
2. [Phase別環境変数一覧](#phase別環境変数一覧)
3. [設定方法4種類](#設定方法4種類)
4. [.envファイルの使用](#envファイルの使用)
5. [環境変数検証スクリプト](#環境変数検証スクリプト)
6. [トラブルシューティング](#トラブルシューティング)

---

## 環境変数の概要

### なぜ環境変数が必要か？

環境変数を使用することで：
- 🔐 **認証情報を安全に管理**（コードに直接書かない）
- 🔄 **環境ごとに異なる設定**（開発・テスト・本番）
- 🚀 **CI/CDパイプラインとの連携**（GitHub Secrets等）

### 環境変数の種類

| 種類 | 説明 | 例 |
|------|------|-----|
| **必須** | 設定しないと動作しない | WIZ_CLIENT_ID, DATABASE_HOST |
| **オプション** | デフォルト値があるが、カスタマイズ可能 | LOG_LEVEL, PORT |
| **Phase依存** | 特定のPhaseでのみ必要 | AWS_ACCESS_KEY_ID (Phase 2以降) |

---

## Phase別環境変数一覧

### Phase 1のみ実施する場合（必須環境変数）

#### Wiz認証情報（必須）

```bash
# Bash/Linux/macOS
export WIZ_CLIENT_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
export WIZ_CLIENT_SECRET="wiz_secret_..."

# Windows PowerShell
$env:WIZ_CLIENT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
$env:WIZ_CLIENT_SECRET = "wiz_secret_..."
```

| 変数名 | 説明 | 取得方法 |
|--------|------|---------|
| `WIZ_CLIENT_ID` | WizサービスアカウントのクライアントID | [Wizコンソール](https://app.wiz.io/) → Settings → Service Accounts |
| `WIZ_CLIENT_SECRET` | Wizサービスアカウントのシークレット | サービスアカウント作成時に表示（一度のみ） |

#### データベース設定（必須）

```bash
# Bash/Linux/macOS
export DATABASE_HOST="localhost"
export DATABASE_PORT="5432"
export DATABASE_NAME="taskflow"
export DATABASE_USER="postgres"
export DATABASE_PASSWORD="postgres"

# Windows PowerShell
$env:DATABASE_HOST = "localhost"
$env:DATABASE_PORT = "5432"
$env:DATABASE_NAME = "taskflow"
$env:DATABASE_USER = "postgres"
$env:DATABASE_PASSWORD = "postgres"
```

| 変数名 | 説明 | デフォルト値 | Phase 1での値 |
|--------|------|------------|-------------|
| `DATABASE_HOST` | データベースホスト | `localhost` | `localhost` |
| `DATABASE_PORT` | データベースポート | `5432` | `5432` |
| `DATABASE_NAME` | データベース名 | `taskflow` | `taskflow` |
| `DATABASE_USER` | データベースユーザー | `postgres` | `postgres` |
| `DATABASE_PASSWORD` | データベースパスワード | `postgres` | `postgres` |

#### アプリケーション設定（オプション）

```bash
# Bash/Linux/macOS
export NODE_ENV="development"
export PORT="3001"
export LOG_LEVEL="debug"

# Windows PowerShell
$env:NODE_ENV = "development"
$env:PORT = "3001"
$env:LOG_LEVEL = "debug"
```

| 変数名 | 説明 | デフォルト値 | 推奨値（Phase 1） |
|--------|------|------------|-----------------|
| `NODE_ENV` | Node.js環境 | `development` | `development` |
| `PORT` | バックエンドポート | `3001` | `3001` |
| `LOG_LEVEL` | ログレベル | `info` | `debug` |

---

### Phase 2以降実施する場合（追加必須環境変数）

Phase 2以降は、AWS環境が必要なため、以下の環境変数を追加で設定します。

#### AWS認証情報（Phase 2以降必須）

```bash
# Bash/Linux/macOS
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCY..."
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="123456789012"

# Windows PowerShell
$env:AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
$env:AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCY..."
$env:AWS_REGION = "us-east-1"
$env:AWS_ACCOUNT_ID = "123456789012"
```

| 変数名 | 説明 | 取得方法 |
|--------|------|---------|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | [IAMコンソール](https://console.aws.amazon.com/iam/) → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | IAMユーザー作成時に表示（一度のみ） |
| `AWS_REGION` | AWSリージョン | `us-east-1`（推奨） |
| `AWS_ACCOUNT_ID` | AWSアカウントID | [AWSコンソール](https://console.aws.amazon.com/)右上のアカウント番号 |

#### ECR設定（Phase 2以降）

```bash
# Bash/Linux/macOS
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export ECR_REPOSITORY_BACKEND="taskflow-backend"
export ECR_REPOSITORY_FRONTEND="taskflow-frontend"

# Windows PowerShell
$env:ECR_REGISTRY = "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com"
$env:ECR_REPOSITORY_BACKEND = "taskflow-backend"
$env:ECR_REPOSITORY_FRONTEND = "taskflow-frontend"
```

---

## 設定方法4種類

### 方法1: シェル環境変数（一時的）

**特徴**:
- ✅ 簡単
- ✅ 即座に反映
- ❌ シェル/PowerShellを閉じると消える

**使用場面**: テスト、一時的な確認

#### Bash/Linux/macOS

```bash
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_secret"

# 確認
echo $WIZ_CLIENT_ID
```

#### Windows PowerShell

```powershell
$env:WIZ_CLIENT_ID = "your_client_id"
$env:WIZ_CLIENT_SECRET = "your_secret"

# 確認
Write-Host $env:WIZ_CLIENT_ID
```

---

### 方法2: .envファイル（永続的・推奨）

**特徴**:
- ✅ 永続的
- ✅ プロジェクトごとに管理
- ✅ gitignoreで安全
- ✅ Phase別テンプレート対応

**使用場面**: ローカル開発環境（最推奨）

#### .envファイルの作成

**Phase 1用テンプレート（.env.phase1.template）**:

```bash
# Wiz認証情報
WIZ_CLIENT_ID=your_client_id_here
WIZ_CLIENT_SECRET=your_client_secret_here

# データベース設定（Docker Compose使用時）
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=taskflow
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# アプリケーション設定
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# GitHub設定（オプション）
GITHUB_TOKEN=
```

**Phase 2用テンプレート（.env.phase2.template）**:

```bash
# Wiz認証情報
WIZ_CLIENT_ID=your_client_id_here
WIZ_CLIENT_SECRET=your_client_secret_here

# AWS認証情報
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your_account_id

# ECR設定
ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
ECR_REPOSITORY_BACKEND=taskflow-backend
ECR_REPOSITORY_FRONTEND=taskflow-frontend

# データベース設定（RDS使用時）
DATABASE_HOST=taskflow-db.xxxxx.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=taskflow
DATABASE_USER=taskflow_admin
DATABASE_PASSWORD=your_rds_password

# アプリケーション設定
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

#### .envファイルの使用

**Bash/Linux/macOS**:

```bash
# .envファイルから読み込むスクリプト
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ .envファイルから環境変数を読み込みました"
else
    echo "✗ .envファイルが見つかりません"
fi
```

**Windows PowerShell**:

```powershell
# load-env.ps1
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
            Write-Host "設定: $name" -ForegroundColor Green
        }
    }
    Write-Host ".envファイルから環境変数を読み込みました" -ForegroundColor Cyan
} else {
    Write-Host ".envファイルが見つかりません" -ForegroundColor Red
}
```

---

### 方法3: GitHub Secrets（CI/CD用）

**特徴**:
- ✅ CI/CDパイプラインで安全
- ✅ 暗号化されて保存
- ❌ GitHub Actionsでのみ利用可能

**使用場面**: GitHub Actionsワークフロー（S03以降）

#### GitHub Secretsの設定

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**をクリック
3. 以下のSecretsを設定:

| Secret名 | 値 | 必須Phase |
|----------|-----|---------|
| `WIZ_CLIENT_ID` | Wizクライアント ID | Phase 1以降 |
| `WIZ_CLIENT_SECRET` | Wizシークレット | Phase 1以降 |
| `AWS_ACCESS_KEY_ID` | AWSアクセスキー | Phase 2以降 |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットキー | Phase 2以降 |
| `AWS_REGION` | AWSリージョン | Phase 2以降 |
| `AWS_ACCOUNT_ID` | AWSアカウントID | Phase 2以降 |

#### GitHub Actionsでの使用例

```yaml
# .github/workflows/S03-wiz-full-scan.yml
name: S03 - Wiz Full Scan

on: [push, pull_request]

jobs:
  wiz-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Wiz CLI Scan
        env:
          WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}
          WIZ_CLIENT_SECRET: ${{ secrets.WIZ_CLIENT_SECRET }}
        run: |
          wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
          wizcli dir scan --path . --policy-hits-only
```

---

### 方法4: システム環境変数（永続的）

**特徴**:
- ✅ OS再起動後も保持
- ✅ すべてのアプリケーションで利用可能
- ❌ 設定が複雑

**使用場面**: 複数プロジェクトで同じ認証情報を使う場合

#### Bash/Linux/macOS（~/.bashrc または ~/.zshrc）

```bash
# ~/.bashrc または ~/.zshrc に追加
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_secret"

# 反映
source ~/.bashrc  # または source ~/.zshrc
```

#### Windows PowerShell（システム環境変数）

```powershell
# ユーザー環境変数として永続設定
[System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_ID', 'your_client_id', 'User')
[System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_SECRET', 'your_secret', 'User')

# 確認（新しいPowerShellセッションで）
$env:WIZ_CLIENT_ID
```

---

## .envファイルの使用

### .envファイルの作成

```bash
# プロジェクトルートに .env ファイルを作成
cd WizCodeVerification

# Phase 1用テンプレートをコピー
cp .env.phase1.template .env

# エディタで編集
code .env  # または notepad .env
```

### .envファイルの安全性

**重要**: .envファイルは`.gitignore`に含まれているため、Gitにコミットされません。

```bash
# .gitignoreの確認
cat .gitignore | grep ".env"

# 出力:
# .env
# .env.local
# .env.*.local
```

### .envファイルの権限設定（Linux/macOS）

```bash
# 所有者のみ読み書き可能に設定
chmod 600 .env

# 確認
ls -la .env
# 出力: -rw------- 1 user group 1234 Dec  3 10:00 .env
```

---

## 環境変数検証スクリプト

### validate-env.sh（Bash/Linux/macOS）

プロジェクトに含まれる検証スクリプトです。

```bash
cd WizCodeVerification
./scripts/validate-env.sh phase1
```

**出力例**:
```
=== 環境変数検証 ===
✓ WIZ_CLIENT_ID: 設定済み
✓ WIZ_CLIENT_SECRET: 設定済み
✓ DATABASE_HOST: localhost
✓ DATABASE_PORT: 5432
✗ AWS_ACCESS_KEY_ID: 未設定（Phase 2以降で必要）
✗ AWS_SECRET_ACCESS_KEY: 未設定（Phase 2以降で必要）

Phase 1: 準備完了 ✓
Phase 2: AWS認証情報が必要 ✗
```

### validate-env.ps1（Windows PowerShell）

```powershell
cd WizCodeVerification
.\scripts\validate-env.ps1 phase1
```

---

## トラブルシューティング

### 問題1: 環境変数が認識されない

**症状**: コマンド実行時に「環境変数が設定されていません」エラー

**解決方法**:

```bash
# Bash: 確認
echo $WIZ_CLIENT_ID

# PowerShell: 確認
Write-Host $env:WIZ_CLIENT_ID

# 未設定の場合、再度設定
export WIZ_CLIENT_ID="your_id"  # Bash
$env:WIZ_CLIENT_ID = "your_id"  # PowerShell
```

---

### 問題2: .envファイルが読み込まれない

**症状**: .envファイルを作成したが、環境変数が反映されない

**解決方法**:

```bash
# .envファイルの確認
cat .env

# 読み込みスクリプトの実行
source .env  # Bash（単純な場合）

# または、load-env.ps1を実行（PowerShell）
.\load-env.ps1
```

---

### 問題3: GitHub Secretsが動作しない

**症状**: GitHub Actionsワークフロー内で環境変数が認識されない

**解決方法**:

1. **Secretsが正しく設定されているか確認**:
   - GitHubリポジトリ → Settings → Secrets and variables → Actions
   - Secret名が正確か確認（大文字小文字区別）

2. **ワークフローファイルでの参照が正しいか確認**:
```yaml
env:
  WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}  # 正しい
  WIZ_CLIENT_ID: ${{ env.WIZ_CLIENT_ID }}      # 間違い（envではなくsecrets）
```

---

### 問題4: AWS認証情報のエラー

**症状**: AWS CLIで「Invalid credentials」エラー

**解決方法**:

```bash
# AWS認証情報の確認
aws sts get-caller-identity

# エラーが出る場合、再設定
aws configure
```

---

## 環境変数チェックリスト

### Phase 1実施前のチェックリスト

- [ ] `WIZ_CLIENT_ID` が設定されている
- [ ] `WIZ_CLIENT_SECRET` が設定されている
- [ ] `DATABASE_HOST` が設定されている（デフォルト: localhost）
- [ ] `DATABASE_PORT` が設定されている（デフォルト: 5432）
- [ ] `DATABASE_NAME` が設定されている（デフォルト: taskflow）
- [ ] `DATABASE_USER` が設定されている（デフォルト: postgres）
- [ ] `DATABASE_PASSWORD` が設定されている（デフォルト: postgres）

### Phase 2実施前のチェックリスト

Phase 1のチェックリストに加えて：

- [ ] `AWS_ACCESS_KEY_ID` が設定されている
- [ ] `AWS_SECRET_ACCESS_KEY` が設定されている
- [ ] `AWS_REGION` が設定されている（推奨: us-east-1）
- [ ] `AWS_ACCOUNT_ID` が設定されている
- [ ] `ECR_REGISTRY` が設定されている
- [ ] `DATABASE_HOST` がRDSエンドポイントに更新されている（RDS使用時）

---

## 次のステップ

環境変数の設定が完了したら、以下のドキュメントに進んでください：

1. **[BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)** - ブランチ戦略の理解
2. **[Phase 1シナリオ](../phase1-shift-left/README.md)** - S01から検証開始
3. **[TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)** - 問題発生時の対処

---

## 参考資料

- [12-Factor App - Config](https://12factor.net/config)
- [dotenv公式ドキュメント](https://github.com/motdotla/dotenv)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS CLI環境変数](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html)

---

**🔙 [ガイド一覧に戻る](./README.md)**
