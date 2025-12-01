# シナリオ3: GitHub ActionsでのWiz CLI統合とCI/CDパイプライン

## 📋 目的
GitHub ActionsのCI/CDパイプラインにWiz CLIを統合し、ビルドプロセス中にコード、IaC、Dockerイメージの自動スキャンを実行し、ポリシー違反がある場合はビルドを失敗させる能力を検証します。

## 🎯 検証内容
- Wiz CLIのGitHub Actions統合
- IaCスキャンの自動化
- Dockerイメージスキャンの自動化
- ポリシーベースのビルド制御
- SBOMの生成と記録
- SARIF形式でのレポート出力

---

## 📚 前提条件

### 必要なツール
- GitHubリポジトリ（シナリオ2で作成済み）
- GitHub Actions（有効化済み）
- Docker Hubアカウント（またはAWS ECR、GitHub Container Registry）
- Wiz Service Account（シナリオ1で作成済み）

### 前提シナリオ
- シナリオ1、2が完了していること

---

## 🔧 手順1: GitHub Secretsの設定

### 1.1 Wiz認証情報をGitHub Secretsに追加
```bash
# GitHub CLIを使用する場合
gh secret set WIZ_CLIENT_ID --body "your_client_id_here"
gh secret set WIZ_CLIENT_SECRET --body "your_client_secret_here"

# または、GitHubウェブUIから:
# 1. GitHubリポジトリ > Settings > Secrets and variables > Actions
# 2. "New repository secret" をクリック
# 3. Name: WIZ_CLIENT_ID, Secret: [Client ID] を入力
# 4. "Add secret" をクリック
# 5. 同様に WIZ_CLIENT_SECRET も追加
```

### 1.2 Docker Hub認証情報の追加（オプション）
```bash
# Docker Hubを使用する場合
gh secret set DOCKERHUB_USERNAME --body "your_dockerhub_username"
gh secret set DOCKERHUB_TOKEN --body "your_dockerhub_token"
```

---

## 🔧 手順2: 基本的なGitHub Actionsワークフローの作成

### 2.1 ワークフローディレクトリの作成
```bash
# リポジトリのルートに移動
cd ~/wiz-code-verification/scenario-01

# .github/workflowsディレクトリを作成
mkdir -p .github/workflows
```

### 2.2 IaCスキャン用ワークフローの作成
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
            --tag "commit_sha=${{ github.sha }}" \
            --tag "workflow=${{ github.workflow }}" \
            --tag "run_id=${{ github.run_id }}"
        continue-on-error: true

      - name: Upload SARIF file to GitHub Security
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

---

## 🔧 手順3: Dockerイメージスキャン用ワークフローの作成

### 3.1 Dockerfileの準備
```bash
# シンプルなWebアプリケーション用のDockerfileを作成
cat > Dockerfile.webapp << 'EOF'
# Multi-stage build
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

# セキュリティベストプラクティス
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# ファイルのコピー
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# 非rootユーザーで実行
USER nodejs

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
EOF
```

### 3.2 Docker イメージスキャン用ワークフローの作成
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
            --tag "commit_sha=${{ github.sha }}" \
            --tag "branch=${{ github.ref_name }}"
        continue-on-error: true

      - name: Generate SBOM
        run: |
          wizcli docker scan \
            --image wiz-verification-app:${{ github.sha }} \
            --output sbom.json,spdx

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

---

## 🔧 手順4: 統合スキャンワークフローの作成

