# シナリオ2: GitHub連携とプルリクエストスキャン

## 📋 目的
GitHub App統合を通じてWiz Codeとリポジトリを連携し、プルリクエスト作成時に自動的にセキュリティスキャンを実行し、レビュープロセスに組み込む能力を検証します。

## 🎯 検証内容
- Wiz Code GitHub Appのインストールと設定
- リポジトリの自動スキャン
- プルリクエストでのセキュリティチェック
- インラインコメントによるフィードバック
- マージブロック機能の検証
- ブランチ保護ルールとの統合

## ⏱️ 所要時間
- 初回セットアップ: **40分**
- 検証実行: **30分**
- 再検証: **20分**

---

## 📚 前提条件

### 必要なツール
- [x] GitHubアカウント（個人または組織）
  - **重要**: リポジトリの管理者権限が必要
- [x] Wizアカウント（検証環境）
- [x] Git CLI（最新版）
- [x] GitHub CLI (`gh` コマンド) - オプションだが推奨

### 前提シナリオ
- [S01: IDE統合とリアルタイムスキャン](./S01-ide-integration.md) が完了していること

### 事前準備
```bash
# 環境変数の確認
echo $WIZ_CLIENT_ID
echo $WIZ_CLIENT_SECRET

# GitHub CLIのインストール確認
gh --version
# gh version 2.40.0 (2024-01-15)

# GitHub CLIでログイン
gh auth login
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

# S02専用ブランチを作成
git checkout -b feature/test-s02-vcs-integration

# ブランチ確認
git branch
# * feature/test-s02-vcs-integration
#   master
```

> **再検証時**: 既存のブランチを削除して新規作成します。詳細は [BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md) を参照。

---

## 🔧 手順1: GitHubリポジトリの準備

### 1.1 検証用ディレクトリの確認

```bash
# S01で作成した検証ファイルを確認
cd ~/WizCodeVerification/verification-samples/s01-ide-integration
ls -la
# Dockerfile
# main.tf
# config.py

# これらのファイルをS02検証でも使用します
```

### 1.2 .gitignoreの作成

```bash
# WizCodeVerificationリポジトリのルートに移動
cd ~/WizCodeVerification

# .gitignoreを作成（まだ存在しない場合）
cat > .gitignore << 'EOF'
# Terraform
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
terraform.tfvars
.terraform.tfstate.lock.info

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Secrets (実際の認証情報は絶対にコミットしない)
.env
.env.local
*.pem
*.key
credentials.json

# Wiz Scan Results
*-scan-results.json
*.sarif
EOF

git add .gitignore
git commit -m "S02: Add comprehensive .gitignore"
```

### 1.3 GitHubにプッシュ

このリポジトリ（WizCodeVerification）が既にGitHubに存在する場合は、そのまま使用します。存在しない場合は以下を実行:

```bash
# GitHub CLIでリポジトリを作成（存在しない場合のみ）
gh repo create WizCodeVerification \
  --public \
  --description "Wiz Code検証プロジェクト - TIS社内検証用" \
  --source=. \
  --remote=origin \
  --push

# または、既存のリポジトリにプッシュ
git remote add origin https://github.com/<your-username>/WizCodeVerification.git
git branch -M master
git push -u origin master

# S02ブランチもプッシュ
git checkout feature/test-s02-vcs-integration
git push -u origin feature/test-s02-vcs-integration
```

---

## 🔧 手順2: Wiz Code GitHub Appのインストール（WizCloudコンソール）

### 2.1 Wiz Integrationsページに移動

1. ブラウザで https://app.wiz.io/ を開く

2. ログイン

3. **左サイドバー** の一番下にある **⚙️ Settings** アイコンをクリック

4. Settings画面が開いたら、左側メニューから **Integrations** を選択
   ```
   Settings
   ├── General
   ├── Users
   ├── Service Accounts
   ├── Integrations  ← ここをクリック
   └── ...
   ```

5. Integrationsページで **Version Control Systems (VCS)** セクションまでスクロール

### 2.2 GitHub統合の開始

1. **GitHub** タイルを見つける
   ```
   Version Control Systems

   ┌─────────────┬─────────────┬─────────────┐
   │   GitHub    │   GitLab    │   Bitbucket │
   │             │             │             │
   │  [Connect]  │  [Connect]  │  [Connect]  │
   └─────────────┴─────────────┴─────────────┘
   ```

2. GitHub タイルの **Connect** ボタンをクリック

3. **GitHub Integration** ダイアログが表示:
   ```
   Connect GitHub Account

   This will install the Wiz Code GitHub App to your account.

   The app will be able to:
   ✓ Read repository contents
   ✓ Scan code for security issues
   ✓ Comment on pull requests
   ✓ Update commit statuses

   [Cancel]  [Install GitHub App]
   ```

4. **Install GitHub App** ボタンをクリック

### 2.3 GitHub認証とアプリインストール

GitHubの新しいタブが開きます。

#### 2.3.1 GitHubにログイン（まだの場合）

1. GitHubのログイン画面が表示される
2. ユーザー名/メールアドレスとパスワードを入力
3. **Sign in** をクリック

#### 2.3.2 インストール先の選択

1. **Install Wiz Code** 画面が表示される:
   ```
   Install Wiz Code

   Choose where to install Wiz Code:

   ○ Only select repositories  ← これを選択
   ○ All repositories

   Select repositories:
   [Search repositories...]

   □ my-first-repo
   ☑ WizCodeVerification  ← これをチェック
   □ other-repo

   [Cancel]  [Install]
   ```

2. **Only select repositories** を選択

