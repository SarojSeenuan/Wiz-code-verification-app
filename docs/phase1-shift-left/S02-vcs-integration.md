# シナリオ2: GitHub連携とプルリクエストスキャン

## 📋 目的
GitHub App統合を通じてWiz Codeとリポジトリを連携し、プルリクエスト作成時に自動的にセキュリティスキャンを実行し、レビュープロセスに組み込む能力を検証します。

## 🎯 検証内容
- Wiz Code GitHub App の設定
- リポジトリの自動スキャン
- プルリクエストでのセキュリティチェック
- インライン コメントによるフィードバック
- マージブロック機能の検証

---

## 📚 前提条件

### 必要なツール
- GitHubアカウント（個人または組織）
- Wizアカウント（検証環境）
- Git CLI

### 前提シナリオ
- シナリオ1が完了していること（検証用ファイルが用意されている）

---

## 🔧 手順1: GitHubリポジトリの作成

### 1.1 ローカルリポジトリの初期化
```bash
# シナリオ1で作成したディレクトリに移動
cd ~/wiz-code-verification/scenario-01

# Gitリポジトリを初期化
git init

# .gitignoreを作成
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
.venv

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Secrets (for verification only)
.env
*.pem
*.key
EOF
```

### 1.2 GitHubにリポジトリを作成
```bash
# GitHub CLIを使用する場合
gh repo create wiz-code-verification-repo --public --description "Wiz Code検証用リポジトリ"

# または、GitHubウェブUIから作成:
# 1. https://github.com/new にアクセス
# 2. Repository name: wiz-code-verification-repo
# 3. Description: Wiz Code検証用リポジトリ
# 4. Public を選択
# 5. Create repository をクリック
```

### 1.3 ローカルリポジトリをGitHubにプッシュ
```bash
# READMEを作成
cat > README.md << 'EOF'
# Wiz Code 検証用リポジトリ

このリポジトリは、Wiz Codeの機能を検証するためのテスト用プロジェクトです。

## 含まれるファイル
- `Dockerfile`: 脆弱性とシークレットを含むDockerfile
- `main.tf`: 設定ミスを含むTerraformファイル
- `config.py`: ハードコードされたシークレットを含むPythonファイル

## 注意
このリポジトリには意図的にセキュリティ問題が含まれています。
本番環境では使用しないでください。
EOF

# ファイルをステージング
git add .
git commit -m "Initial commit: Add verification files with security issues"

# GitHubリポジトリに接続（URLは実際のものに置き換えてください）
git remote add origin https://github.com/<your-username>/wiz-code-verification-repo.git
git branch -M main
git push -u origin main
```

---

## 🔧 手順2: Wiz Code GitHub Appの設定

### 2.1 Wizポータルでの設定
1. Wizポータルにログイン: https://app.wiz.io/
2. 左サイドバーから **Settings** > **Integrations** を選択
3. **Version Control Systems (VCS)** セクションを見つける
4. **GitHub** タイルをクリック
5. **Connect GitHub** をクリック

### 2.2 GitHub App のインストール
1. GitHubの認証画面が表示される
2. GitHubアカウントでログイン
3. インストール先を選択:
   - **Only select repositories** を選択
   - `wiz-code-verification-repo` を選択
   - または **All repositories** を選択（組織全体の場合）
4. **Install & Authorize** をクリック

### 2.3 連携の確認
```bash
# Wizポータルに戻り、以下が表示されることを確認:
# ✅ GitHub App installed successfully
# ✅ Repository: <your-username>/wiz-code-verification-repo が表示される
```

---

## 🔧 手順3: スキャン設定とポリシーの確認

### 3.1 デフォルトポリシーの確認
1. Wizポータルで **Policies** > **Code Policies** を選択
2. 以下のポリシーが有効になっていることを確認:
   ```
   ✅ Default IaC Policy
   ✅ Default Secrets Policy
   ✅ Default Vulnerability Policy
   ✅ Default Container Image Policy
   ```

