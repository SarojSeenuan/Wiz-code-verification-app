# シナリオ3: GitHub ActionsでのWiz CLI統合とCI/CDパイプライン

## 📋 シナリオ概要

### 目的
GitHub ActionsのCI/CDパイプラインにWiz CLIを統合し、ビルドプロセス中にコード、IaC、Dockerイメージの自動スキャンを実行し、ポリシー違反がある場合はビルドを失敗させる能力を検証します。

### 検証内容
- ✅ Wiz CLIのGitHub Actions統合
- ✅ IaCスキャンの自動化とSARIFレポート生成
- ✅ Dockerイメージスキャンの自動化
- ✅ ポリシーベースのビルド制御
- ✅ SBOM（Software Bill of Materials）の生成
- ✅ GitHub Security タブへの統合

---

## ⏱️ 所要時間

| フェーズ | 所要時間 | 説明 |
|---------|---------|------|
| **初回セットアップ** | 60-90分 | GitHub Secrets設定、ワークフロー作成、初回実行 |
| **検証作業** | 30-45分 | ワークフロー実行確認、結果分析、エビデンス収集 |
| **再検証** | 15-20分 | 新しいブランチで同じ検証を実施する場合 |

**💡 ヒント**: ワークフローファイルは一度作成すれば再利用可能です。再検証時はブランチを切り替えてプッシュするだけです。

---

## 📋 前提条件

### ✅ 必須要件
- [x] **シナリオ1完了**: Wiz Service Accountが作成済み
- [x] **シナリオ2完了**: GitHubリポジトリが存在し、Wiz GitHub Appが接続済み
- [x] **Docker環境**: Docker Desktop またはDocker Engineがローカルにインストール済み
- [x] **GitHub Actions**: リポジトリでGitHub Actionsが有効化されている

### 📦 必要なツール
```bash
# ツールのバージョン確認
git --version          # Git 2.30以上
docker --version       # Docker 20.10以上
gh --version          # GitHub CLI 2.0以上（オプション）
```

### 🔑 必要な情報
- Wiz Service Account Client ID（シナリオ1で取得）
- Wiz Service Account Client Secret（シナリオ1で取得）
- GitHubリポジトリのURL（シナリオ2で作成）

---

## 🗂️ 検証ブランチの作成

CI/CD検証専用のブランチを作成します：

```bash
# 既存リポジトリに移動（シナリオ2で作成したもの）
cd ~/wiz-code-verification/scenario-01

# 検証用ブランチを作成
git checkout -b scenario-03-cicd-integration

# ブランチの確認
git branch
# * scenario-03-cicd-integration
#   main
```

**💡 ヒント**:
- このブランチでワークフローファイルを作成・テストします
- 動作確認後、mainブランチにマージできます
- 再検証時は新しいブランチ（例: `scenario-03-revalidation-YYYYMMDD`）を作成してください

---

## 🔧 手順1: GitHub Secretsの設定

### 1.1 GitHub CLIでSecretsを設定（推奨）

```bash
# Wiz認証情報を設定
gh secret set WIZ_CLIENT_ID --body "your_client_id_here"
gh secret set WIZ_CLIENT_SECRET --body "your_client_secret_here"

# 設定の確認
gh secret list
# WIZ_CLIENT_ID       Updated 2025-12-03
# WIZ_CLIENT_SECRET   Updated 2025-12-03
```

### 1.2 GitHub Web UIでSecretsを設定（代替方法）

1. GitHubリポジトリを開く
2. **Settings** > **Secrets and variables** > **Actions** に移動
3. **New repository secret** をクリック
4. 以下の2つのSecretを追加：

| Name | Secret | 説明 |
|------|--------|------|
| `WIZ_CLIENT_ID` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Service Account Client ID |
| `WIZ_CLIENT_SECRET` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Service Account Secret |

**🔐 セキュリティ注意**:
- Secretsは一度保存すると読み取りできません（編集のみ可能）
- 本番環境では、環境ごとにSecretsを分けることを推奨します

---

