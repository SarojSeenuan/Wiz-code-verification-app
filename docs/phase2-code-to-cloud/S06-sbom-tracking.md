# S06: SBOM生成と追跡

## 概要

Software Bill of Materials（SBOM）を自動生成し、依存関係の脆弱性をソースコードからコンテナイメージまで追跡できることを検証します。

## 検証目的

- SBOMの自動生成機能を確認
- 依存関係の完全なリストを取得
- 脆弱性のあるパッケージを特定
- ソースコード → ビルド → イメージの追跡を検証

## 前提条件

### 必須ツール
- Docker Desktop
- Node.js 18+
- Python 3.10+
- Wiz CLI
- jq（JSON処理用）

### 必要な権限
- Wiz テナントへのアクセス
- Docker Hubまたは ECRへのアクセス

## 検証手順

### Step 1: サンプルアプリケーションの準備

Node.jsとPythonの依存関係を含むアプリケーションを用意します。

```json
// package.json - 意図的に古いバージョンを含む
{
  "name": "taskflow-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "4.17.1",        // 古いバージョン
    "lodash": "4.17.19",         // 既知の脆弱性あり
    "axios": "0.21.1",           // 既知の脆弱性あり
    "jsonwebtoken": "8.5.1",     // 古いバージョン
    "bcrypt": "5.0.0",
    "pg": "8.5.1",
    "dotenv": "8.2.0"
  },
  "devDependencies": {
    "jest": "26.6.3",
    "eslint": "7.32.0"
  }
}
```

```text
# requirements.txt - 意図的に古いバージョンを含む
Flask==1.1.2          # 既知の脆弱性あり
requests==2.25.1      # 古いバージョン
SQLAlchemy==1.3.23    # 古いバージョン
Jinja2==2.11.3        # 既知の脆弱性あり
cryptography==3.3.2   # 古いバージョン
PyJWT==1.7.1
psycopg2-binary==2.8.6
```

### Step 2: ソースコードのSBOM生成

```bash
# Wiz CLI認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# Node.jsプロジェクトのSBOM生成（CycloneDX形式）
wizcli dir scan \
  --path ./backend \
  --sbom-output sbom-backend-cyclonedx.json \
  --sbom-format cyclonedx

# SPDX形式でのSBOM生成
wizcli dir scan \
  --path ./backend \
  --sbom-output sbom-backend-spdx.json \
  --sbom-format spdx

# PythonプロジェクトのスキャンとjqSBOM
wizcli dir scan \
  --path ./python-service \
  --sbom-output sbom-python.json \
  --sbom-format cyclonedx
```

### Step 3: SBOMの内容確認

```bash
# CycloneDX SBOMの構造確認
jq '.components[] | {name: .name, version: .version, purl: .purl}' sbom-backend-cyclonedx.json | head -20

# 依存関係の総数を確認
jq '.components | length' sbom-backend-cyclonedx.json

# 脆弱性を含むパッケージを抽出
jq '.components[] | select(.vulnerabilities | length > 0) | {name: .name, version: .version, vulnCount: (.vulnerabilities | length)}' sbom-backend-cyclonedx.json
```

**期待される出力例**:
```json
{
  "name": "lodash",
  "version": "4.17.19",
  "vulnCount": 3
}
{
  "name": "axios",
  "version": "0.21.1",
  "vulnCount": 1
}
```

### Step 4: Dockerfileの作成とイメージビルド

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

```bash
# イメージをビルド
docker build -t taskflow-backend:v1.0.0 .

# ビルド引数でメタデータを付与
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg GIT_BRANCH=$(git branch --show-current) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t taskflow-backend:v1.0.0 \
  .
```

### Step 5: コンテナイメージのSBOM生成

```bash
# Dockerイメージのスキャンとsbomsbom生成
wizcli docker scan \
  --image taskflow-backend:v1.0.0 \
  --sbom-output sbom-image-cyclonedx.json \
  --sbom-format cyclonedx

# 詳細なスキャン結果を取得
wizcli docker scan \
  --image taskflow-backend:v1.0.0 \
  --output-format json > image-scan-results.json

# イメージレイヤーごとの分析
wizcli docker scan \
  --image taskflow-backend:v1.0.0 \
  --show-layers
```

### Step 6: ソースとイメージのSBOM比較