3. 検索バーに `WizCodeVerification` と入力

4. **WizCodeVerification** リポジトリにチェックを入れる

5. **Install** ボタンをクリック

#### 2.3.3 権限の確認と承認

1. **Authorize Wiz Code** 画面が表示される:
   ```
   Authorize Wiz Code

   Wiz Code by Wiz, Inc. would like permission to:

   Repository permissions:
   ✓ Read access to code
   ✓ Read access to metadata
   ✓ Write access to checks
   ✓ Write access to pull requests

   [Cancel]  [Authorize wiz-app]
   ```

2. 権限内容を確認

3. **Authorize wiz-app** をクリック

### 2.4 連携成功の確認

1. GitHubからWizポータルに自動的にリダイレクトされる

2. **Integration Successful** ダイアログが表示:
   ```
   ✅ GitHub Integration Successful!

   Connected Repositories:
   - <your-username>/WizCodeVerification

   Next Steps:
   1. Configure scan policies
   2. Enable PR scanning
   3. Set up branch protection

   [Configure Now]  [Done]
   ```

3. **Configure Now** をクリックして設定を続ける

### 2.5 GitHub統合設定の確認

**GitHub Configuration** 画面が表示されます。

```
GitHub Integration Settings

Repository: <your-username>/WizCodeVerification

Scan Settings:
┌─────────────────────────────────────────┬──────────┐
│ Pull Request Scanning                   │ [✓ ON ]  │
├─────────────────────────────────────────┼──────────┤
│ Inline Comments on PR                   │ [✓ ON ]  │
├─────────────────────────────────────────┼──────────┤
│ Block Merge on Critical Findings        │ [✓ ON ]  │← 検証用にONを推奨
├─────────────────────────────────────────┼──────────┤
│ Scan on Push to Main Branch             │ [✓ ON ]  │
├─────────────────────────────────────────┼──────────┤
│ Auto-fix Suggestions                    │ [✓ ON ]  │
└─────────────────────────────────────────┴──────────┘

Notification Settings:
☑ Notify on new findings
☑ Notify on critical vulnerabilities
☑ Weekly summary report

[Save Configuration]
```

すべての設定を確認し、**Save Configuration** をクリック。

---

## 🔧 手順3: スキャンポリシーの確認

### 3.1 Code Policiesページに移動

1. Wizポータルの左サイドバーから **Policies** をクリック

2. **Code Policies** タブを選択

3. 以下のポリシーが **Enabled** になっていることを確認:

   | ポリシー名 | 状態 | 説明 |
   |-----------|------|------|
   | **Default IaC Policy** | ✅ Enabled | Terraform、CloudFormation、K8s設定ミス |
   | **Default Secrets Policy** | ✅ Enabled | ハードコードされた認証情報検出 |
   | **Default Vulnerability Policy** | ✅ Enabled | 依存関係の既知の脆弱性 |
   | **Default Container Image Policy** | ✅ Enabled | Dockerイメージの脆弱性 |

### 3.2 ポリシー詳細の確認

1. **Default Secrets Policy** をクリック

2. **Rules** セクションで以下が有効か確認:
   ```
   Enabled Rules:
   ☑ AWS Access Keys
   ☑ AWS Secret Access Keys
   ☑ GitHub Personal Access Tokens
   ☑ Database Passwords
   ☑ API Keys
   ☑ JWT Secrets
   ☑ Slack Webhooks
   ☑ Private Keys (RSA, SSH)
   ```

3. **Severity Thresholds** を確認:
   ```
   Block Merge on:
   ☑ CRITICAL
   ☑ HIGH
   ☐ MEDIUM  ← 検証用には無効にする（設定によっては有効でも可）
   ☐ LOW
   ```

---

## 🔧 手順4: 初回リポジトリスキャンの実行

### 4.1 手動スキャンのトリガー

1. Wizポータルの左サイドバーから **Code** > **Repositories** を選択

2. **Repositories** 一覧で `WizCodeVerification` を見つける
   - 検索バーに `WizCodeVerification` と入力すると見つけやすい

3. リポジトリ行の右端にある **⋮** (三点リーダー) をクリック

4. ドロップダウンメニューから **Scan Now** を選択

5. **Scan Repository** ダイアログが表示:
   ```
   Scan Repository: WizCodeVerification

   Branch: ○ All branches
           ● Specific branch: [master ▾]

   Scan Type:
   ☑ Secrets
   ☑ IaC misconfigurations
   ☑ Vulnerabilities
   ☑ Container images

   [Cancel]  [Start Scan]
   ```

6. **master** ブランチを選択

7. すべてのScan Typeにチェックが入っていることを確認

8. **Start Scan** をクリック

### 4.2 スキャン進行状況の確認

1. スキャンステータスが表示される:
   ```
   Scanning... ⏳

   Progress: ████████░░░░░░░░░░ 45%

   - Cloning repository...        ✅ Done
   - Analyzing file structure...  ✅ Done
   - Scanning for secrets...      🔄 In progress
   - Scanning IaC files...        ⏸️ Pending
   - Scanning dependencies...     ⏸️ Pending

   Estimated time remaining: 1 minute
   ```

2. スキャン完了まで待つ（通常1-3分）

### 4.3 スキャン結果の確認

スキャン完了後、リポジトリ詳細ページに自動遷移します。