## 🔧 手順2: IaCスキャン用ワークフローの作成

### 2.1 ワークフローディレクトリの作成

```bash
# .github/workflowsディレクトリを作成
mkdir -p .github/workflows
```

### 2.2 IaCスキャンワークフローファイルの作成

```bash
cat > .github/workflows/wiz-iac-scan.yml << 'EOF'
name: Wiz IaC Security Scan

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
      - develop
    paths:
      - '**.tf'
      - '**.yaml'
      - '**.yml'
      - '**.json'

permissions:
  contents: read
  security-events: write
  actions: read

jobs:
  wiz-iac-scan:
    name: Wiz IaC Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Download Wiz CLI
        run: |
          curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/
          wizcli version

      - name: Authenticate to Wiz
        run: |
          wizcli auth --id "${{ secrets.WIZ_CLIENT_ID }}" --secret "${{ secrets.WIZ_CLIENT_SECRET }}"

      - name: Run IaC Scan
        id: iac_scan
        run: |
          wizcli iac scan \
            --path . \
            --policy "Default IaC policy" \
            --policy-hits-only \
            --output iac-results.sarif,sarif \
            --output iac-results.json,json \
            --tag "repo=${{ github.repository }}" \
            --tag "branch=${{ github.ref_name }}" \
            --tag "commit_sha=${{ github.sha }}"
        continue-on-error: true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: iac-results.sarif
          category: wiz-iac

      - name: Upload scan results as artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: wiz-iac-scan-results
          path: |
            iac-results.sarif
            iac-results.json

      - name: Check scan results
        if: steps.iac_scan.outcome == 'failure'
        run: |
          echo "❌ IaC scan found policy violations"
          echo "📊 Check the Security tab for detailed results"
          cat iac-results.json | jq '.summary'
          exit 1
EOF
```

### 2.3 ワークフロー構成の解説

**重要なポイント**:

| 設定項目 | 説明 | 検証ポイント |
|---------|------|------------|
| `on: push/pull_request` | プッシュ時とPR作成時に自動実行 | mainへのpushでトリガーされるか |
| `permissions: security-events: write` | GitHub Security タブへの書き込み権限 | SARIFアップロードが成功するか |
| `--policy-hits-only` | ポリシー違反のみレポート | 結果が絞り込まれているか |
| `continue-on-error: true` | スキャン失敗でもワークフロー継続 | 後続ステップが実行されるか |
| `exit 1` | 最終的にビルドを失敗させる | ポリシー違反時にビルドが失敗するか |

---

## 🔧 手順3: Dockerイメージスキャン用ワークフローの作成

### 3.1 テスト用Dockerfileの作成

```bash
# シンプルなWebアプリケーション用のDockerfileを作成
cat > Dockerfile.webapp << 'EOF'
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Package files
COPY package*.json ./
RUN npm ci --only=production

# Application code
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine

# Security best practices
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy files with proper ownership
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Run as non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
EOF
```

### 3.2 Dockerスキャンワークフローファイルの作成