```bash
# ソースコードのパッケージ数
SOURCE_PACKAGES=$(jq '.components | length' sbom-backend-cyclonedx.json)

# イメージのパッケージ数（OSパッケージ含む）
IMAGE_PACKAGES=$(jq '.components | length' sbom-image-cyclonedx.json)

echo "Source packages: $SOURCE_PACKAGES"
echo "Image packages: $IMAGE_PACKAGES"

# アプリケーション依存関係の比較
jq -r '.components[] | select(.type == "library") | .name + "@" + .version' sbom-backend-cyclonedx.json | sort > source-deps.txt
jq -r '.components[] | select(.purl | startswith("pkg:npm/")) | .name + "@" + .version' sbom-image-cyclonedx.json | sort > image-deps.txt

# 差分を確認
diff source-deps.txt image-deps.txt
```

### Step 7: CI/CDパイプラインでのSBOM生成

```yaml
# .github/workflows/S06-sbom-generation.yml
name: S06 - SBOM Generation and Tracking

on:
  push:
    branches: [main, develop]
  pull_request:

env:
  IMAGE_NAME: taskflow-backend
  IMAGE_TAG: ${{ github.sha }}

jobs:
  sbom-generation:
    name: Generate and Upload SBOM
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

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

      - name: Generate Source Code SBOM
        run: |
          wizcli dir scan \
            --path ./backend \
            --sbom-output sbom-source-cyclonedx.json \
            --sbom-format cyclonedx

          wizcli dir scan \
            --path ./backend \
            --sbom-output sbom-source-spdx.json \
            --sbom-format spdx

      - name: Build Docker image
        run: |
          docker build \
            --build-arg GIT_COMMIT=${{ github.sha }} \
            --build-arg GIT_BRANCH=${{ github.ref_name }} \
            --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
            --build-arg BUILD_ID=${{ github.run_id }} \
            -t ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
            ./backend

      - name: Generate Container Image SBOM
        run: |
          wizcli docker scan \
            --image ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
            --sbom-output sbom-image-cyclonedx.json \
            --sbom-format cyclonedx

          wizcli docker scan \
            --image ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
            --sbom-output sbom-image-spdx.json \
            --sbom-format spdx

      - name: Tag image with metadata
        run: |
          wizcli docker tag \
            --image ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
            --source-repo "${{ github.repository }}" \
            --source-branch "${{ github.ref_name }}" \
            --source-commit "${{ github.sha }}" \
            --ci-build-id "${{ github.run_id }}"

      - name: Scan for vulnerabilities
        run: |
          wizcli docker scan \
            --image ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
            --output-format json > vulnerability-report.json

      - name: Generate SBOM comparison report
        run: |
          cat > sbom-comparison.md << 'EOF'
          # SBOM Comparison Report

          ## Source Code SBOM
          - **Total Components**: $(jq '.components | length' sbom-source-cyclonedx.json)
          - **Direct Dependencies**: $(jq '[.components[] | select(.scope == "required")] | length' sbom-source-cyclonedx.json)

          ## Container Image SBOM
          - **Total Components**: $(jq '.components | length' sbom-image-cyclonedx.json)
          - **Application Packages**: $(jq '[.components[] | select(.purl | startswith("pkg:npm/"))] | length' sbom-image-cyclonedx.json)
          - **OS Packages**: $(jq '[.components[] | select(.purl | startswith("pkg:apk/"))] | length' sbom-image-cyclonedx.json)

          ## Vulnerabilities
          - **Critical**: $(jq '[.vulnerabilities[] | select(.severity == "CRITICAL")] | length' vulnerability-report.json)
          - **High**: $(jq '[.vulnerabilities[] | select(.severity == "HIGH")] | length' vulnerability-report.json)
          - **Medium**: $(jq '[.vulnerabilities[] | select(.severity == "MEDIUM")] | length' vulnerability-report.json)
          EOF

      - name: Upload SBOMs
        uses: actions/upload-artifact@v4
        with:
          name: sbom-files
          path: |
            sbom-source-*.json
            sbom-image-*.json
            vulnerability-report.json
            sbom-comparison.md

      - name: Upload to Wiz
        run: |
          wizcli docker scan \
            --image ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }} \
            --upload

      - name: Comment PR with SBOM summary
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const sbomSource = JSON.parse(fs.readFileSync('sbom-source-cyclonedx.json'));
            const sbomImage = JSON.parse(fs.readFileSync('sbom-image-cyclonedx.json'));
            const vulns = JSON.parse(fs.readFileSync('vulnerability-report.json'));

            const critical = vulns.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
            const high = vulns.vulnerabilities.filter(v => v.severity === 'HIGH').length;

            let comment = '## SBOM Generation Summary\n\n';
            comment += `### Source Code\n`;
            comment += `- Total packages: ${sbomSource.components.length}\n\n`;
            comment += `### Container Image\n`;
            comment += `- Total packages: ${sbomImage.components.length}\n\n`;
            comment += `### Vulnerabilities\n`;
            comment += `- 🔴 Critical: ${critical}\n`;
            comment += `- 🟠 High: ${high}\n`;

            if (critical > 0) {
              comment += '\n⚠️ **Action Required**: Critical vulnerabilities detected!';
            }

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Step 8: Wizコンソールでの確認