1. **Overview** タブで全体サマリーを確認:
   ```
   📊 Scan Summary

   Last Scan: Just now (master branch)
   Files Scanned: 8
   Total Issues: 32

   ┌──────────┬───────┬──────┬────────┬─────┐
   │ CRITICAL │ HIGH  │ MEDIUM│ LOW   │ INFO│
   ├──────────┼───────┼──────┼────────┼─────┤
   │    12    │   8   │   9  │   3   │  0  │
   └──────────┴───────┴──────┴────────┴─────┘

   Top Issues:
   🔴 Hardcoded AWS credentials (3 occurrences)
   🔴 S3 bucket public access enabled
   🔴 RDS storage encryption disabled
   🟠 Deprecated base image (ubuntu:18.04)
   🟠 Running container as root
   ```

2. **Findings** タブをクリックして詳細を表示

3. ファイルごとの問題をフィルター:

   **verification-samples/s01-ide-integration/Dockerfile:**
   | 重要度 | 問題 | 行番号 |
   |--------|------|--------|
   | 🔴 CRITICAL | Hardcoded AWS Access Key | 10 |
   | 🔴 CRITICAL | Hardcoded AWS Secret Key | 11 |
   | 🟠 HIGH | Deprecated base image | 4 |
   | 🟠 HIGH | Running as root user | 14 |
   | 🟡 MEDIUM | Hardcoded DB password | 9 |

   **verification-samples/s01-ide-integration/main.tf:**
   | 重要度 | 問題 | 行番号 |
   |--------|------|--------|
   | 🔴 CRITICAL | S3 public access enabled | 22-26 |
   | 🔴 CRITICAL | RDS not encrypted | 40 |
   | 🔴 CRITICAL | RDS publicly accessible | 43 |
   | 🔴 CRITICAL | Security group 0.0.0.0/0 | 63 |

   **verification-samples/s01-ide-integration/config.py:**
   | 重要度 | 問題 | 行番号 |
   |--------|------|--------|
   | 🔴 CRITICAL | AWS Access Key | 15 |
   | 🔴 CRITICAL | AWS Secret Key | 16 |
   | 🔴 CRITICAL | GitHub Token | 21 |
   | 🟠 HIGH | Slack Webhook URL | 22 |

---

## 🔧 手順5: プルリクエストスキャンの検証

### 5.1 新しい機能ブランチを作成

```bash
# S02ブランチから新しい機能ブランチを作成
cd ~/WizCodeVerification
git checkout feature/test-s02-vcs-integration

# Kubernetesデプロイメント用のブランチを作成
git checkout -b feature/test-s02-add-k8s-deployment

# S02検証用ディレクトリを作成
mkdir -p verification-samples/s02-vcs-integration
cd verification-samples/s02-vcs-integration
```

### 5.2 問題のあるKubernetesマニフェストを作成

```bash
# k8s-deployment.yamlを作成
cat > k8s-deployment.yaml << 'EOF'
# S02検証用: 意図的にセキュリティ問題を含むKubernetesマニフェスト
# 本番環境では絶対に使用しないでください

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: nginx:1.14.0  # 【脆弱性1】古いバージョン（CVE-2018-16843, CVE-2018-16844含む）
        ports:
        - containerPort: 80
        env:
        # 【脆弱性2】ハードコードされたシークレット
        - name: DB_PASSWORD
          value: "hardcoded-password-123"
        - name: DB_HOST
          value: "prod-db.internal.com"
        - name: DB_USER
          value: "admin"
        # 【脆弱性3】ハードコードされたAPIキー
        - name: API_KEY
          value: "sk-1234567890abcdefghijklmnopqrstuv"
        - name: STRIPE_SECRET_KEY
          value: "sk_live_51234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789AB"
        securityContext:
          # 【脆弱性4】特権コンテナ
          privileged: true
          # 【脆弱性5】rootユーザーで実行
          runAsUser: 0
          allowPrivilegeEscalation: true
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  type: LoadBalancer  # 【設定ミス1】インターネットに公開
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: web-app
  # 【設定ミス2】ソースIP制限なし
  externalTrafficPolicy: Cluster
EOF
```

### 5.3 変更をコミットしてプッシュ

```bash
# Git追加とコミット
git add verification-samples/s02-vcs-integration/k8s-deployment.yaml

git commit -m "S02: Add Kubernetes deployment with intentional security issues

- Old nginx image (1.14.0) with known CVEs
- Hardcoded database credentials (DB_PASSWORD, DB_HOST, DB_USER)
- Hardcoded API keys (API_KEY, STRIPE_SECRET_KEY)
- Privileged container with root user
- LoadBalancer service without source IP restrictions

⚠️  These configurations contain intentional vulnerabilities for S02 verification.
   DO NOT use in production environments."

# GitHubにプッシュ
git push origin feature/test-s02-add-k8s-deployment

# 出力例:
# Enumerating objects: 7, done.
# Counting objects: 100% (7/7), done.
# ...
# To https://github.com/<your-username>/WizCodeVerification.git
#  * [new branch]      feature/test-s02-add-k8s-deployment -> feature/test-s02-add-k8s-deployment
```

### 5.4 プルリクエストを作成

**方法1: GitHub CLIで作成**

```bash
# PRを作成
gh pr create \
  --title "S02: Add Kubernetes deployment configuration" \
  --body "## 概要
Kubernetes環境へのデプロイメント設定を追加しました。

## 変更内容
- nginx webアプリケーションのDeployment設定
- LoadBalancer Serviceの設定

## 検証シナリオ
S02: GitHub連携とプルリクエストスキャンの検証用PRです。

## 関連ドキュメント
- [S02シナリオドキュメント](./docs/phase1-shift-left/S02-vcs-integration.md)" \
  --base feature/test-s02-vcs-integration \
  --head feature/test-s02-add-k8s-deployment

# 出力例:
# Creating pull request for feature/test-s02-add-k8s-deployment into feature/test-s02-vcs-integration in <your-username>/WizCodeVerification
#
# https://github.com/<your-username>/WizCodeVerification/pull/1
```