```bash
cat > .github/workflows/wiz-docker-scan.yml << 'EOF'
name: Wiz Docker Image Security Scan

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
      - develop
    paths:
      - '**/Dockerfile*'
      - '.github/workflows/wiz-docker-scan.yml'

permissions:
  contents: read
  security-events: write
  actions: read

jobs:
  build-and-scan:
    name: Build and Scan Docker Image
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.webapp
          push: false
          load: true
          tags: |
            wiz-verification-app:${{ github.sha }}
            wiz-verification-app:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Download Wiz CLI
        run: |
          curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/

      - name: Authenticate to Wiz
        run: |
          wizcli auth --id "${{ secrets.WIZ_CLIENT_ID }}" --secret "${{ secrets.WIZ_CLIENT_SECRET }}"

      - name: Scan Docker image
        id: docker_scan
        run: |
          wizcli docker scan \
            --image wiz-verification-app:${{ github.sha }} \
            --policy "Default vulnerabilities policy" \
            --policy-hits-only \
            --output docker-results.sarif,sarif \
            --output docker-results.json,json \
            --tag "repo=${{ github.repository }}" \
            --tag "image=wiz-verification-app" \
            --tag "commit_sha=${{ github.sha }}"
        continue-on-error: true

      - name: Generate SBOM
        run: |
          wizcli docker scan \
            --image wiz-verification-app:${{ github.sha }} \
            --output sbom.json,cyclonedx

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: docker-results.sarif
          category: wiz-docker

      - name: Upload scan results and SBOM
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: wiz-docker-scan-results
          path: |
            docker-results.sarif
            docker-results.json
            sbom.json

      - name: Check scan results
        if: steps.docker_scan.outcome == 'failure'
        run: |
          echo "❌ Docker image scan found policy violations"
          echo "📊 Scan Summary:"
          cat docker-results.json | jq '.summary'
          echo ""
          echo "🔴 Critical vulnerabilities:"
          cat docker-results.json | jq '.vulnerabilities[] | select(.severity == "CRITICAL") | {id: .id, package: .package, version: .version}'
          exit 1
EOF
```

### 3.3 SBOM（Software Bill of Materials）について

**SBOMとは**: ソフトウェアコンポーネントの詳細なリストで、以下の情報を含みます：
- パッケージ名、バージョン
- ライセンス情報
- 依存関係ツリー
- 既知の脆弱性

**検証ポイント**:
- CycloneDX形式でSBOMが生成されるか
- GitHub ArtifactsからSBOMをダウンロードできるか
- SBOMに含まれるパッケージ情報が正確か

---

## 🔧 手順4: ワークフローのコミットと実行

### 4.1 ファイルをコミットしてプッシュ

```bash
# すべてのファイルをステージング
git add .

# ファイルを確認
git status
# On branch scenario-03-cicd-integration
# Changes to be committed:
#   new file:   .github/workflows/wiz-iac-scan.yml
#   new file:   .github/workflows/wiz-docker-scan.yml
#   new file:   Dockerfile.webapp

# コミット
git commit -m "S03: Add Wiz CLI GitHub Actions workflows

- IaC scan workflow with SARIF upload
- Docker image scan workflow with SBOM generation
- Auto-fail build on policy violations"

# GitHubにプッシュ
git push -u origin scenario-03-cicd-integration
```

### 4.2 GitHub Actionsの実行確認

**Web UIで確認**:
```
1. GitHubリポジトリを開く
2. "Actions" タブをクリック
3. 実行中のワークフローを確認:
   ✅ Wiz IaC Security Scan - Running
   ✅ Wiz Docker Image Security Scan - Running
```

**GitHub CLIで確認（オプション）**:
```bash
# ワークフローの実行状況を確認
gh run list --branch scenario-03-cicd-integration

# 特定のワークフローの詳細を確認
gh run view --log
```

### 4.3 ワークフロー実行ログの確認

各ワークフローのログで以下が表示されることを確認：

**IaC Scanワークフロー**:
```
✅ Checkout repository
✅ Download Wiz CLI (wizcli version: 0.x.x)
✅ Authenticate to Wiz (Authentication successful)
❌ Run IaC Scan (Found 5 policy violations)
   - terraform/main.tf: S3 bucket with public access
   - terraform/main.tf: RDS instance not encrypted
   - terraform/security-groups.tf: Security group open to 0.0.0.0/0
📤 Upload SARIF to GitHub Security (Success)
📦 Upload scan results as artifact (Success)
❌ Check scan results (Build failed due to policy violations)
```

**Docker Scanワークフロー**:
```
✅ Checkout repository
✅ Set up Docker Buildx
✅ Build Docker image (wiz-verification-app:abc123)
✅ Download Wiz CLI
✅ Authenticate to Wiz
❌ Scan Docker image (Found 3 critical vulnerabilities)
✅ Generate SBOM (sbom.json created)
📤 Upload SARIF to GitHub Security (Success)
📦 Upload scan results and SBOM (Success)
❌ Check scan results (Build failed due to vulnerabilities)
```

