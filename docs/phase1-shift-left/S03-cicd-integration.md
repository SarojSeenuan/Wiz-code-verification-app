# シナリオ3: GitHub ActionsでのWiz CLI統合とCI/CDパイプライン

## 📋 シナリオ概要

### 目的
GitHub ActionsのCI/CDパイプラインにWiz CLIを統合し、ビルドプロセス中にコード、IaC、Dockerイメージの自動スキャンを実行し、ポリシー違反がある場合はビルドを失敗させる能力を検証します。

### 検証内容
- ✅ Wiz CLIのGitHub Actions統合
- ✅ ソースコードスキャン（バックエンド・フロントエンド）
- ✅ Dockerイメージビルドとスキャンの自動化
- ✅ SARIF形式でのレポート生成とGitHub Security統合
- ✅ ポリシーベースのビルド制御
- ✅ 検証結果のアーティファクト保存

---

## ⏱️ 所要時間

| フェーズ | 所要時間 | 説明 |
|---------|---------|------|
| **初回セットアップ** | 30-45分 | GitHub Secrets設定、ワークフロー確認、初回実行 |
| **検証作業** | 20-30分 | ワークフロー実行確認、結果分析、エビデンス収集 |
| **再検証** | 10-15分 | 新しいブランチで同じ検証を実施する場合 |

**💡 ヒント**: 既存のワークフローファイルを使用するため、設定は最小限で済みます。

---

## 📋 前提条件

### ✅ 必須要件
- [x] **シナリオ1完了**: Wiz Service Accountが作成済み
- [x] **シナリオ2完了**: GitHubリポジトリが存在し、Wiz GitHub Appが接続済み
- [x] **Git環境**: Git 2.30以上がインストール済み
- [x] **GitHub Actions**: リポジトリでGitHub Actionsが有効化されている

### 📦 必要なツール
```bash
# ツールのバージョン確認
git --version          # Git 2.30以上
gh --version          # GitHub CLI 2.0以上（オプション）
```

### 🔑 必要な情報
- Wiz Service Account Client ID（シナリオ1で取得）
- Wiz Service Account Client Secret（シナリオ1で取得）
- GitHubリポジトリのURL

---

## 📁 プロジェクト構造の確認

このシナリオでは、**既存の`taskflow-app`プロジェクト**を使用します。

### ディレクトリ構造

```
WizCodeVerification/
└── taskflow-app/                    # TaskFlowサンプルアプリケーション
    ├── .github/
    │   └── workflows/
    │       └── S03-wiz-full-scan.yml    ⭐ 既存のワークフローファイル
    ├── backend/                     # Node.js/Expressバックエンド
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/
    ├── frontend/                    # Next.js/Reactフロントエンド
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/
    └── terraform/                   # Terraformインフラコード
        └── environments/
```

### 🎯 検証対象

| コンポーネント | ファイルパス | スキャン対象 |
|-------------|------------|------------|
| **バックエンド** | `taskflow-app/backend/` | ソースコード、依存関係、Dockerfile |
| **フロントエンド** | `taskflow-app/frontend/` | ソースコード、依存関係、Dockerfile |
| **ワークフロー** | `taskflow-app/.github/workflows/S03-wiz-full-scan.yml` | CI/CDパイプライン |

---

## 🔧 手順1: 既存ワークフローの確認

### 1.1 ワークフローファイルの内容確認

既存のワークフローファイルを確認します：

```bash
# taskflow-appディレクトリに移動
cd ~/WizCodeVerification/taskflow-app

# ワークフローファイルを確認
cat .github/workflows/S03-wiz-full-scan.yml
```

**ワークフローの主要な構成要素**:

1. **トリガー設定**:
   - `push`イベント: `main`, `develop`ブランチへのプッシュ
   - `pull_request`イベント: `main`ブランチへのPR作成

2. **3つのジョブ**:
   - **source-code-scan**: バックエンド・フロントエンドのソースコードスキャン
   - **docker-build-and-scan**: Dockerイメージビルド＆スキャン（matrix戦略）
   - **generate-report**: 脆弱性レポート生成