**方法2: GitHub UIで作成**

1. ブラウザで https://github.com/<your-username>/WizCodeVerification を開く

2. **Compare & pull request** ボタンが表示されるのでクリック
   - またはcode **Pull requests** タブ → **New pull request** をクリック

3. **Base** と **Compare** を設定:
   ```
   base: feature/test-s02-vcs-integration  ← base branch
   compare: feature/test-s02-add-k8s-deployment  ← compare branch
   ```

4. **Title** と **Description** を入力:
   ```
   Title: S02: Add Kubernetes deployment configuration

   Description:
   ## 概要
   Kubernetes環境へのデプロイメント設定を追加しました。

   ## 変更内容
   - nginx webアプリケーションのDeployment設定
   - LoadBalancer Serviceの設定

   ## 検証シナリオ
   S02: GitHub連携とプルリクエストスキャンの検証用PRです。
   ```

5. **Create pull request** をクリック

---

## 🔧 手順6: PRスキャン結果の確認

### 6.1 Wiz Codeチェックの自動実行

PRを作成すると、Wiz Codeが自動的にスキャンを開始します（通常30秒〜1分）。

1. PRページをリロード

2. **Checks** セクションに Wiz Code が追加される:
   ```
   Some checks haven't completed yet

   ⏳ Wiz Code Security Scan — In progress
      Scanning for security issues...

   ✅ Continuous integration / GitHub Actions
   ```

3. スキャン完了後（1-2分）、結果が更新される:
   ```
   All checks have failed

   ❌ Wiz Code Security Scan — Failed
      8 critical issues found
      View details →

   ✅ Continuous integration / GitHub Actions
   ```

### 6.2 チェック詳細レポートの表示

1. **Wiz Code Security Scan** の **Details** リンクをクリック

2. **Wiz Code Findings Report** ページが開く:
   ```
   🔒 Wiz Code Security Scan Results

   Repository: <your-username>/WizCodeVerification
   Branch: feature/test-s02-add-k8s-deployment
   Commit: abc1234

   ┌──────────┬───────┬────────┬─────┐
   │ CRITICAL │ HIGH  │ MEDIUM │ LOW │
   ├──────────┼───────┼────────┼─────┤
   │    8     │   3   │   2    │  0  │
   └──────────┴───────┴────────┴─────┘

   📁 verification-samples/s02-vcs-integration/k8s-deployment.yaml

   🔴 CRITICAL (8 issues):

   Line 19: Hardcoded database password
   ├─ Severity: CRITICAL
   ├─ Rule: Kubernetes Secret in Environment Variable
   ├─ Value: "hardcoded-password-123"
   └─ CWE: CWE-798 (Use of Hard-coded Credentials)

   Line 25: Hardcoded API key detected
   ├─ Severity: CRITICAL
   ├─ Rule: API Key in Environment Variable
   ├─ Pattern: sk-[a-zA-Z0-9]{32}
   └─ CWE: CWE-798

   Line 27: Hardcoded Stripe Secret Key
   ├─ Severity: CRITICAL
   ├─ Rule: Payment Provider Secret
   ├─ Value: sk_live_51...
   └─ CWE: CWE-798

   Line 18: Using vulnerable nginx image
   ├─ Severity: CRITICAL
   ├─ CVE: CVE-2018-16843, CVE-2018-16844, CVE-2018-16845
   ├─ CVSS Score: 9.8 (Critical)
   └─ Recommendation: Update to nginx:1.25 or later

   Line 30: Container running in privileged mode
   ├─ Severity: CRITICAL
   ├─ Rule: Privileged Container
   ├─ Impact: Full host access, escape container
   └─ CWE: CWE-250 (Execution with Unnecessary Privileges)

   Line 32: Container running as root (UID 0)
   ├─ Severity: CRITICAL
   ├─ Rule: Root User in Container
   └─ CWE: CWE-250

   Line 33: Privilege escalation allowed
   ├─ Severity: CRITICAL
   ├─ Rule: Allow Privilege Escalation
   └─ Recommendation: Set to false

   Line 48: Service exposed as LoadBalancer
   ├─ Severity: CRITICAL
   ├─ Rule: Internet-facing Service
   └─ Recommendation: Use ClusterIP or add source IP restrictions

   🟠 HIGH (3 issues):

   Line 21: Database host in environment variable
   Line 23: Database user in environment variable
   Line 52: No source IP restrictions on LoadBalancer

   📊 Summary:
   - Total Issues: 13
   - Files with Issues: 1
   - Remediations Available: 5
   ```

### 6.3 インラインコメントの確認

1. PRページに戻る

2. **Files changed** タブをクリック

3. `k8s-deployment.yaml` ファイルが表示される

4. 問題のある行に **Wiz Codeのコメント** が追加されている:

**Line 19（DB_PASSWORD）のコメント例:**
```
🤖 wiz-code bot commented

🔴 Hardcoded database password detected

Severity: CRITICAL
Rule: Kubernetes Secret in Environment Variable

Description:
The database password is hardcoded in the environment variable.
This is a critical security risk as the password is stored in
plain text in the repository and Kubernetes manifests.

Impact:
- Password exposed in version control history
- Anyone with repository access can see the password
- Deployed pods store the password in plain text

Recommendation:
Use Kubernetes Secrets to store sensitive data:

```yaml
# Create a Secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  db-password: <base64-encoded-password>