---

## 🔧 手順5: WizCloudコンソールでのスキャン結果確認

### 5.1 Code Scansページでの確認

1. **WizCloudにログイン**: https://app.wiz.io/
2. **Code** > **Scans** に移動
3. リポジトリ名で検索: `your-repo-name`

**確認ポイント**:
- 最新のスキャン結果が表示されている
- Scan Typeが「IaC」「Docker Image」で分かれている
- Tagsに `repo`, `branch`, `commit_sha` が記録されている

### 5.2 Issuesの詳細確認

```
Code > Issues に移動
├─ フィルター: Repository = your-repo-name
└─ 検出されたIssuesの例:
    ├─ [IaC] S3 bucket allows public access
    │   ├─ Severity: CRITICAL
    │   ├─ File: terraform/main.tf:10-18
    │   └─ Recommendation: Add aws_s3_bucket_public_access_block
    │
    ├─ [IaC] RDS instance not encrypted at rest
    │   ├─ Severity: HIGH
    │   ├─ File: terraform/rds.tf:25
    │   └─ Recommendation: Set storage_encrypted = true
    │
    └─ [Vulnerability] Log4j RCE vulnerability (CVE-2021-44228)
        ├─ Severity: CRITICAL
        ├─ Package: log4j-core:2.14.1
        └─ Fix: Upgrade to version 2.17.1
```

---

## 🔧 手順6: GitHub Securityタブでの結果確認

### 6.1 Code Scanningアラートの確認

```
1. GitHubリポジトリを開く
2. "Security" タブをクリック
3. "Code scanning" セクションを選択
4. "Tool" フィルターで "Wiz" を選択
```

**期待される表示**:
```
🔴 Critical (3)
├─ S3 Bucket allows public access (terraform/main.tf:10-18)
├─ RDS instance not encrypted (terraform/rds.tf:25)
└─ Container has critical CVE-2021-44228 (Dockerfile.webapp)

🟡 High (4)
├─ Security group allows all traffic (terraform/security-groups.tf:43-48)
├─ Hardcoded database password (terraform/rds.tf:27)
├─ Using deprecated base image (Dockerfile.webapp:1)
└─ Root user in container (Dockerfile:12)
```

### 6.2 アラートの詳細確認

任意のアラート（例: "S3 Bucket allows public access"）をクリック：

**表示される情報**:
```
Problem:
  S3バケットがパブリックアクセスを許可しています。
  これにより、機密データが一般公開される可能性があります。

Recommendation:
  aws_s3_bucket_public_access_block リソースを追加し、
  すべてのパブリックアクセスをブロックしてください。

Locations:
  - terraform/main.tf, lines 10-18

Severity: Critical
CWE: CWE-732 (Incorrect Permission Assignment)
Tags: data-exposure, compliance, GDPR
```

---

## ✅ 検証チェックリスト

以下のチェックリストを使用して、シナリオ3の検証が完了したことを確認してください：

### GitHub Secrets設定
- [ ] `WIZ_CLIENT_ID` がGitHub Secretsに設定されている
- [ ] `WIZ_CLIENT_SECRET` がGitHub Secretsに設定されている
- [ ] Secretsがワークフローで正しく参照されている（エラーなし）

### IaCスキャンワークフロー
- [ ] `wiz-iac-scan.yml` がリポジトリに存在する
- [ ] プッシュ時にワークフローが自動実行される
- [ ] Wiz CLIが正常にダウンロード・認証される
- [ ] IaCスキャンが実行され、問題が検出される
- [ ] SARIF形式のレポートが生成される
- [ ] GitHub SecurityタブにIaC問題がアップロードされる

### Dockerスキャンワークフロー
- [ ] `wiz-docker-scan.yml` がリポジトリに存在する
- [ ] Dockerイメージが正常にビルドされる
- [ ] イメージスキャンが実行され、脆弱性が検出される
- [ ] SBOM（Software Bill of Materials）が生成される
- [ ] スキャン結果がArtifactsとしてアップロードされる

