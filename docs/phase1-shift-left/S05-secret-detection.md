# S05: シークレット検出

## 概要

ソースコードやコンテナイメージ内にハードコードされたシークレット（APIキー、パスワード、トークン等）を検出し、情報漏洩リスクを未然に防ぐことを検証します。

## 検証目的

- ハードコードされたシークレットを自動検出できることを確認
- シークレットの種類（AWS Key、GitHub Token等）を正確に特定
- IDE、VCS、CI/CDのすべての段階で検出されることを確認
- False Positiveの評価

## 前提条件

### 必須ツール
- Visual Studio Code with Wiz拡張機能
- Git
- GitHub アカウント
- Docker Desktop
- Wiz CLI

### 必要な権限
- Wiz テナントへのアクセス
- GitHub リポジトリへの書き込み権限

### 環境変数
```bash
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
```

## 検証手順

### Step 1: テスト用シークレットの準備

**重要**: 以下はテスト用のダミーシークレットです。実際の認証情報は絶対に使用しないでください。

```javascript
// backend/src/config/vulnerable-config.js

module.exports = {
  // 問題1: AWSアクセスキーのハードコード
  aws: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1'
  },

  // 問題2: データベース接続文字列
  database: {
    host: 'production-db.example.com',
    username: 'admin',
    password: 'SuperSecretPassword123!',
    database: 'app_production',
    connectionString: 'postgresql://admin:SuperSecretPassword123!@production-db.example.com:5432/app_production'
  },

  // 問題3: APIキーのハードコード
  thirdParty: {
    stripeKey: 'sk_live_51H8xYzExample123456789abcdef',
    githubToken: 'ghp_xyzExampleToken123456789abcdefghijkl',
    sendGridApiKey: 'SG.xyzExampleSendGrid123456789.abcdefghijklmnopqrstuvwxyz',
    slackWebhook: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'
  },

  // 問題4: JWTシークレット
  jwt: {
    secret: 'this-is-my-super-secret-jwt-key-12345',
    expiresIn: '7d'
  },

  // 問題5: OAuth クライアントシークレット
  oauth: {
    clientId: 'my-oauth-client-id',
    clientSecret: 'my-oauth-client-secret-1234567890'
  }
};
```

```python
# backend/src/config/vulnerable_config.py

# 問題6: Pythonファイル内のシークレット
class Config:
    # AWSシークレット
    AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
    AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

    # データベース接続
    DATABASE_URL = "postgresql://admin:SuperSecret123@db.example.com:5432/mydb"
    REDIS_PASSWORD = "redis-password-12345"

    # APIキー
    OPENAI_API_KEY = "sk-proj-xyzExampleOpenAI123456789abcdefghijkl"
    STRIPE_SECRET_KEY = "sk_live_51H8xYzExample123456789abcdef"

    # プライベートキー
    SSH_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz...
-----END RSA PRIVATE KEY-----"""
```

```dockerfile
# Dockerfile.vulnerable

FROM node:18

# 問題7: Dockerfile内のシークレット
ENV AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
ENV AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
ENV DATABASE_PASSWORD=SuperSecretDbPassword123
ENV API_TOKEN=ghp_xyzExampleGitHubToken123456789

WORKDIR /app
COPY . .

RUN npm install

CMD ["npm", "start"]
```

```yaml
# kubernetes/vulnerable-deployment.yaml

apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  # 問題8: Kubernetes manifest内のハードコードされたシークレット
  database-password: "SuperSecretPassword123"
  api-key: "sk_live_51H8xYzExample123456789"
  aws-access-key: "AKIAIOSFODNN7EXAMPLE"
  aws-secret-key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

```bash
# scripts/vulnerable-deploy.sh

#!/bin/bash

# 問題9: シェルスクリプト内のシークレット
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export GITHUB_TOKEN="ghp_xyzExampleGitHubToken123456789"