### 4.1 包括的なセキュリティスキャンワークフローの作成
```bash
cat > .github/workflows/wiz-full-scan.yml << 'EOF'
name: Wiz Full Security Scan

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  schedule:
    # 毎日午前2時（UTC）に実行
    - cron: '0 2 * * *'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  actions: read

jobs:
  wiz-comprehensive-scan:
    name: Comprehensive Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Wiz CLI
        run: |
          curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/
          wizcli version

      - name: Authenticate to Wiz
        run: |
          wizcli auth --id "${{ secrets.WIZ_CLIENT_ID }}" --secret "${{ secrets.WIZ_CLIENT_SECRET }}"

      # 1. ディレクトリスキャン（依存関係とシークレット）
      - name: Scan directory for vulnerabilities and secrets
        id: dir_scan
        run: |
          wizcli dir scan \
            --path . \
            --policy "Default vulnerabilities policy" \
            --output dir-results.json,json \
            --tag "scan_type=directory"
        continue-on-error: true

      # 2. IaCスキャン
      - name: Scan IaC files
        id: iac_scan
        run: |
          wizcli iac scan \
            --path . \
            --policy "Default IaC policy" \
            --output iac-results.sarif,sarif \
            --output iac-results.json,json \
            --tag "scan_type=iac"
        continue-on-error: true

      # 3. シークレットスキャン
      - name: Scan for secrets
        id: secret_scan
        run: |
          wizcli dir scan \
            --path . \
            --secrets-only \
            --output secrets-results.json,json \
            --tag "scan_type=secrets"
        continue-on-error: true

      # 4. Dockerイメージビルドとスキャン
      - name: Build Docker image
        if: hashFiles('**/Dockerfile*') != ''
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.webapp
          push: false
          load: true
          tags: wiz-scan-test:latest

      - name: Scan Docker image
        if: hashFiles('**/Dockerfile*') != ''
        id: docker_scan
        run: |
          wizcli docker scan \
            --image wiz-scan-test:latest \
            --policy "Default vulnerabilities policy" \
            --output docker-results.sarif,sarif \
            --output docker-results.json,json \
            --tag "scan_type=docker"
        continue-on-error: true

      # 5. SBOMの生成
      - name: Generate SBOM
        if: hashFiles('**/Dockerfile*') != ''
        run: |
          wizcli docker scan \
            --image wiz-scan-test:latest \
            --output sbom-cyclonedx.json,cyclonedx \
            --output sbom-spdx.json,spdx

      # 6. 結果の集約とレポート生成
      - name: Aggregate results
        if: always()
        run: |
          echo "# 🛡️ Wiz Security Scan Summary" > scan-summary.md
          echo "" >> scan-summary.md
          echo "## 📊 Scan Results" >> scan-summary.md
          echo "" >> scan-summary.md
          
          # Directory Scan
          if [ -f "dir-results.json" ]; then
            echo "### Directory Scan" >> scan-summary.md
            cat dir-results.json | jq -r '"- Vulnerabilities: \(.summary.vulnerabilities // 0)\n- Secrets: \(.summary.secrets // 0)"' >> scan-summary.md
            echo "" >> scan-summary.md
          fi
          
          # IaC Scan
          if [ -f "iac-results.json" ]; then
            echo "### IaC Scan" >> scan-summary.md
            cat iac-results.json | jq -r '"- Issues found: \(.summary.total // 0)\n- Critical: \(.summary.critical // 0)\n- High: \(.summary.high // 0)"' >> scan-summary.md
            echo "" >> scan-summary.md
          fi
          
          # Docker Scan
          if [ -f "docker-results.json" ]; then
            echo "### Docker Image Scan" >> scan-summary.md
            cat docker-results.json | jq -r '"- Vulnerabilities: \(.summary.vulnerabilities // 0)\n- Critical: \(.summary.critical // 0)\n- High: \(.summary.high // 0)"' >> scan-summary.md
            echo "" >> scan-summary.md
          fi
          
          cat scan-summary.md

      # 7. SARIFファイルのアップロード
      - name: Upload IaC SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always() && hashFiles('iac-results.sarif') != ''
        with:
          sarif_file: iac-results.sarif
          category: wiz-iac

      - name: Upload Docker SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always() && hashFiles('docker-results.sarif') != ''
        with:
          sarif_file: docker-results.sarif
          category: wiz-docker

      # 8. すべての結果をアーティファクトとしてアップロード
      - name: Upload all scan results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: wiz-full-scan-results-${{ github.sha }}
          path: |
            *-results.json
            *-results.sarif
            sbom-*.json
            scan-summary.md

      # 9. スキャン結果の評価
      - name: Evaluate scan results
        if: always()
        run: |
          EXIT_CODE=0
          
          # Check directory scan
          if [ "${{ steps.dir_scan.outcome }}" == "failure" ]; then
            echo "::error::Directory scan found critical issues"
            EXIT_CODE=1
          fi
          
          # Check IaC scan
          if [ "${{ steps.iac_scan.outcome }}" == "failure" ]; then
            echo "::error::IaC scan found policy violations"
            EXIT_CODE=1
          fi
          
          # Check secrets scan
          if [ "${{ steps.secret_scan.outcome }}" == "failure" ]; then
            echo "::error::Hardcoded secrets detected"
            EXIT_CODE=1
          fi
          
          # Check Docker scan
          if [ "${{ steps.docker_scan.outcome }}" == "failure" ]; then
            echo "::error::Docker image scan found critical vulnerabilities"
            EXIT_CODE=1
          fi
          
          if [ $EXIT_CODE -ne 0 ]; then
            echo "❌ Security scan failed. Please review the results."
            cat scan-summary.md
          else
            echo "✅ All security scans passed!"
          fi
          
          exit $EXIT_CODE
EOF
```