### GitHub Security統合
- [ ] GitHub SecurityタブでWizのアラートが表示される
- [ ] アラートに「Problem」「Recommendation」「Locations」が含まれる
- [ ] Severity（Critical/High/Medium/Low）が正しく表示される
- [ ] ファイル名と行番号へのリンクが機能する

### ポリシーベースのビルド制御
- [ ] ポリシー違反がある場合、ビルドが失敗する
- [ ] ワークフローログに具体的なエラー内容が表示される
- [ ] `continue-on-error: true` でスキャン後も後続ステップが実行される

---

## 📸 エビデンス収集

以下の画面をスクリーンショットとして保存し、検証レポートに添付してください：

### 必須エビデンス（6-8枚）

| # | スクリーンショット | 取得タイミング | ファイル名例 |
|---|------------------|--------------|--------------|
| 1 | **GitHub Secrets設定画面** | Secrets設定完了後 | `s03-01-github-secrets.png` |
|   | WIZ_CLIENT_IDとWIZ_CLIENT_SECRETが表示されている |  |  |
| 2 | **GitHub Actions実行一覧** | ワークフロー実行中 | `s03-02-actions-running.png` |
|   | 2つのワークフローが実行されている状態 |  |  |
| 3 | **IaCスキャンログ** | ワークフロー完了後 | `s03-03-iac-scan-log.png` |
|   | スキャン実行とポリシー違反検出のログ |  |  |
| 4 | **Dockerスキャンログ** | ワークフロー完了後 | `s03-04-docker-scan-log.png` |
|   | イメージスキャンとSBOM生成のログ |  |  |
| 5 | **GitHub Security タブ** | スキャン完了後 | `s03-05-security-alerts.png` |
|   | Code scanningアラート一覧（Critical/Highが表示） |  |  |
| 6 | **アラート詳細画面** | アラートクリック後 | `s03-06-alert-detail.png` |
|   | Problem、Recommendation、Locationsが表示 |  |  |
| 7 | **Artifacts画面** | ワークフロー完了後 | `s03-07-artifacts.png` |
|   | スキャン結果とSBOMがダウンロード可能 |  |  |
| 8 | **WizCloud Scans画面** | WizCloudログイン後 | `s03-08-wizcloud-scans.png` |
|   | GitHub Actionsからのスキャン結果が表示 |  |  |

### オプションエビデンス
- [ ] SBOM JSONファイルの内容（テキストエディタで開いた状態）
- [ ] ビルド失敗時のエラーメッセージ詳細
- [ ] WizCloudのIssues詳細画面

---

## 🔧 トラブルシューティング

### 問題1: Wiz CLIのダウンロードに失敗する

**症状**:
```
curl: (404) Not Found
Error: Failed to download Wiz CLI
```

**原因**: Wiz CLIのダウンロードURLが変更された

**解決策**:
```bash
# 最新のダウンロードURLを確認
# Wizドキュメント: https://docs.wiz.io/wiz-cli

# 特定のバージョンを指定:
curl -o wizcli https://downloads.wiz.io/wizcli/v0.104.0/wizcli-linux-amd64
chmod +x wizcli
sudo mv wizcli /usr/local/bin/
```

---

### 問題2: 認証に失敗する

**症状**:
```
Error: Authentication failed
Invalid client credentials
```

**原因**: GitHub Secretsが正しく設定されていない、または環境変数が渡されていない

**解決策**:
```bash
# 1. GitHub Secretsを確認
# Repository > Settings > Secrets and variables > Actions
# WIZ_CLIENT_ID と WIZ_CLIENT_SECRET が存在するか確認

# 2. ワークフローでSecretsのデバッグ（最初の5文字のみ表示）
- name: Debug secrets
  run: |
    echo "Client ID (first 5 chars): ${WIZ_CLIENT_ID:0:5}"
  env:
    WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}

# 3. Wiz CLIの認証を手動でテスト
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
```

---

### 問題3: SARIFアップロードに失敗する