3. **重要な機能**:
   - SARIF形式でのレポート出力
   - GitHub Securityタブへの自動アップロード
   - スキャン結果のアーティファクト保存
   - ポリシー違反時のビルド制御

### 1.2 ワークフローの主要ステップ

**ソースコードスキャンジョブ**:
```yaml
- name: バックエンドスキャン
  run: |
    wizcli dir scan \
      --path ./backend \
      --name "backend-source-${{ github.sha }}" \
      --tag "component=backend" \
      --tag "branch=${{ github.ref_name }}" \
      --tag "scan-type=source-code" \
      --policy-hits-only
```

**Dockerイメージスキャンジョブ**（matrix戦略）:
```yaml
strategy:
  matrix:
    component: [backend, frontend]

steps:
  - name: Dockerイメージビルド
    run: |
      cd ${{ matrix.component }}
      docker build -t taskflow-${{ matrix.component }}:${{ github.sha }} .

  - name: Dockerイメージスキャン
    run: |
      wizcli docker scan \
        --image taskflow-${{ matrix.component }}:${{ github.sha }} \
        --output docker-${{ matrix.component }}-results.sarif,sarif \
        --policy-hits-only
```

### 1.3 ワークフローの特徴

| 機能 | 説明 | 検証ポイント |
|------|------|------------|
| **permissions設定** | `security-events: write`でGitHub Security統合 | SARIFアップロードが成功するか |
| **matrix戦略** | backend/frontendを並列スキャン | 両方のコンポーネントがスキャンされるか |
| **continue-on-error** | スキャン失敗でもワークフロー継続 | 結果がアーティファクトに保存されるか |
| **タグ付け** | component, branch, commit情報を記録 | WizCloudで検索可能か |
| **mainブランチのみECRプッシュ** | 本番イメージは`main`のみデプロイ | 条件分岐が正しく動作するか |

---

## 🔧 手順2: GitHub Secretsの設定

### 2.1 AWS認証情報の設定（後のPhaseで使用）

```bash
# AWSアカウント情報を設定（ECRプッシュ用、Phase 2で使用）
gh secret set AWS_ACCOUNT_ID --body "123456789012"
gh secret set AWS_REGION --body "ap-northeast-1"
gh secret set AWS_ACCESS_KEY_ID --body "AKIAXXXXXXXXXXXXXXXX"
gh secret set AWS_SECRET_ACCESS_KEY --body "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 2.2 Wiz認証情報の設定

```bash
# Wiz認証情報を設定
gh secret set WIZ_CLIENT_ID --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set WIZ_CLIENT_SECRET --body "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 設定の確認
gh secret list
```

**期待される出力**:
```
AWS_ACCOUNT_ID         Updated 2025-12-03
AWS_ACCESS_KEY_ID      Updated 2025-12-03
AWS_REGION             Updated 2025-12-03
AWS_SECRET_ACCESS_KEY  Updated 2025-12-03
WIZ_CLIENT_ID          Updated 2025-12-03
WIZ_CLIENT_SECRET      Updated 2025-12-03
```

### 2.3 GitHub Web UIでの設定（代替方法）

1. GitHubリポジトリを開く
2. **Settings** > **Secrets and variables** > **Actions** に移動
3. **New repository secret** をクリック
4. 上記のSecretsを1つずつ追加

**🔐 セキュリティ注意**:
- Secretsは一度保存すると読み取りできません（編集のみ可能）
- 本番環境では、環境ごとにSecretsを分けることを推奨します
- AWS認証情報はPhase 2（S06-S08）で実際に使用します

---

## 🗂️ 検証ブランチの作成

CI/CD検証専用のブランチを作成します：

```bash
# taskflow-appディレクトリに移動
cd ~/WizCodeVerification/taskflow-app

# 検証用ブランチを作成
git checkout -b scenario-03-cicd-verification-$(date +%Y%m%d)