1. **Wiz Console にログイン**
2. **Inventory → Images** に移動
3. **taskflow-backend** イメージを検索
4. **SBOM タブ** を確認
5. **Code Origin** でソースコードへの追跡を確認

## 期待される結果

### SBOM生成

| フォーマット | ソースコード | コンテナイメージ |
|-------------|------------|----------------|
| CycloneDX | ✅ 生成成功 | ✅ 生成成功 |
| SPDX | ✅ 生成成功 | ✅ 生成成功 |

### 依存関係の検出

**ソースコード**:
- 直接依存関係: 7-10パッケージ
- 推移的依存関係: 50-100パッケージ

**コンテナイメージ**:
- アプリケーションパッケージ: 60-110パッケージ
- OSパッケージ（Alpine Linux）: 10-20パッケージ

### 脆弱性検出

| パッケージ | バージョン | CVE | 重大度 |
|----------|----------|-----|--------|
| lodash | 4.17.19 | CVE-2020-8203 | HIGH |
| axios | 0.21.1 | CVE-2021-3749 | HIGH |
| Flask | 1.1.2 | CVE-2023-30861 | HIGH |
| Jinja2 | 2.11.3 | CVE-2020-28493 | MEDIUM |

## 検証ポイント

### 1. SBOM品質
- [ ] すべての依存関係が含まれている
- [ ] バージョン情報が正確
- [ ] PURL（Package URL）が正しく生成されている
- [ ] ライセンス情報が含まれている

### 2. 追跡可能性
- [ ] ソースコードからイメージまで追跡できる
- [ ] CI/CDビルドとの紐付けが確認できる
- [ ] Gitコミットハッシュが記録されている
- [ ] Wizコンソールで可視化されている

### 3. 脆弱性検出
- [ ] 既知の脆弱性がすべて検出される
- [ ] 影響を受けるパッケージが特定される
- [ ] 修正バージョンが提示される
- [ ] 重大度が適切に分類される

### 4. 統合性
- [ ] CI/CDパイプラインで自動生成される
- [ ] 複数のフォーマット（CycloneDX、SPDX）に対応
- [ ] Wizへの自動アップロードが機能する

## トラブルシューティング

### 問題: SBOMが生成されない

```bash
# パッケージマネージャーファイルの存在確認
ls -la package*.json requirements.txt

# Wiz CLIのバージョン確認
wizcli version

# 詳細ログでスキャン
wizcli dir scan --path . --sbom-output sbom.json --verbose
```

### 問題: 依存関係が不完全

```bash
# package-lock.jsonまたはrequirements.txtが最新か確認
npm install  # Node.js
pip freeze > requirements.txt  # Python

# 再スキャン
wizcli dir scan --path . --sbom-output sbom.json --sbom-format cyclonedx
```

### 問題: Wizへのアップロードが失敗

```bash
# 認証状態を確認
wizcli auth status

# ネットワーク接続を確認
curl -I https://api.wiz.io

# 再認証してアップロード
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
wizcli docker scan --image myimage:tag --upload
```

## 関連シナリオ

- [S03: CI/CD統合](../phase1-shift-left/S03-cicd-integration.md) - パイプラインでのSBOM生成
- [S07: コンテナトレーサビリティ](S07-container-traceability.md) - SBOMを使った追跡
- [S08: ランタイム優先順位付け](S08-runtime-prioritization.md) - 実行中パッケージの特定

## 参考資料

- [Wiz SBOM生成ガイド](https://docs.wiz.io/wiz-docs/docs/sbom-generation)
- [CycloneDX仕様](https://cyclonedx.org/specification/overview/)
- [SPDX仕様](https://spdx.dev/specifications/)
- [NTIA SBOM要件](https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom)