# デプロイ処理
echo "Deploying with hardcoded credentials..."
```

### Step 2: VSCodeでのリアルタイム検出

1. **VSCodeでファイルを開く**
   ```bash
   code backend/src/config/vulnerable-config.js
   ```

2. **Wiz拡張機能が警告を表示することを確認**
   - ファイルを開いた瞬間に警告が表示される
   - 各シークレットに下線が引かれる
   - ホバーで詳細情報が表示される

3. **検出結果の確認**
   - シークレットの種類（AWS Key、API Token等）
   - 重大度（CRITICAL/HIGH）
   - 推奨される修正方法

### Step 3: コミット前のローカルスキャン

```bash
# Wiz CLI認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# ディレクトリスキャン（シークレット検出）
wizcli dir scan --path . --scan-types secrets

# 特定ファイルのスキャン
wizcli dir scan --path backend/src/config/vulnerable-config.js

# JSON形式で結果を出力
wizcli dir scan --path . --scan-types secrets --output-format json > secrets-scan.json
```

### Step 4: Git Hookの設定（オプション）

コミット前に自動的にスキャンを実行します。

```bash
# .git/hooks/pre-commit

#!/bin/bash

echo "Running Wiz secret scan..."

# Wiz CLIでシークレットスキャン
wizcli dir scan --path . --scan-types secrets --severity CRITICAL,HIGH

if [ $? -ne 0 ]; then
  echo "❌ Secret detection failed! Commit blocked."
  echo "Please remove hardcoded secrets before committing."
  exit 1
fi

echo "✅ No secrets detected. Proceeding with commit."
```

```bash
# Hookに実行権限を付与
chmod +x .git/hooks/pre-commit
```

### Step 5: GitHub PR作成時の自動スキャン

脆弱なコードでPRを作成します。

```bash
# ブランチ作成
git checkout -b test/secret-detection

# ファイルをステージング
git add backend/src/config/vulnerable-config.js

# コミット（Git Hookがブロックする場合は無効化）
git commit -m "Test: Add vulnerable config for secret detection" --no-verify

# プッシュ
git push origin test/secret-detection

# PRを作成
gh pr create --title "Test: Secret Detection" --body "Testing Wiz secret detection capabilities"
```

**期待される動作**:
- Wiz GitHub AppがPRを自動スキャン
- 検出されたシークレットがPRコメントとして表示される
- マージがブロックされる（設定による）

### Step 6: CI/CDパイプラインでのスキャン

```yaml
# .github/workflows/S05-wiz-secret-scan.yml
name: S05 - Secret Detection

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  secret-scan:
    name: Scan for Hardcoded Secrets
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 履歴全体を取得

      - name: Install Wiz CLI
        run: |
          curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/

      - name: Authenticate with Wiz
        env:
          WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}
          WIZ_CLIENT_SECRET: ${{ secrets.WIZ_CLIENT_SECRET }}
        run: |
          wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

      - name: Scan for secrets
        id: secret-scan
        run: |
          wizcli dir scan \
            --path . \
            --scan-types secrets \
            --output-format json > secrets-results.json

          # 検出されたシークレット数をカウント
          SECRET_COUNT=$(jq '.secrets | length' secrets-results.json)
          echo "secret_count=$SECRET_COUNT" >> $GITHUB_OUTPUT

      - name: Upload scan results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: secret-scan-results
          path: secrets-results.json

      - name: Comment on PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('secrets-results.json', 'utf8'));

            let comment = '## 🔒 Secret Detection Results\n\n';

            if (results.secrets && results.secrets.length > 0) {
              comment += `⚠️ **Found ${results.secrets.length} hardcoded secret(s)**\n\n`;

              results.secrets.forEach(secret => {
                comment += `### ${secret.type}\n`;
                comment += `- **File**: \`${secret.file}\`\n`;
                comment += `- **Line**: ${secret.line}\n`;
                comment += `- **Severity**: ${secret.severity}\n\n`;
              });

              comment += '\n**Action Required**: Please remove hardcoded secrets before merging.\n';
            } else {
              comment += '✅ No hardcoded secrets detected.\n';
            }

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Fail if secrets detected
        if: steps.secret-scan.outputs.secret_count > 0
        run: |
          echo "❌ Found ${{ steps.secret-scan.outputs.secret_count }} secret(s)!"
          echo "Please remove hardcoded secrets before proceeding."
          exit 1
```

### Step 7: コンテナイメージスキャン

```bash
# 脆弱なDockerfileをビルド
docker build -f Dockerfile.vulnerable -t vulnerable-app:test .