# ブランチの確認
git branch
```

**💡 ヒント**:
- 日付付きブランチ名で検証履歴を管理できます
- 例: `scenario-03-cicd-verification-20251203`
- 再検証時は新しい日付で新ブランチを作成してください

---

## 🔧 手順3: ワークフローのトリガーとテスト

### 3.1 テストコミットの作成

ワークフローをトリガーするために、軽微な変更をコミットします：

```bash
# READMEに検証記録を追加
echo "" >> README.md
echo "## S03検証: $(date '+%Y-%m-%d %H:%M:%S')" >> README.md
echo "- Wiz CLI GitHub Actions統合テスト" >> README.md
echo "- ブランチ: $(git branch --show-current)" >> README.md

# 変更を確認
git diff README.md

# コミット
git add README.md
git commit -m "S03: CI/CD integration verification test

- Trigger GitHub Actions workflow
- Test Wiz CLI source code scan
- Test Docker image build and scan
- Verify SARIF upload to GitHub Security"

# GitHubにプッシュ
git push -u origin $(git branch --show-current)
```

### 3.2 GitHub Actionsの実行確認

**方法1: GitHub Web UI**

1. GitHubリポジトリを開く
2. **Actions** タブをクリック
3. 最新のワークフロー実行を確認:
   - ワークフロー名: `S03 - Wiz Full Scan`
   - トリガー: `push`
   - ブランチ: `scenario-03-cicd-verification-YYYYMMDD`

**方法2: GitHub CLI**

```bash
# ワークフローの実行状況を確認
gh run list --workflow="S03-wiz-full-scan.yml" --limit 5

# 最新のワークフローをウォッチ
gh run watch
```

### 3.3 ワークフロー実行ログの確認

各ジョブのログで以下が表示されることを確認します：

**source-code-scanジョブ**:
```
✅ コードチェックアウト
✅ Wiz CLIダウンロード
✅ Wiz認証 (Authentication successful)
🔍 バックエンドスキャン
   - Scanning: ./backend
   - Files scanned: 127
   - Policy violations found: 2
🔍 フロントエンドスキャン
   - Scanning: ./frontend
   - Files scanned: 83
   - Policy violations found: 1
```

**docker-build-and-scanジョブ（backend）**:
```
✅ コードチェックアウト
✅ AWS認証情報設定
✅ Amazon ECRログイン
✅ Dockerイメージビルド
   - Building: taskflow-backend:abc123
   - Build time: 3m 42s
🔍 Dockerイメージスキャン
   - Scanning: taskflow-backend:abc123
   - Vulnerabilities: 15 (3 CRITICAL, 7 HIGH, 5 MEDIUM)
   - Policy violations: Yes
📤 SARIF結果をGitHub Securityにアップロード (Success)
📦 スキャン結果をArtifactとして保存 (Success)
⚠️  スキャン結果の確認: Policy violations detected
```

**docker-build-and-scanジョブ（frontend）**:
```
（同様の手順でfrontendをスキャン）
```

**generate-reportジョブ**:
```
✅ コードチェックアウト
✅ Wiz CLIダウンロード
✅ Wiz認証
📝 スキャンサマリー出力
📦 レポートをアーティファクトとして保存 (Success)
```

---

## 🔧 手順4: GitHub Securityタブでの結果確認

### 4.1 Code Scanningアラートの確認

1. GitHubリポジトリを開く
2. **Security** タブをクリック
3. 左サイドバーから **Code scanning** を選択
4. アラート一覧を確認

**期待される結果**:

| Tool | Category | Alerts | Severity |
|------|----------|--------|----------|
| Wiz | wiz-docker-backend | 5-10件 | CRITICAL/HIGH |
| Wiz | wiz-docker-frontend | 3-7件 | CRITICAL/HIGH |

### 4.2 アラートの詳細確認

アラートをクリックして詳細を確認：

```
⚠️  Critical: Known vulnerability in node:18-alpine base image
├─ CVE-2024-XXXXX
├─ Severity: CRITICAL (CVSS 9.8)
├─ Affected: node:18-alpine
├─ Fixed in: node:20-alpine
└─ Recommendation: Upgrade to node:20-alpine