# Reference in Deployment
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: db-password
```

External secret management alternatives:
- AWS Secrets Manager + External Secrets Operator
- HashiCorp Vault + Vault Agent Injector
- Azure Key Vault + CSI Driver

References:
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)

[View in Wiz Console] [Suppress False Positive]
```

**Line 18（nginx:1.14.0）のコメント例:**
```
🤖 wiz-code bot commented

🔴 Vulnerable container image detected

Severity: CRITICAL
CVEs: CVE-2018-16843, CVE-2018-16844, CVE-2018-16845
CVSS Score: 9.8 (Critical)

Description:
The nginx:1.14.0 image contains multiple critical vulnerabilities.

Known Vulnerabilities:
- CVE-2018-16843: Excessive CPU consumption (DoS)
- CVE-2018-16844: Excessive memory consumption (DoS)
- CVE-2018-16845: 1-byte memory overwrite (RCE potential)

Recommendation:
Update to a patched version:

```yaml
# Recommended (latest stable)
image: nginx:1.25

# Or specific patched version
image: nginx:1.25.3-alpine
```

[View in Wiz Console] [See All CVEs]
```

5. **すべてのコメント**（8件のCRITICAL）が表示されることを確認

---

## 🔧 手順7: 問題の修正とPRの更新

### 7.1 Kubernetesマニフェストを修正

```bash
# ローカルに戻る
cd ~/WizCodeVerification/verification-samples/s02-vcs-integration

# k8s-deployment.yamlを修正
cat > k8s-deployment.yaml << 'EOF'
# S02検証用: セキュリティ問題を修正したKubernetesマニフェスト

apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: default
type: Opaque
data:
  # 実際の環境では、シークレット値は外部ツールで管理すべき
  # ここではデモのためにbase64エンコードした値を使用
  # 実際にはAWS Secrets Manager、Vault等を使用すること
  db-password: aGFyZGNvZGVkLXBhc3N3b3JkLTEyMw==  # hardcoded-password-123
  api-key: c2stMTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1ub3BxcnN0dXY=  # sk-1234567890abcdefghijklmnopqrstuv
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
  labels:
    app: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      serviceAccountName: web-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: web-app
        image: nginx:1.25.3-alpine  # ✅ 修正: 最新の安定版に更新
        ports:
        - containerPort: 80
          protocol: TCP
        env:
        # ✅ 修正: Kubernetes Secretsから読み取る
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db-password
        - name: DB_HOST
          value: "prod-db.internal.com"
        - name: DB_USER
          value: "app-user"  # ✅ 修正: adminではなく専用ユーザー
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: api-key
        securityContext:
          # ✅ 修正: セキュリティ設定を強化
          privileged: false
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
          requests:
            memory: "128Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: default
spec:
  type: ClusterIP  # ✅ 修正: 内部アクセスのみに変更
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
    name: http
  selector:
    app: web-app
  sessionAffinity: ClientIP
---
# ✅ 追加: Ingressで外部アクセスを制御
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    # IP制限（必要に応じて）
    # nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: web-app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app-service
            port:
              number: 80
EOF
```

### 7.2 修正をコミットしてプッシュ

```bash
# Git追加とコミット
git add verification-samples/s02-vcs-integration/k8s-deployment.yaml

git commit -m "Fix security issues in Kubernetes deployment

Fixes:
- ✅ Update nginx image to 1.25.3-alpine (resolve CVEs)
- ✅ Use Kubernetes Secrets for sensitive data
- ✅ Disable privileged mode
- ✅ Run as non-root user (UID 1000)
- ✅ Disable privilege escalation
- ✅ Enable read-only root filesystem
- ✅ Drop all capabilities
- ✅ Change Service from LoadBalancer to ClusterIP
- ✅ Add Ingress for controlled external access
- ✅ Add resource requests and limits
- ✅ Add liveness and readiness probes

All Wiz Code critical findings have been resolved."

# GitHubにプッシュ
git push origin feature/test-s02-add-k8s-deployment
```

### 7.3 再スキャン結果の確認

1. GitHubのPRページに戻る

2. Wiz Codeが自動的に再スキャンを開始

3. **Checks** セクションが更新される:
   ```
   ⏳ Wiz Code Security Scan — In progress
      Re-scanning after new commit...
   ```

4. スキャン完了後（30秒〜1分）:
   ```
   All checks have passed

   ✅ Wiz Code Security Scan — Passed
      All critical issues resolved
      2 low severity issues remain (merge allowed)

   ✅ Continuous integration / GitHub Actions
   ```

5. **Details** をクリックして詳細を確認:
   ```
   🎉 Wiz Code Security Scan Results

   Status: ✅ PASSED

   ┌──────────┬───────┬────────┬─────┐
   │ CRITICAL │ HIGH  │ MEDIUM │ LOW │
   ├──────────┼───────┼────────┼─────┤
   │    0     │   0   │   0    │  2  │
   └──────────┴───────┴────────┴─────┘

   🟢 LOW (2 issues):

   Line 8: Secret stored in Git repository
   ├─ Note: これはデモ用です。本番環境では外部シークレット管理を使用

   Line 95: Ingress without rate limiting
   ├─ Recommendation: Add rate limiting annotations

   ✅ All critical and high severity issues have been resolved!

   Changes made:
   - Updated nginx image from 1.14.0 to 1.25.3-alpine
   - Moved secrets from environment variables to Kubernetes Secrets
   - Disabled privileged mode
   - Configured non-root user
   - Changed Service from LoadBalancer to ClusterIP
   - Added Ingress for controlled access

   This PR is safe to merge. 🎉
   ```

---