**症状**:
```
Error: upload-sarif action failed
Unable to upload SARIF file to GitHub Security
```

**原因**: `permissions` 設定が不足、またはSARIFファイルが存在しない

**解決策**:
```yaml
# 1. permissionsセクションを確認
permissions:
  contents: read
  security-events: write  # これが必須
  actions: read

# 2. SARIFファイルの存在を確認
- name: Check SARIF file
  run: |
    if [ ! -f "iac-results.sarif" ]; then
      echo "❌ SARIF file not found"
      ls -la
      exit 1
    fi
    echo "✅ SARIF file exists"
    cat iac-results.sarif | head -n 20

# 3. upload-sarif アクションに if: always() を追加
- name: Upload SARIF to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  if: always()  # スキャン失敗時もアップロード
  with:
    sarif_file: iac-results.sarif
    category: wiz-iac
```

---

### 問題4: ビルドが期待通りに失敗しない

**症状**: ポリシー違反があるのにワークフローが成功してしまう

**原因**: `continue-on-error` の使い方が間違っている

**解決策**:
```yaml
# 正しい設定パターン
- name: Run IaC Scan
  id: iac_scan
  run: wizcli iac scan ...
  continue-on-error: true  # スキャンステップは継続

# 中間ステップ（SARIFアップロードなど）
- name: Upload SARIF
  if: always()
  uses: github/codeql-action/upload-sarif@v3
  ...

# 最後に明示的にチェック
- name: Check scan results
  if: steps.iac_scan.outcome == 'failure'
  run: |
    echo "❌ Scan found violations"
    exit 1  # ここでビルドを失敗させる
```

---

## 🎓 まとめ

### このシナリオで検証できたこと

✅ **自動セキュリティスキャン**: GitHub Actionsで自動的にIaC、Docker、依存関係をスキャン
✅ **ポリシーベースのビルド制御**: セキュリティポリシー違反時にビルドを自動的に失敗させる
✅ **GitHub Security統合**: SARIF形式でGitHub Securityタブと統合し、統一的なアラート管理
✅ **SBOM生成**: ソフトウェアサプライチェーンの可視性を確保
✅ **エビデンス保存**: スキャン結果をArtifactsとして保存し、監査証跡を確保

### 主要なメリット

| メリット | 説明 |
|---------|------|
| **シフトレフト** | 本番環境にデプロイする前に問題を検出 |
| **自動化** | 手動スキャンの手間を削減、ヒューマンエラーを防止 |
| **一元管理** | すべてのセキュリティアラートをGitHub Securityで管理 |
| **トレーサビリティ** | コミット、ブランチ、ワークフローIDで結果を追跡 |

---

## 🔄 次のステップ

シナリオ3が完了したら、次のシナリオに進みます：

- **[シナリオ4: IaCスキャン](./S04-iac-scanning.md)**: Terraformファイルの詳細なスキャンと修正
- **[シナリオ5: シークレット検出](./S05-secret-detection.md)**: ハードコードされた認証情報の検出と防止

---

## 📚 参考資料

### Wiz公式ドキュメント
- [Wiz CLI Documentation](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [GitHub Actions Integration](https://docs.wiz.io/wiz-docs/docs/github-actions-integration)
- [SARIF Output Format](https://docs.wiz.io/wiz-docs/docs/sarif-output)

### GitHub公式ドキュメント
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Code Scanning Documentation](https://docs.github.com/en/code-security/code-scanning)
- [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### 業界標準
- [SARIF Format Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [SBOM (Software Bill of Materials)](https://www.ntia.gov/sbom)
- [CycloneDX SBOM Standard](https://cyclonedx.org/)

---

**📝 注意事項**: このシナリオで使用するファイルには、意図的にセキュリティ脆弱性が含まれています。Wizの検出機能をテストするためのものであり、本番環境では絶対に使用しないでください。

**💡 ヒント**: 再検証時は、新しいブランチを作成して検証を行うと、履歴を保ちながら複数回の検証が可能です（詳細は [BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md) を参照）。