📍 Location:
├─ File: backend/Dockerfile
├─ Line: 1
└─ Code:
    FROM node:18-alpine  # Vulnerable base image
```

### 4.3 SARIF形式の利点

**GitHub Securityとの統合メリット**:
- ✅ コードレビュー時にアラートが自動表示
- ✅ PRマージ前にセキュリティチェック可能
- ✅ 脆弱性の経年変化を追跡可能
- ✅ ブランチ保護ルールと連携可能

---

## 🔧 手順5: WizCloudコンソールでの結果確認

### 5.1 Code Scansページでの確認

1. **WizCloudにログイン**: https://app.wiz.io/
2. **Code** > **Scans** に移動
3. リポジトリ名で検索: `taskflow-app`

**確認ポイント**:

| 項目 | 期待される値 | 実際の値 |
|------|------------|---------|
| **Scan Type** | Source Code / Docker Image | ✅ |
| **Branch** | scenario-03-cicd-verification-YYYYMMDD | ✅ |
| **Commit SHA** | プッシュしたコミットのSHA | ✅ |
| **Tags** | component=backend, scan-type=source-code | ✅ |
| **Policy Hits** | 検出あり | ✅ |

### 5.2 Issuesの詳細確認

```
Code > Issues に移動
├─ フィルター: Repository = taskflow-app
└─ 検出されたIssuesの例:
    ├─ [Docker] Critical vulnerability in base image
    │   ├─ Severity: CRITICAL
    │   ├─ Image: taskflow-backend:abc123
    │   ├─ CVE: CVE-2024-XXXXX
    │   └─ Recommendation: Upgrade base image
    │
    ├─ [Source Code] SQL Injection vulnerability
    │   ├─ Severity: HIGH
    │   ├─ File: backend/src/controllers/user.controller.ts:42
    │   ├─ Line: const query = `SELECT * FROM users WHERE id = ${req.params.id}`
    │   └─ Recommendation: Use parameterized queries
    │
    └─ [Dependencies] Known vulnerability in npm package
        ├─ Severity: MEDIUM
        ├─ Package: express@4.17.1
        ├─ Fixed in: express@4.18.0
        └─ Recommendation: npm update express
```

### 5.3 Scanの詳細情報確認

Scanをクリックして詳細を確認：

```
Scan Details
├─ Scan ID: scan-abc123def456
├─ Repository: taskflow-app
├─ Branch: scenario-03-cicd-verification-20251203
├─ Commit: abc123def456...
├─ Scan Type: Source Code
├─ Scan Time: 2025-12-03 10:30:45 UTC
├─ Duration: 2m 15s
└─ Results:
    ├─ Files Scanned: 127
    ├─ Total Issues: 8
    ├─ Critical: 2
    ├─ High: 3
    ├─ Medium: 2
    └─ Low: 1
```

---

## 🔧 手順6: スキャン結果アーティファクトのダウンロード

### 6.1 GitHub Actionsアーティファクトの確認

1. GitHubリポジトリの **Actions** タブを開く
2. 実行したワークフローをクリック
3. ページ下部の **Artifacts** セクションを確認

**期待されるアーティファクト**:

| Artifact名 | サイズ | 内容 |
|-----------|-------|------|
| `docker-scan-results-backend-abc123` | ~50KB | backend Docker scan results (SARIF + JSON) |
| `docker-scan-results-frontend-abc123` | ~40KB | frontend Docker scan results (SARIF + JSON) |
| `wiz-scan-summary-abc123` | ~2KB | Scan summary report |

### 6.2 アーティファクトのダウンロードと確認

```bash
# GitHub CLIでアーティファクトをダウンロード
gh run download --name docker-scan-results-backend-abc123