---

## 🔧 手順5: Pre-commit Hook統合（オプション）

### 5.1 Pre-commit設定ファイルの作成
```bash
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: local
    hooks:
      - id: wiz-secrets-scan
        name: Wiz Secrets Scan
        entry: bash -c 'wizcli dir scan --path . --secrets-only'
        language: system
        pass_filenames: false
        always_run: true
EOF
```

### 5.2 Pre-commit のセットアップ手順書を作成
```bash
cat > PRECOMMIT_SETUP.md << 'EOF'
# Pre-commit Hookのセットアップ

## インストール
```bash
# pre-commitツールをインストール
pip install pre-commit

# Wiz CLIをインストール
curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)
chmod +x wizcli
sudo mv wizcli /usr/local/bin/

# Wiz CLIを認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# pre-commit hooksをインストール
pre-commit install
```

## 使い方
コミット時に自動的にWizスキャンが実行されます:
```bash
git add .
git commit -m "Your commit message"
# → Wizが自動的にシークレットスキャンを実行
```
EOF
```

---

## 🔧 手順6: ワークフローのテスト

### 6.1 ファイルをコミットしてプッシュ
```bash
# すべてのファイルをステージング
git add .

# コミット
git commit -m "Add Wiz CLI GitHub Actions workflows"

# GitHubにプッシュ
git push origin main
```

### 6.2 GitHub Actionsの実行確認
```bash
# GitHubリポジトリページで:
# 1. "Actions" タブをクリック
# 2. 実行中のワークフローを確認
# 3. ワークフローをクリックして詳細を表示
```

**期待される動作:**
```
✅ Wiz IaC Security Scan - Running
✅ Wiz Docker Image Security Scan - Running
✅ Wiz Full Security Scan - Running
```

### 6.3 スキャン結果の確認
```bash
# 各ワークフローのログを確認し、以下が表示されることを確認:

# IaC Scan:
✅ Downloaded Wiz CLI
✅ Authenticated to Wiz
❌ Run IaC Scan - Found policy violations
   - main.tf: S3 bucket with public access
   - main.tf: RDS instance not encrypted
   - main.tf: Security group open to 0.0.0.0/0
📤 Uploaded SARIF to GitHub Security

# Docker Scan:
✅ Built Docker image
✅ Scanned Docker image
✅ Generated SBOM
📤 Uploaded results
```

---

## 🔧 手順7: GitHub Securityタブでの結果確認

### 7.1 Security タブを開く
```bash
# GitHubリポジトリページで:
# 1. "Security" タブをクリック
# 2. "Code scanning" セクションを選択
# 3. "Wiz" カテゴリのアラートを確認
```

### 7.2 検出されたアラートの確認
**期待される表示:**
```
🔴 Critical (3)
├─ S3 Bucket allows public access (main.tf:10-18)
├─ RDS instance not encrypted (main.tf:25)
└─ Container running as root (Dockerfile:12)

🟡 High (4)
├─ Security group allows all traffic (main.tf:43-48)
├─ Hardcoded database password (main.tf:27)
├─ Hardcoded AWS credentials (config.py:14-15)
└─ Using deprecated base image (Dockerfile:1)
```

### 7.3 アラートの詳細を確認
1. 任意のアラートをクリック
2. 以下が表示されることを確認:
   - **Problem**: 問題の説明
   - **Recommendation**: 推奨される修正方法
   - **Locations**: 問題が発生しているファイルと行番号
   - **References**: 関連するCWE、CVE情報

---

## 🔧 手順8: カスタムポリシーの作成と適用

### 8.1 Wizポータルでカスタムポリシーを作成
```bash
# Wizポータルで:
# 1. Policies > Code Policies に移動
# 2. "Create Policy" をクリック
# 3. 以下を設定:
Name: Strict Security Policy
Description: 厳格なセキュリティポリシー（検証用）

Rules:
  IaC:
    - Block: S3 buckets with public access
    - Block: Unencrypted storage
    - Block: Security groups open to 0.0.0.0/0
  
  Vulnerabilities:
    - Block: Critical vulnerabilities
    - Block: High vulnerabilities with exploit available
  
  Secrets:
    - Block: Any hardcoded secrets

Fail Build: Enabled
```

### 8.2 ワークフローでカスタムポリシーを使用
```bash
# .github/workflows/wiz-iac-scan.yml を編集
# --policy の値を変更:
--policy "Strict Security Policy"
```

---

## 📊 検証結果の確認

### 成功基準
以下がすべて確認できれば、検証成功です:

✅ **GitHub SecretsにWiz認証情報が正しく設定された**
✅ **IaCスキャンワークフローが正常に実行され、問題を検出した**
✅ **Dockerイメージスキャンが実行され、脆弱性を検出した**
✅ **SBOM（Software Bill of Materials）が生成された**
✅ **SARIF形式のレポートがGitHub Securityタブにアップロードされた**
✅ **ポリシー違反がある場合、ビルドが失敗した**
✅ **スキャン結果がArtifactsとして保存された**
✅ **GitHub Securityタブでアラートを確認できた**
✅ **スケジュール実行（cron）が設定された**
✅ **手動実行（workflow_dispatch）が可能**

---

## 📸 スクリーンショット取得ポイント

以下の画面をスクリーンショットとして保存し、検証レポートに添付してください:

1. **GitHub Secrets設定画面**（WIZ_CLIENT_ID, WIZ_CLIENT_SECRETが設定されている）
2. **GitHub Actions タブ**（3つのワークフローが実行されている）
3. **IaCスキャンワークフローのログ**（スキャン実行中の画面）
4. **Dockerスキャンワークフローのログ**（イメージスキャン中の画面）
5. **統合スキャンワークフローの完了画面**（scan-summaryが表示されている）
6. **GitHub Security タブ**（Code scanningアラートが表示されている）
7. **個別アラートの詳細画面**（Problem、Recommendation、Locationsが表示されている）
8. **Artifactsのダウンロード画面**（スキャン結果がアップロードされている）
9. **SBOM JSONファイルの内容**（ダウンロードして開いた状態）
10. **失敗したビルドの画面**（ポリシー違反でビルドが失敗した状態）

---

## 🎓 学んだこと

このシナリオで検証できた機能:
- **CI/CDパイプラインに自動セキュリティスキャンを組み込める**
- **ポリシーベースでビルドの成功/失敗を制御できる**
- **SARIF形式でGitHub Securityと統合し、統一的なアラート管理ができる**
- **SBOMを自動生成し、ソフトウェアサプライチェーンの可視性を確保できる**
- **複数のスキャンタイプ（IaC、Docker、シークレット、依存関係）を一度に実行できる**
- **スキャン結果をアーティファクトとして保存し、監査証跡を残せる**

---

## 🔄 次のステップ

シナリオ3が完了したら、次のシナリオに進みます:
- **シナリオ4**: AWS環境へのデプロイ準備とECR統合

---

## ❓ トラブルシューティング

### 問題1: Wiz CLIのダウンロードに失敗する
**症状**: `curl: (404) Not Found` エラーが表示される
**解決策**:
```bash
# 最新のダウンロードURLを確認
# Wizドキュメントから正しいURLを取得: https://docs.wiz.io/wiz-cli

# または、特定のバージョンを指定:
curl -o wizcli https://downloads.wiz.io/wizcli/v0.104.0/wizcli-linux-amd64
```

### 問題2: 認証に失敗する
**症状**: `Authentication failed` エラーが表示される
**解決策**:
```bash
# GitHub Secretsが正しく設定されているか確認
# ワークフローログで以下を確認:
echo "Client ID (first 5 chars): ${WIZ_CLIENT_ID:0:5}"

# Secretsが正しく渡されているか確認
# GitHubリポジトリ > Settings > Secrets and variables > Actions
# WIZ_CLIENT_ID と WIZ_CLIENT_SECRET が存在するか確認
```

### 問題3: SARIFアップロードに失敗する
**症状**: `Error uploading SARIF file` が表示される
**解決策**:
```bash
# permissionsセクションを確認
permissions:
  contents: read
  security-events: write  # これが必要
  actions: read

# SARIFファイルが存在するか確認
- name: Check SARIF file
  run: |
    if [ ! -f "iac-results.sarif" ]; then
      echo "SARIF file not found"
      ls -la
    fi
```

### 問題4: ビルドが期待通りに失敗しない
**症状**: ポリシー違反があるのにビルドが成功してしまう
**解決策**:
```bash
# continue-on-error を確認
# 以下のように設定されているか確認:
- name: Run IaC Scan
  id: iac_scan
  run: wizcli iac scan ...
  continue-on-error: true  # これでステップは継続

# 最後に明示的にチェック:
- name: Check scan results
  if: steps.iac_scan.outcome == 'failure'
  run: exit 1  # これでビルドを失敗させる
```

---

## 📚 参考資料
- [Wiz CLI Documentation](https://docs.wiz.io/wiz-cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SARIF Format Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [SBOM (Software Bill of Materials)](https://www.ntia.gov/sbom)