### 3.2 GitHub統合の設定確認
1. **Settings** > **Integrations** > **GitHub** を選択
2. **Configuration** タブで以下を確認:
   ```
   Scan Settings:
   - Pull Request Scanning: Enabled
   - Inline Comments: Enabled
   - Block Merge on Failure: Optional (検証用にはEnableを推奨)
   - Scan on Push: Enabled
   ```

---

## 🔧 手順4: 初回リポジトリスキャンの実行

### 4.1 手動スキャンのトリガー
```bash
# Wizポータルで:
# 1. Code > Repositories に移動
# 2. wiz-code-verification-repo を見つける
# 3. "..." メニューから "Scan Now" を選択
```

### 4.2 スキャン結果の確認
1. スキャンが完了するまで待つ（通常 1-2 分）
2. リポジトリをクリックして詳細を表示
3. **Findings** タブで検出結果を確認

**期待される検出結果:**
```
📊 Scan Summary:
- Total Files Scanned: 3
- Critical Issues: 8
- High Issues: 5
- Medium Issues: 4
- Low Issues: 2

🔴 Critical Issues:
- Hardcoded AWS credentials (config.py, Dockerfile)
- S3 bucket with public access (main.tf)
- RDS instance not encrypted (main.tf)
- Publicly accessible RDS (main.tf)
- Security group open to 0.0.0.0/0 (main.tf)

🟡 High Issues:
- Using EOL Ubuntu version (Dockerfile)
- Running container as root (Dockerfile)
- Hardcoded database passwords (config.py, main.tf)
```

---

## 🔧 手順5: プルリクエストスキャンの検証

### 5.1 新しいブランチを作成
```bash
# 新しいブランチを作成
git checkout -b feature/add-kubernetes-deployment

# Kubernetesマニフェストファイルを追加（さらに問題のあるファイル）
cat > k8s-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
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
        image: nginx:1.14  # 古いバージョン（脆弱性あり）
        ports:
        - containerPort: 80
        env:
        - name: DB_PASSWORD
          value: "hardcoded-password-123"  # ハードコードされたパスワード
        - name: API_KEY
          value: "sk-1234567890abcdefghijklmnopqrstuv"  # ハードコードされたAPIキー
        securityContext:
          privileged: true  # 特権コンテナ（危険）
          runAsUser: 0      # rootユーザーで実行（危険）
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
  type: LoadBalancer  # インターネットに公開
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: web-app
EOF
```

### 5.2 変更をコミットしてプッシュ
```bash
# ファイルをコミット
git add k8s-deployment.yaml
git commit -m "Add Kubernetes deployment with intentional security issues"

# GitHubにプッシュ
git push origin feature/add-kubernetes-deployment
```

### 5.3 プルリクエストを作成
```bash
# GitHub CLIを使用する場合
gh pr create \
  --title "Add Kubernetes deployment" \
  --body "Kubernetesデプロイメント設定を追加しました。" \
  --base main \
  --head feature/add-kubernetes-deployment

# または、GitHubウェブUIから:
# 1. https://github.com/<your-username>/wiz-code-verification-repo/pulls にアクセス
# 2. "New pull request" をクリック
# 3. base: main, compare: feature/add-kubernetes-deployment を選択
# 4. "Create pull request" をクリック
```

---

## 🔧 手順6: PRスキャン結果の確認

### 6.1 Wiz Codeチェックの確認
プルリクエストのページで、以下が表示されることを確認:

```
✅ Checks
  ❌ Wiz Code Security Scan - Failed
     8 critical issues found
     View details →
```

### 6.2 インラインコメントの確認
1. プルリクエストの **Files changed** タブを選択
2. `k8s-deployment.yaml` ファイルを表示
3. 問題のある行にWiz Codeのコメントが追加されていることを確認

**期待されるコメント例:**
```
🤖 Wiz Code Security Alert
Line 17: Hardcoded sensitive value detected
Severity: CRITICAL
Rule: Hardcoded Secret in Kubernetes Manifest

💡 Recommendation:
Use Kubernetes Secrets or external secret management instead:
```yaml
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: db-password
```

Learn more: [Wiz Docs - Kubernetes Secrets](https://docs.wiz.io/...)
```

### 6.3 すべての検出結果を確認
Wiz Codeのチェック詳細リンクをクリックして、完全なレポートを表示:

**期待される検出結果:**
```
🔴 Critical Issues (5):
1. Hardcoded DB password in environment variable (line 17)
2. Hardcoded API key in environment variable (line 19)
3. Container running with privileged mode (line 20)
4. Container running as root user (line 21)
5. Using outdated nginx image with known CVEs (line 14)

🟡 High Issues (2):
1. Service exposed as LoadBalancer to internet (line 35)
2. No resource limits defined for CPU

🟢 Recommendations:
- Update nginx image to latest version (nginx:1.25 or later)
- Use Kubernetes Secrets for sensitive data
- Remove privileged mode
- Run as non-root user
- Consider using ClusterIP instead of LoadBalancer
```

---

## 🔧 手順7: 問題の修正とPRの更新

### 7.1 問題を修正
```bash
# k8s-deployment.yamlを修正
cat > k8s-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
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
        image: nginx:1.25  # 最新の安定版に更新
        ports:
        - containerPort: 80
        env:
        # Kubernetes Secretsを使用するように修正
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db-password
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: api-key
        securityContext:
          privileged: false  # 特権モードを無効化
          runAsUser: 1000    # 非rootユーザーで実行
          runAsNonRoot: true
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
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  type: ClusterIP  # 内部アクセスのみに変更
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: web-app
EOF
```

### 7.2 修正をプッシュ
```bash
# 修正をコミット
git add k8s-deployment.yaml
git commit -m "Fix security issues in Kubernetes deployment"

# GitHubにプッシュ
git push origin feature/add-kubernetes-deployment
```

### 7.3 再スキャン結果の確認
1. GitHubのPRページに戻る
2. Wiz Codeが自動的に再スキャンを実行
3. チェック結果が更新される

**期待される結果:**
```
✅ Checks
  ✅ Wiz Code Security Scan - Passed
     All critical issues resolved
     2 low severity issues remain (can be merged)
```

---

## 🔧 手順8: ブランチ保護ルールの設定（オプション）

### 8.1 GitHubでのブランチ保護設定
```bash
# GitHubリポジトリページで:
# 1. Settings > Branches に移動
# 2. "Add rule" をクリック
# 3. 以下を設定:
#    - Branch name pattern: main
#    - ✅ Require status checks to pass before merging
#    - ✅ Require branches to be up to date before merging
#    - Status checks required:
#         ✅ Wiz Code Security Scan
# 4. "Create" をクリック
```

### 8.2 マージブロック機能の検証
```bash
# 新しいブランチを作成（問題のあるコードを含む）
git checkout -b feature/test-merge-block

# 問題のあるファイルを作成
echo "AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE" > secrets.txt

# コミットとプッシュ
git add secrets.txt
git commit -m "Add file with hardcoded secret"
git push origin feature/test-merge-block

# PRを作成
gh pr create --title "Test merge block" --body "Testing Wiz Code blocking" --base main --head feature/test-merge-block
```

**期待される動作:**
- Wiz Codeがハードコードされたシークレットを検出
- PRのマージボタンが無効化される
- 「Wiz Code Security Scan must pass before merging」というメッセージが表示される

---

## 🔧 手順9: Wiz Security Graphでの確認

### 9.1 Wizポータルでリポジトリを確認
```bash
# Wizポータルで:
# 1. Security Graph を開く
# 2. 検索バーに "wiz-code-verification-repo" と入力
# 3. リポジトリノードをクリック
```

### 9.2 リポジトリの関係性を確認
Security Graphで以下が可視化されていることを確認:
```
Repository (wiz-code-verification-repo)
  ├─ Branches
  │   ├─ main
  │   └─ feature/add-kubernetes-deployment
  ├─ Files
  │   ├─ Dockerfile (3 issues)
  │   ├─ main.tf (5 issues)
  │   ├─ config.py (4 issues)
  │   └─ k8s-deployment.yaml (0 issues after fix)
  ├─ Contributors
  │   └─ <your-username>
  └─ Integrations
      └─ GitHub App (Connected)
```

---

## 📊 検証結果の確認

### 成功基準
以下がすべて確認できれば、検証成功です:

✅ **GitHub App が正常にインストールされ、リポジトリと連携できた**
✅ **リポジトリの初回スキャンが実行され、問題が検出された**
✅ **プルリクエスト作成時に自動スキャンが実行された**
✅ **PRのFiles changedタブにインラインコメントが表示された**
✅ **Wiz Codeのチェック結果がPRのステータスに反映された**
✅ **問題を修正してプッシュすると、自動的に再スキャンされた**
✅ **ブランチ保護ルールでマージブロック機能が動作した（オプション）**
✅ **Wiz Security GraphでリポジトリとFindingsの関係が可視化された**

---

## 📸 スクリーンショット取得ポイント

以下の画面をスクリーンショットとして保存し、検証レポートに添付してください:

1. **GitHub App インストール画面**（連携の承認画面）
2. **Wizポータルの Integrations 画面**（GitHub連携が表示されている）
3. **Wizポータルの Repositories 一覧**（wiz-code-verification-repoが表示されている）
4. **初回スキャン結果**（Findingsタブ）
5. **プルリクエスト画面**（Wiz Codeのチェック結果が表示されている）
6. **Files changed タブ**（インラインコメントが表示されている）
7. **Wiz Codeのチェック詳細レポート**（クリックして開いた画面）
8. **修正後の再スキャン結果**（Passedステータス）
9. **Security Graph**（リポジトリノードとFindingsの関係）
10. **マージブロック画面**（オプション：Critical issuesでマージできない状態）

---

## 🎓 学んだこと

このシナリオで検証できた機能:
- **GitHub App統合により、パイプラインを変更せずにスキャンを自動化できる**
- **プルリクエストのレビュープロセスに自動的にセキュリティチェックが組み込まれる**
- **インラインコメントにより、開発者が問題の場所と修正方法をすぐに理解できる**
- **ブランチ保護と組み合わせることで、脆弱なコードのマージを防げる**
- **Wiz Security Graphでリポジトリとセキュリティ問題の関係を可視化できる**

---

## 🔄 次のステップ

シナリオ2が完了したら、次のシナリオに進みます:
- **シナリオ3**: GitHub ActionsでのWiz CLI統合とCI/CDパイプライン

---

## ❓ トラブルシューティング

### 問題1: GitHub App のインストールに失敗する
**症状**: 「Installation failed」エラーが表示される
**解決策**:
```bash
# 以下を確認:
# 1. GitHubアカウントに管理者権限があるか
# 2. 組織の場合、GitHub Appのインストール権限があるか
# 3. ブラウザのポップアップブロッカーが無効になっているか
```

### 問題2: スキャンが実行されない
**症状**: PRを作成してもWiz Codeのチェックが表示されない
**解決策**:
```bash
# Wizポータルで設定を確認:
# Settings > Integrations > GitHub > Configuration
# - Pull Request Scanning: Enabled になっているか確認
# - リポジトリが正しく選択されているか確認

# GitHubリポジトリの設定を確認:
# Settings > Integrations > GitHub Apps
# - Wiz Code アプリが表示されているか確認
# - Repository access が正しく設定されているか確認
```

### 問題3: インラインコメントが表示されない
**症状**: Findingsは検出されるが、PRにコメントが表示されない
**解決策**:
```bash
# Wizポータルで設定を確認:
# Settings > Integrations > GitHub > Configuration
# - Inline Comments: Enabled になっているか確認

# GitHubの権限を確認:
# - Wiz Code アプリに "Pull requests: Read & write" 権限があるか確認
```

### 問題4: ブランチ保護ルールが動作しない
**症状**: Critical issuesがあるのにマージできてしまう
**解決策**:
```bash
# GitHubリポジトリの設定を確認:
# Settings > Branches > Branch protection rules
# - "Require status checks to pass before merging" がチェックされているか
# - "Wiz Code Security Scan" がrequired checksに追加されているか

# Wizポータルで設定を確認:
# Settings > Integrations > GitHub > Configuration
# - Block Merge on Failure: Enabled になっているか
```

---

## 📚 参考資料
- [Wiz Code GitHub Integration](https://docs.wiz.io/wiz-code/github-integration)
- [GitHub App Permissions](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/setting-permissions-for-github-apps)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