## 🔧 手順8: ブランチ保護ルールの設定

### 8.1 GitHub Branch Protection Rulesの設定

1. GitHubリポジトリページで **Settings** タブをクリック

2. 左サイドバーから **Branches** を選択

3. **Branch protection rules** セクションで **Add rule** をクリック

4. **Branch name pattern** に `master` と入力

5. 以下の設定をチェック:

   ```
   Protect matching branches

   ☑ Require a pull request before merging
      ☑ Require approvals: [1 ▾]
      ☑ Dismiss stale pull request approvals when new commits are pushed

   ☑ Require status checks to pass before merging
      ☑ Require branches to be up to date before merging

      Status checks that are required:
      Search for status checks...
      ☑ Wiz Code Security Scan  ← ここをチェック
      ☑ Continuous integration (optional)

   ☑ Require conversation resolution before merging

   ☐ Require signed commits
   ☐ Require linear history

   ☑ Include administrators (検証用には無効でも可)

   ☐ Allow force pushes
   ☐ Allow deletions
   ```

6. **Create** ボタンをクリック

7. 設定が保存されたことを確認

### 8.2 マージブロック機能の検証

新しい問題のあるコードでマージがブロックされることを確認します。

```bash
# 新しいテストブランチを作成
cd ~/WizCodeVerification
git checkout feature/test-s02-vcs-integration
git checkout -b feature/test-s02-merge-block

# 問題のあるファイルを作成
mkdir -p verification-samples/s02-merge-block-test
cat > verification-samples/s02-merge-block-test/secrets.env << 'EOF'
# S02 Merge Block Test: ハードコードされたシークレット

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
DATABASE_URL=postgresql://admin:SuperSecret123@prod-db.example.com:5432/production
STRIPE_SECRET_KEY=sk_live_51234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789AB
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
SLACK_WEBHOOK=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
JWT_SECRET=my-super-secret-jwt-key-that-should-never-be-committed
API_KEY=sk-proj-1234567890abcdefghijklmnopqrstuvwxyz
EOF

# コミットとプッシュ
git add verification-samples/s02-merge-block-test/
git commit -m "Test merge block with hardcoded secrets"
git push origin feature/test-s02-merge-block

# PRを作成
gh pr create \
  --title "Test: Merge block with hardcoded secrets" \
  --body "**⚠️  This PR intentionally contains hardcoded secrets to test Wiz Code merge blocking.**

This PR should be **blocked from merging** by Wiz Code Security Scan due to critical findings.

Expected behavior:
- ❌ Wiz Code Security Scan should fail
- ❌ Merge button should be disabled
- ❌ Message: \"Merging is blocked\" should appear" \
  --base feature/test-s02-vcs-integration \
  --head feature/test-s02-merge-block
```

**期待される動作:**

1. Wiz Codeスキャンが実行される

2. **Checks** セクションが失敗:
   ```
   Some checks were not successful

   ❌ Wiz Code Security Scan — Failed
      7 critical issues found
      View details →
   ```

3. **Merge pull request** ボタンが無効化される:
   ```
   ⛔ Merging is blocked

   Required status check "Wiz Code Security Scan" has not passed.

   This pull request cannot be merged due to failing checks.
   All required status checks must pass before merging is allowed.

   [View failing checks]
   ```

4. ブランチ保護ルールが機能していることを確認

---

## 📊 検証チェックリスト

以下のすべてにチェックが入れば、S02検証は成功です。

### GitHub App統合
- [ ] Wiz Code GitHub Appがインストールされた（手順2）
- [ ] WizポータルでGitHub連携が表示される（手順2.4）
- [ ] リポジトリが正しく連携されている（手順2.5）

### スキャン設定
- [ ] PR Scanning が有効になっている（手順2.5）
- [ ] Inline Comments が有効になっている（手順2.5）
- [ ] Block Merge on Critical が有効になっている（手順2.5）

### 初回スキャン
- [ ] 手動スキャンが実行できた（手順4.1）
- [ ] スキャン結果が表示された（手順4.3）
- [ ] ファイルごとの問題が確認できた（手順4.3）

### PRスキャン
- [ ] PR作成時に自動スキャンが実行された（手順6.1）
- [ ] Checksセクションに結果が表示された（手順6.1）
- [ ] 詳細レポートが確認できた（手順6.2）
- [ ] インラインコメントが表示された（手順6.3）

### 問題修正
- [ ] 修正後の再スキャンが自動実行された（手順7.3）
- [ ] Check statusがPassedに変わった（手順7.3）
- [ ] 残りの問題がLOW以下になった（手順7.3）

### ブランチ保護
- [ ] Branch protection rulesが設定できた（手順8.1）
- [ ] Wiz Code Scanがrequired checksに追加された（手順8.1）
- [ ] 問題のあるPRがマージブロックされた（手順8.2）

---

## 📸 エビデンス収集

### スクリーンショット取得

以下の画面をスクリーンショットとして保存してください。

#### 1. GitHub App インストール画面
**撮影画面**: GitHubの「Install Wiz Code」ページ
**内容**: リポジトリ選択画面
**ファイル名**: `s02_01_github_app_install.png`

#### 2. GitHub App 権限承認画面
**撮影画面**: GitHubの「Authorize Wiz Code」ページ
**内容**: 権限一覧と承認ボタン
**ファイル名**: `s02_02_github_app_authorize.png`

#### 3. Wiz Integration成功画面
**撮影画面**: Wizポータルの「Integration Successful」ダイアログ
**内容**: 連携成功メッセージとリポジトリ名
**ファイル名**: `s02_03_wiz_integration_success.png`