# SARIF結果の確認
cat docker-backend-results.json | jq '.summary'
```

**期待される出力（JSON）**:
```json
{
  "summary": {
    "total_issues": 15,
    "critical": 3,
    "high": 7,
    "medium": 5,
    "low": 0
  },
  "scan_metadata": {
    "scan_time": "2025-12-03T10:32:15Z",
    "image": "taskflow-backend:abc123",
    "base_image": "node:18-alpine",
    "tags": {
      "component": "backend",
      "branch": "scenario-03-cicd-verification-20251203",
      "commit": "abc123def456"
    }
  }
}
```

---

## ✅ 検証チェックリスト

### GitHub Actions統合

- [ ] **Secretsが正しく設定されている**
  - [ ] WIZ_CLIENT_ID が設定済み
  - [ ] WIZ_CLIENT_SECRET が設定済み
  - [ ] AWS認証情報が設定済み（Phase 2用）

- [ ] **ワークフローが正常にトリガーされる**
  - [ ] push時にワークフローが起動
  - [ ] 3つのジョブすべてが実行される
  - [ ] matrix戦略でbackend/frontendが並列実行される

### Wizスキャン結果

- [ ] **ソースコードスキャンが成功**
  - [ ] バックエンドソースコードがスキャンされる
  - [ ] フロントエンドソースコードがスキャンされる
  - [ ] ポリシー違反が検出される

- [ ] **Dockerイメージスキャンが成功**
  - [ ] backendイメージがビルドされる
  - [ ] frontendイメージがビルドされる
  - [ ] 各イメージがスキャンされる
  - [ ] 脆弱性が検出・レポートされる

### GitHub Security統合

- [ ] **SARIF形式でアップロード成功**
  - [ ] backend SARIF がアップロードされる
  - [ ] frontend SARIF がアップロードされる
  - [ ] GitHub Securityタブでアラート表示される

- [ ] **アラートの詳細が確認できる**
  - [ ] CVE番号が表示される
  - [ ] 影響範囲（ファイル・行番号）が表示される
  - [ ] 修正方法が提示される

### WizCloud連携

- [ ] **Code Scansに結果が表示される**
  - [ ] Source Code scanが記録される
  - [ ] Docker Image scanが記録される
  - [ ] タグ情報が正しく記録される

- [ ] **Code Issuesで詳細確認可能**
  - [ ] 重大度別にフィルタリングできる
  - [ ] ファイルパス・行番号が表示される
  - [ ] 修正推奨事項が表示される

### アーティファクト保存

- [ ] **スキャン結果がアーティファクトとして保存される**
  - [ ] SARIF形式のファイルが保存される
  - [ ] JSON形式のファイルが保存される
  - [ ] scan summaryが保存される

---

## 📸 エビデンス収集

以下のスクリーンショットを取得してエビデンスとして保存します：

### 1. GitHub Actions実行結果（必須）
```
evidence/phase1/S03/
├── 01_github_actions_workflow_list.png
│   └── Actionsタブ、S03ワークフロー実行一覧
├── 02_workflow_run_summary.png
│   └── ワークフロー実行サマリー、3ジョブの成功/失敗状況
└── 03_workflow_job_logs.png
    └── 各ジョブの実行ログ詳細
```

### 2. Docker Scanジョブ詳細（必須）
```
evidence/phase1/S03/
├── 04_docker_backend_scan_log.png
│   └── backendイメージスキャン結果ログ
├── 05_docker_frontend_scan_log.png
│   └── frontendイメージスキャン結果ログ
└── 06_scan_artifacts.png
    └── アーティファクト一覧（SARIF/JSON保存確認）
```

### 3. GitHub Security統合（必須）
```
evidence/phase1/S03/
├── 07_github_security_alerts_list.png
│   └── Securityタブ、Code scanning alerts一覧
├── 08_alert_detail_backend.png
│   └── backendアラート詳細（CVE情報、修正方法）
└── 09_alert_detail_frontend.png
    └── frontendアラート詳細
```

### 4. WizCloud Console（必須）
```
evidence/phase1/S03/
├── 10_wizcloud_code_scans.png
│   └── Code > Scans、taskflow-appスキャン一覧
├── 11_scan_detail_source.png
│   └── Source Codeスキャン詳細
├── 12_scan_detail_docker.png
│   └── Docker Imageスキャン詳細
└── 13_code_issues_list.png
    └── Code > Issues、検出されたIssues一覧