# イメージスキャン（シークレット検出を含む）
wizcli docker scan --image vulnerable-app:test

# シークレット検出のみ
wizcli docker scan --image vulnerable-app:test --scan-types secrets
```

### Step 8: 修正版の作成

正しいシークレット管理方法を実装します。

```javascript
// backend/src/config/secure-config.js

// 環境変数から読み込み
module.exports = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  },

  database: {
    host: process.env.DB_HOST,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionString: process.env.DATABASE_URL
  },

  thirdParty: {
    stripeKey: process.env.STRIPE_SECRET_KEY,
    githubToken: process.env.GITHUB_TOKEN,
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    slackWebhook: process.env.SLACK_WEBHOOK_URL
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};
```

```.env.example
# 環境変数のテンプレート

# AWS認証情報
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# データベース
DB_HOST=localhost
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=myapp
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# サードパーティAPI
STRIPE_SECRET_KEY=your_stripe_key
GITHUB_TOKEN=your_github_token
SENDGRID_API_KEY=your_sendgrid_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

```.gitignore
# シークレットファイルを除外
.env
.env.local
.env.production
secrets/
*.key
*.pem
credentials.json
```

## 期待される結果

### 検出されるシークレットの種類

| シークレットタイプ | 検出数 | 重大度 |
|------------------|--------|--------|
| AWS認証情報 | 4 | CRITICAL |
| データベースパスワード | 3 | CRITICAL |
| APIキー（GitHub, Stripe等） | 5 | HIGH |
| JWTシークレット | 1 | HIGH |
| OAuthクライアントシークレット | 1 | HIGH |
| SSHプライベートキー | 1 | CRITICAL |

### 検出段階

| 段階 | 検出されるべき | 実際の検出 |
|-----|-------------|-----------|
| VSCode（リアルタイム） | ✅ | 確認 |
| Git Hook（コミット前） | ✅ | 確認 |
| GitHub PR | ✅ | 確認 |
| CI/CDパイプライン | ✅ | 確認 |
| コンテナイメージ | ✅ | 確認 |

## 検証ポイント

### 1. 検出精度
- [ ] すべてのシークレットタイプが検出される
- [ ] False Positiveが少ない
- [ ] シークレットの種類が正確に分類される

### 2. 検出タイミング
- [ ] VSCodeでリアルタイム検出
- [ ] コミット前に検出
- [ ] PR作成時に検出
- [ ] CI/CDパイプラインで検出
- [ ] コンテナイメージスキャンで検出

### 3. フィードバック品質
- [ ] 各シークレットの位置（ファイル、行番号）が明示される
- [ ] 修正方法が具体的に提示される
- [ ] 重大度が適切に分類される

### 4. 開発者体験
- [ ] 誤検知による開発の妨げが最小限
- [ ] 修正方法が明確で実行しやすい
- [ ] パフォーマンスへの影響が許容範囲

## トラブルシューティング

### 問題: 特定のシークレットが検出されない

```bash
# Wiz CLIのバージョンを確認
wizcli version

# 最新版にアップデート
curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
chmod +x wizcli
sudo mv wizcli /usr/local/bin/
```

### 問題: False Positiveが多い

```bash
# .wizignore ファイルで除外設定
echo "test/fixtures/**" >> .wizignore
echo "*.test.js" >> .wizignore
echo "mock-data/**" >> .wizignore
```

### 問題: Git Hookがブロックしてコミットできない

```bash
# 一時的にフックをバイパス（テスト目的のみ）
git commit --no-verify

# またはフックを無効化
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
```

## 関連シナリオ

- [S01: IDE統合](S01-ide-integration.md) - VSCodeでのリアルタイム検出
- [S02: VCS統合](S02-vcs-integration.md) - PR作成時の自動スキャン
- [S03: CI/CD統合](S03-cicd-integration.md) - パイプラインでの自動スキャン
- [S04: IaCスキャン](S04-iac-scanning.md) - IaC内のシークレット検出

## 参考資料

- [Wiz Secret Detection](https://docs.wiz.io/wiz-docs/docs/secret-detection)
- [シークレット管理のベストプラクティス](https://docs.wiz.io/wiz-docs/docs/secret-management-best-practices)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