#### 4. Wiz GitHub設定画面
**撮影画面**: Wizポータルの「GitHub Configuration」
**内容**: PR Scanning, Inline Comments, Block Mergeの設定
**ファイル名**: `s02_04_wiz_github_config.png`

#### 5. 初回スキャン結果
**撮影画面**: Wizポータルのリポジトリ詳細
**内容**: Scan Summaryと検出結果
**ファイル名**: `s02_05_initial_scan_results.png`

#### 6. PRページ - Checksセクション（失敗）
**撮影画面**: GitHubのPRページ
**内容**: ❌ Wiz Code Security Scan — Failed
**ファイル名**: `s02_06_pr_checks_failed.png`

#### 7. Wiz Code 詳細レポート
**撮影画面**: Wiz Code Findings Reportページ
**内容**: Critical/High/Medium/Low問題の一覧
**ファイル名**: `s02_07_wiz_findings_report.png`

#### 8. インラインコメント（DB_PASSWORD）
**撮影画面**: GitHub Files changedタブ
**内容**: Line 19のWiz Codeコメント
**ファイル名**: `s02_08_inline_comment_db_password.png`

#### 9. インラインコメント（nginx image）
**撮影画面**: GitHub Files changedタブ
**内容**: Line 18のWiz Codeコメント（CVE情報含む）
**ファイル名**: `s02_09_inline_comment_nginx_cve.png`

#### 10. PRページ - Checksセクション（成功）
**撮影画面**: GitHubのPRページ（修正後）
**内容**: ✅ Wiz Code Security Scan — Passed
**ファイル名**: `s02_10_pr_checks_passed.png`

#### 11. Branch Protection Rules設定画面
**撮影画面**: GitHub Settings > Branches
**内容**: Wiz Code ScanがRequired checksに設定されている
**ファイル名**: `s02_11_branch_protection_rules.png`

#### 12. Merge Block画面
**撮影画面**: GitHubのPRページ（マージブロックテスト）
**内容**: ⛔ Merging is blocked メッセージ
**ファイル名**: `s02_12_merge_blocked.png`

### スクリーンショット保存先

```bash
# エビデンスディレクトリを作成
mkdir -p ~/WizCodeVerification/evidence/phase1/s02-vcs-integration/screenshots

# スクリーンショットを保存
# Windows: Win+Shift+S
# macOS: Cmd+Shift+4
# Linux: Ctrl+Shift+PrtScn
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

# 2. 既存のS02ブランチを削除
git branch -D feature/test-s02-vcs-integration
git branch -D feature/test-s02-add-k8s-deployment
git branch -D feature/test-s02-merge-block

# 3. GitHubのPRをクローズ（必要に応じて）
gh pr close <PR番号> --delete-branch

# 4. 新しくS02ブランチを作成
git checkout -b feature/test-s02-vcs-integration

# 5. 再検証開始
# 手順5から再実行
```

詳細は [BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md) を参照。

---

## ❓ トラブルシューティング

### 問題1: GitHub Appのインストールに失敗する

**症状**: `Installation failed` エラーが表示される

**原因と解決策**:

```bash
# 原因1: リポジトリの管理者権限がない
# → GitHubリポジトリのSettings > Manage access で権限を確認
# → 組織リポジトリの場合は、組織管理者に連絡

# 原因2: ブラウザのポップアップブロック
# → ブラウザ設定でapp.wiz.ioとgithub.comのポップアップを許可

# 原因3: GitHub Appsが組織で無効化されている
# → 組織Settings > GitHub Apps > Policy で "Allow all apps" を確認

# 原因4: ネットワーク/ファイアウォール問題
# → プロキシ設定を確認
# → VPN経由の場合は、一時的に無効化してテスト
```

### 問題2: スキャンが実行されない

**症状**: PRを作成してもWiz Codeのチェックが表示されない

**原因と解決策**:

```bash
# 原因1: PR Scanningが無効
# → Wizポータルで確認:
#   Settings > Integrations > GitHub > Configuration
#   Pull Request Scanning: Enabled

# 原因2: リポジトリがWiz Appに連携されていない
# → GitHub Settings > Integrations > GitHub Apps > Wiz Code
#   Repository access: Only select repositories に WizCodeVerification が含まれているか確認

# 原因3: Webhookが設定されていない
# → GitHub Settings > Webhooks
#   https://app.wiz.io/webhooks/github が登録されているか確認

# 原因4: Wiz Appの権限不足
# → GitHub Settings > Integrations > GitHub Apps > Wiz Code > Permissions
#   "Checks: Read & write" が許可されているか確認

# 手動でWebhookをトリガー（テスト用）
gh pr ready <PR番号>  # Draftを解除してスキャンを再トリガー
```

### 問題3: インラインコメントが表示されない

**症状**: Findingsは検出されるが、PRにコメントが表示されない

**原因と解決策**:

```bash
# 原因1: Inline Commentsが無効
# → Wizポータルで確認:
#   Settings > Integrations > GitHub > Configuration
#   Inline Comments on PR: Enabled

# 原因2: Pull Requests権限がない
# → GitHub Settings > Integrations > GitHub Apps > Wiz Code > Permissions
#   "Pull requests: Read & write" が許可されているか確認

# 原因3: PRの変更ファイルが多すぎる（GitHub API制限）
# → 1つのPRで変更するファイル数を減らす（推奨: 10ファイル以下）

# 原因4: 既存のコメントと重複
# → Wiz Codeは同じ行に複数のコメントを投稿しません
# → Resolve conversationしてから再スキャン
```

### 問題4: ブランチ保護ルールが動作しない