```

---

## 🔧 トラブルシューティング

### ❌ 問題1: ワークフローが実行されない

**症状**:
```
Actionsタブにワークフロー実行が表示されない
```

**原因と対処**:
1. **ブランチ名の確認**:
   ```bash
   # mainまたはdevelopブランチにプッシュしたか確認
   git branch --show-current

   # トリガー対象ブランチにプッシュ
   git checkout main
   git merge scenario-03-cicd-verification-20251203
   git push origin main
   ```

2. **GitHub Actionsが有効か確認**:
   - Settings > Actions > General
   - "Allow all actions and reusable workflows" を選択

3. **ワークフローファイルの構文エラー**:
   ```bash
   # YAMLシンタックスチェック
   yamllint .github/workflows/S03-wiz-full-scan.yml
   ```

### ❌ 問題2: Wiz認証エラー

**症状**:
```
Error: Failed to authenticate to Wiz
Status code: 401 Unauthorized
```

**原因と対処**:
1. **Secretsの確認**:
   ```bash
   # GitHub CLIでSecretsを確認
   gh secret list

   # Secretsが存在しない場合は再設定
   gh secret set WIZ_CLIENT_ID --body "your_client_id"
   gh secret set WIZ_CLIENT_SECRET --body "your_client_secret"
   ```

2. **Wiz Service Accountの有効性確認**:
   - WizCloudコンソール > Settings > Service Accounts
   - Service Accountが有効（Active）であることを確認
   - 必要であれば新しいSecretを再生成

3. **認証情報の形式確認**:
   - Client IDはUUID形式（xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
   - Client Secretは英数字64文字程度

### ❌ 問題3: Dockerイメージビルドエラー

**症状**:
```
Error: Failed to build Docker image
ERROR [internal] load metadata for docker.io/library/node:18-alpine
```

**原因と対処**:
1. **Dockerfileのパス確認**:
   ```yaml
   # ワークフローのmatrixステップを確認
   cd ${{ matrix.component }}  # backend または frontend
   docker build -t taskflow-${{ matrix.component }}:${{ github.sha }} .
   ```

2. **ベースイメージの存在確認**:
   ```bash
   # ローカルでビルドテスト
   cd backend
   docker build -t test-backend .
   ```

3. **Dockerfile構文エラー**:
   ```bash
   # Dockerfileの検証
   docker build --no-cache -t test .
   ```

### ❌ 問題4: SARIF アップロードエラー

**症状**:
```
Error: Code scanning upload failed
The process '/usr/bin/docker' failed with exit code 1
```

**原因と対処**:
1. **permissions設定の確認**:
   ```yaml
   # ワークフローファイルのpermissions確認
   permissions:
     contents: read
     security-events: write  # ← これが必須
     actions: read
   ```

2. **SARIF ファイルの存在確認**:
   ```bash
   # スキャンステップでSARIF出力を確認
   --output docker-${{ matrix.component }}-results.sarif,sarif
   ```

3. **GitHub Advanced Security有効化**:
   - Settings > Security > Code security and analysis
   - "GitHub Advanced Security" を有効化（パブリックリポジトリは無料）

---

## 🎯 次のステップ

✅ **S03完了後の推奨アクション**:

1. **S04: IaCスキャンへ進む**
   - [S04-iac-scanning.md](./S04-iac-scanning.md) を参照
   - Terraformインフラコードのセキュリティスキャン検証

2. **CI/CDパイプラインの改善**
   - ポリシー違反時のビルド失敗動作をカスタマイズ
   - Slackやメール通知の追加
   - 自動修正PRの作成（Wiz Auto-Remediation）

3. **Phase 2への準備**
   - AWS環境のセットアップ（ECS, ECR, RDS）
   - Code-to-Cloudトレーサビリティの検証準備

---

## 📚 参考資料

- [Wiz CLI Documentation](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [GitHub Actions Integration](https://docs.wiz.io/wiz-docs/docs/github-actions-integration)
- [SARIF Format Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)

---

**✅ シナリオ3完了**: GitHub ActionsへのWiz CLI統合と、自動化されたセキュリティスキャンパイプラインの検証が完了しました。