**症状**: Critical issuesがあるのにマージできてしまう

**原因と解決策**:

```bash
# 原因1: Status checksが正しく設定されていない
# → GitHub Settings > Branches > Branch protection rules > [master]
#   "Require status checks to pass before merging" がチェックされているか
#   "Wiz Code Security Scan" が Required checks に追加されているか

# 原因2: Administratorsが除外されている
# → Branch protection rulesで "Include administrators" がチェックされているか確認
# → 検証用にはチェックを入れることを推奨

# 原因3: Block Mergeが無効
# → Wizポータルで確認:
#   Settings > Integrations > GitHub > Configuration
#   Block Merge on Critical Findings: Enabled

# 原因4: Status checkの名前が一致していない
# → GitHub PR Checks で表示される名前と Branch protection の Required checks の名前が完全一致しているか確認
#   正しい名前: "Wiz Code Security Scan"（大文字小文字、スペース含めて完全一致）
```

### 問題5: Wiz Code Checkが常に"Pending"のまま

**症状**: スキャンが開始されず、ずっと待機状態

**原因と解決策**:

```bash
# 原因1: Wizサービスの一時的な問題
# → Wiz Status Page を確認: https://status.wiz.io/
# → 5分待ってから再試行

# 原因2: スキャンキューが混雑
# → Wizポータルで Scan Queue を確認
# → 待機するか、手動スキャンをキャンセル

# 原因3: ファイルサイズが大きすぎる
# → 1ファイルが10MB以上の場合はスキップされる
# → .wizignore ファイルで大きなファイルを除外

# 原因4: Webhookエラー
# → GitHub Settings > Webhooks > Recent Deliveries
# → エラーメッセージを確認し、Wiz Supportに報告

# 強制再実行
gh pr close <PR番号>
gh pr reopen <PR番号>
```

---

## 🎓 学んだこと

### S02検証で確認できたWiz Code機能

#### 1. GitHub App統合の利点
- **設定不要**: パイプライン変更なしでスキャン自動化
- **シームレス**: 既存のワークフローに自然に統合
- **リアルタイム**: PR作成直後に自動スキャン開始

#### 2. プルリクエストレビューの強化
- **自動チェック**: レビュアーがセキュリティを手動確認する必要がない
- **インラインフィードバック**: 問題の場所と修正方法が明確
- **学習効果**: 開発者がセキュアコーディングを学べる

#### 3. マージブロック機能
- **品質ゲート**: 脆弱なコードの本番混入を防止
- **ポリシー適用**: 組織のセキュリティ基準を自動適用
- **例外管理**: False Positive は Suppress 機能で対応

#### 4. S01（IDE統合）との連携
- **多層防御**: IDE → PR → CI/CD の3段階チェック
- **一貫性**: 同じポリシーが全フェーズで適用
- **トレーサビリティ**: 検出から修正までの履歴が記録

---

## 🔄 次のステップ

S02検証が完了したら、次のシナリオに進みます:

### Phase 1: シフトレフト（続き）

- **[S03: CI/CDパイプラインでのWiz CLI統合](./S03-cicd-integration.md)**
  - GitHub Actionsワークフロー作成
  - Wiz CLIを使用したビルド時スキャン
  - SARIFレポート生成とGitHub Code Scanningとの統合

- **[S04: IaC（Infrastructure as Code）スキャン](./S04-iac-scanning.md)**
  - Terraformプラン時のスキャン
  - CloudFormationテンプレートのスキャン

### その他のガイド

- **[BRANCH_MANAGEMENT_GUIDE.md](../guides/BRANCH_MANAGEMENT_GUIDE.md)**: 再検証用ブランチ戦略
- **[EVIDENCE_COLLECTION_GUIDE.md](../guides/EVIDENCE_COLLECTION_GUIDE.md)**: エビデンス収集方法
- **[ENVIRONMENT_VARIABLES_GUIDE.md](../guides/ENVIRONMENT_VARIABLES_GUIDE.md)**: 環境変数管理

---

## 📚 参考資料

### Wiz公式ドキュメント
- [Wiz Code GitHub Integration](https://docs.wiz.io/wiz-docs/docs/github-app-integration)
- [Pull Request Scanning](https://docs.wiz.io/wiz-docs/docs/pr-scanning)
- [Inline Comments Configuration](https://docs.wiz.io/wiz-docs/docs/inline-comments)
- [Branch Protection Integration](https://docs.wiz.io/wiz-docs/docs/branch-protection)

### GitHub公式ドキュメント
- [GitHub Apps Permissions](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/setting-permissions-for-github-apps)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [GitHub CLI (gh)](https://cli.github.com/manual/)

### セキュリティベストプラクティス
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/security-best-practices/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)

---

## 📝 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|---------|
| 2025-01-XX | 2.0 | WizCloudコンソール操作、GitHub UI詳細、再検証手順を追加 |
| 2024-XX-XX | 1.0 | 初版作成 |

---

**⚠️  重要な注意事項**

このシナリオで作成されるファイルには、**意図的なセキュリティ脆弱性**が含まれています。
- これらのファイルは検証目的のみに使用してください
- 本番環境では絶対に使用しないでください
- 実際の認証情報は絶対にコミットしないでください
- Kubernetes Secretsもデモ用です。本番では AWS Secrets Manager、HashiCorp Vault等を使用してください
- 検証完了後は、PRをマージせずにクローズし、ブランチを削除してください

---

**🎉 S02検証完了おめでとうございます！**

次のシナリオ [S03: CI/CDパイプラインでのWiz CLI統合](./S03-cicd-integration.md) に進んでください。
