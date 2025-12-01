# 検証実行ガイド

本ガイドでは、Wiz Code検証（S01-S11）を繰り返し実行するための手順を説明します。

## 目次

1. [検証の全体フロー](#検証の全体フロー)
2. [ブランチ戦略による繰り返し検証](#ブランチ戦略による繰り返し検証)
3. [Phase 1: シフトレフト検証（S01-S05）](#phase-1-シフトレフト検証s01-s05)
4. [Phase 2: Code-to-Cloud検証（S06-S09）](#phase-2-code-to-cloud検証s06-s09)
5. [Phase 3: 統合検証（S10-S11）](#phase-3-統合検証s10-s11)
6. [エビデンスの収集](#エビデンスの収集)
7. [検証結果のレポート作成](#検証結果のレポート作成)

---

## 検証の全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 環境準備                                                  │
│    - GitHub, Wiz, AWS認証情報の設定                          │
│    - ローカル開発環境のセットアップ                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Phase 1: シフトレフト（S01-S05）                          │
│    - IDE統合 → VCS統合 → CI/CD → IaC → シークレット検出      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Phase 2: Code-to-Cloud（S06-S09）                        │
│    - SBOM → コンテナ → ランタイム → IaC Drift                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Phase 3: 統合検証（S10-S11）                              │
│    - インシデント対応 → AWS Inspector比較                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. エビデンス収集とレポート作成                               │
│    - スクリーンショット、ログ、比較データの整理               │
└─────────────────────────────────────────────────────────────┘
```

---

## ブランチ戦略による繰り返し検証

### 基本戦略

Wiz検証を繰り返し実行できるよう、以下のブランチ戦略を使用します：

```
main (保護ブランチ)
  ↓
feature/test-s01-ide-integration
  ↓ (PRマージ後)
main
  ↓
feature/test-s02-vcs-integration
  ↓ (PRマージ後)
main
  ...
```

### 各シナリオの実行フロー

#### 1. 新しい検証ブランチの作成

```bash
# 最新のmainブランチを取得
git checkout main
git pull origin main

# 検証用ブランチを作成（例: S01の検証）
git checkout -b feature/test-s01-ide-integration

# 脆弱性を含むコードをコミット
git add .
git commit -m "feat: S01検証用の脆弱なコードを追加"
git push -u origin feature/test-s01-ide-integration
```

#### 2. 検証の実行

```bash
# VSCode拡張機能でスキャン（S01の場合）
# または
# Wiz CLIでスキャン
wizcli dir scan --path . --policy-hits-only
```

#### 3. プルリクエストの作成

```bash
# GitHubでプルリクエストを作成
gh pr create \
  --title "S01: IDE統合検証用PR" \
  --body "Wiz VSCode拡張機能とGitHub Appの検証用PRです。意図的な脆弱性が含まれています。"
```

#### 4. Wizスキャン結果の確認

- GitHub PRページでWizのコメントを確認
- 検出された脆弱性のスクリーンショットを取得
- evidenceディレクトリに保存

#### 5. PRマージと次の検証準備

```bash
# PRをマージ
gh pr merge --squash

# ローカルを最新化
git checkout main
git pull origin main

# 次のシナリオ用ブランチを作成
git checkout -b feature/test-s02-vcs-integration
```

### 検証を繰り返す場合

同じシナリオを再実行する場合：

```bash
# ブランチを削除
git checkout main
git branch -D feature/test-s01-ide-integration
git push origin --delete feature/test-s01-ide-integration

# 新しく作成
git checkout -b feature/test-s01-ide-integration
# 修正を加えて再度検証
```

---

## Phase 1: シフトレフト検証（S01-S05）

### S01: IDE統合（VSCode拡張機能）

**目的**: VSCode上でリアルタイムに脆弱性を検出

**実行手順**:

```bash
# 1. Wiz VSCode拡張機能をインストール
code --install-extension WizCloud.wiz-vscode

# 2. 拡張機能の設定
# VSCode → Settings → Wiz → Configure
# Client ID/Secretを設定

# 3. 検証用ブランチを作成
git checkout -b feature/test-s01-ide-integration

# 4. 脆弱なファイルを開く
code taskflow-app/backend/src/routes/tasks.js

# 5. Wizパネルで検出結果を確認
# VSCode左側のWizアイコンをクリック
```

**エビデンス収集**:
- VSCodeでの検出画面のスクリーンショット
- 検出された脆弱性のリスト
- 修正提案の内容

**保存先**: `evidence/phase1/s01-ide-integration/`

---

### S02: VCS統合（GitHub App）

**目的**: プルリクエスト作成時に自動スキャン

**実行手順**:

```bash
# 1. Wiz GitHub Appをインストール
# https://github.com/apps/wiz-io
# リポジトリを選択してインストール

# 2. 検証用ブランチを作成
git checkout -b feature/test-s02-vcs-integration

# 3. 脆弱なコードを追加
# 例: taskflow-app/backend/src/routes/auth.js にSQLインジェクション追加

# 4. コミットとプッシュ
git add taskflow-app/backend/src/routes/auth.js
git commit -m "feat: 認証機能の追加（意図的な脆弱性を含む）"
git push -u origin feature/test-s02-vcs-integration

# 5. プルリクエストを作成
gh pr create --title "S02: VCS統合検証" --body "Wiz GitHub App検証用PR"

# 6. GitHub PRページでWizのコメントを確認
```

**エビデンス収集**:
- GitHub PRのWizコメントのスクリーンショット
- 検出された脆弱性の詳細
- 脆弱性の重要度レベル

**保存先**: `evidence/phase1/s02-vcs-integration/`

---

### S03: CI/CD統合（GitHub Actions）

**目的**: CI/CDパイプラインでの自動スキャン

**実行手順**:

```bash
# 1. GitHub Secretsを設定
# Settings → Secrets → Actions
# WIZ_CLIENT_ID, WIZ_CLIENT_SECRET を追加

# 2. 検証用ブランチを作成
git checkout -b feature/test-s03-cicd-integration

# 3. プッシュして自動スキャンをトリガー
git push -u origin feature/test-s03-cicd-integration

# 4. GitHub ActionsのWorkflow結果を確認
# https://github.com/YOUR_REPO/actions
# "S03: Wiz Full Scan" ワークフローを確認

# 5. ログを確認
gh run view --log
```

**エビデンス収集**:
- GitHub Actionsのワークフロー実行画面
- Wizスキャン結果のログ
- 検出された脆弱性の統計

**保存先**: `evidence/phase1/s03-cicd-integration/`

---

### S04: IaCスキャン（Terraform）

**目的**: インフラコードの設定ミスを検出

**実行手順**:

```bash
# 1. ローカルでIaCスキャンを実行
cd taskflow-app/terraform
wizcli iac scan --path . --policy-hits-only

# 2. 特定のモジュールをスキャン
wizcli iac scan --path ./modules/rds --policy-hits-only

# 3. 環境別にスキャン
wizcli iac scan --path ./environments/dev --policy-hits-only
wizcli iac scan --path ./environments/prod --policy-hits-only

# 4. JSON形式で結果を出力
wizcli iac scan --path . --output-format json > iac-scan-results.json
```

**エビデンス収集**:
- IaCスキャン結果のスクリーンショット
- 検出された設定ミスのリスト
- JSON形式のスキャン結果

**保存先**: `evidence/phase1/s04-iac-scanning/`

---

### S05: シークレット検出

**目的**: ハードコードされた認証情報を検出

**実行手順**:

```bash
# 1. リポジトリ全体のシークレットスキャン
wizcli dir scan --path . --secret-scan-only

# 2. 特定のディレクトリをスキャン
wizcli dir scan --path ./taskflow-app/backend --secret-scan-only
wizcli dir scan --path ./taskflow-app/frontend --secret-scan-only
wizcli dir scan --path ./taskflow-app/scripts --secret-scan-only

# 3. 結果をファイルに保存
wizcli dir scan --path . --secret-scan-only --output-format json > secret-scan-results.json
```

**検出されるべきシークレット**:
- AWS Access Key ID / Secret Access Key
- JWT Secret
- Database Passwords
- API Keys
- GitHub Tokens

**エビデンス収集**:
- シークレットスキャン結果
- 検出された各シークレットの場所
- シークレットの種類別統計

**保存先**: `evidence/phase1/s05-secret-detection/`

---

## Phase 2: Code-to-Cloud検証（S06-S09）

### 事前準備: AWS環境の構築

```bash
# 1. Terraformでインフラを作成
cd taskflow-app/terraform/environments/dev
terraform init
terraform plan
terraform apply -auto-approve

# 2. 出力値を確認
terraform output

# 3. 環境変数を設定
export ECR_REGISTRY=$(terraform output -raw ecr_registry)
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
```

---

### S06: SBOM生成と追跡

**目的**: ソフトウェア部品表を生成し、依存関係を追跡

**実行手順**:

```bash
# 1. バックエンドのSBOM生成（CycloneDX形式）
cd taskflow-app
wizcli dir scan \
  --path ./backend \
  --sbom-output evidence/phase2/s06-sbom/backend-sbom-cyclonedx.json \
  --sbom-format cyclonedx

# 2. フロントエンドのSBOM生成（SPDX形式）
wizcli dir scan \
  --path ./frontend \
  --sbom-output evidence/phase2/s06-sbom/frontend-sbom-spdx.json \
  --sbom-format spdx

# 3. コンテナイメージのSBOM生成
docker build -t taskflow-backend:latest ./backend
wizcli docker scan \
  --image taskflow-backend:latest \
  --sbom-output evidence/phase2/s06-sbom/backend-container-sbom.json \
  --sbom-format cyclonedx

# 4. Wizコンソールでの確認
# Wiz Console → Inventory → Software Packages
# 生成されたSBOMを確認
```

**エビデンス収集**:
- 生成されたSBOMファイル（JSON）
- Wizコンソールでの依存関係グラフのスクリーンショット
- 脆弱な依存関係のリスト

**保存先**: `evidence/phase2/s06-sbom-tracking/`

---

### S07: コンテナトレーサビリティ

**目的**: AWS ECS/EKSからソースコードへの追跡

**実行手順**:

```bash
# 1. Dockerイメージのビルド
cd taskflow-app/backend
docker build -t taskflow-backend:latest .

# 2. ECRにタグ付け
export IMAGE_TAG=$(git rev-parse --short HEAD)
docker tag taskflow-backend:latest \
  ${ECR_REGISTRY}/taskflow-backend:${IMAGE_TAG}

# 3. Code-to-Cloudメタデータのタグ付け
wizcli docker tag \
  --image ${ECR_REGISTRY}/taskflow-backend:${IMAGE_TAG} \
  --source-repo "$(git remote get-url origin)" \
  --source-branch "$(git branch --show-current)" \
  --source-commit "$(git rev-parse HEAD)" \
  --ci-build-id "${GITHUB_RUN_ID:-local}"

# 4. ECRにプッシュ
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}
docker push ${ECR_REGISTRY}/taskflow-backend:${IMAGE_TAG}

# 5. ECSタスク定義を更新してデプロイ
cd ../../terraform/environments/dev
terraform apply -var="backend_image_tag=${IMAGE_TAG}"

# 6. Wizコンソールでトレーサビリティを確認
# Wiz Console → Inventory → Containers
# コンテナからソースコードへのリンクを確認
```

**エビデンス収集**:
- Code-to-Cloudメタデータのスクリーンショット
- Wizコンソールでのコンテナ詳細
- ソースコードへのトレース結果

**保存先**: `evidence/phase2/s07-container-traceability/`

---

### S08: ランタイム優先順位付け

**目的**: 実行中のパッケージの脆弱性を優先的に表示

**実行手順**:

```bash
# 1. アプリケーションをデプロイ（ECS/EKS）
# （S07で既にデプロイ済み）

# 2. Wizコンソールでランタイムコンテキストを確認
# Wiz Console → Vulnerabilities → Runtime Context
# "In Use" フィルターを適用

# 3. 優先度の高い脆弱性を特定
# - CVSSスコア
# - 攻撃可能性（Exploitability）
# - ランタイムでの使用状況

# 4. 比較: Runtime vs Non-Runtime脆弱性
# 使用中のパッケージの脆弱性数
# 未使用のパッケージの脆弱性数
```

**エビデンス収集**:
- ランタイムコンテキスト付き脆弱性リスト
- 優先順位付けの基準
- Runtime vs Non-Runtime の比較データ

**保存先**: `evidence/phase2/s08-runtime-prioritization/`

---

### S09: IaC Drift検出

**目的**: 手動変更を検出し、コードへ追跡

**実行手順**:

```bash
# 1. 意図的に手動変更を実施
# AWS Consoleで以下を変更:
# - RDSのバックアップ保持期間を変更
# - Security Groupのルールを追加
# - S3バケットのパブリックアクセス設定を変更

# 2. Wizコンソールでドリフトを確認
# Wiz Console → Cloud Configuration → Drift Detection
# 検出されたドリフトを確認

# 3. Terraformでドリフトを検出
cd taskflow-app/terraform/environments/dev
terraform plan
# Changesが表示されることを確認

# 4. Wizでコードへの追跡
# Wizコンソールで変更されたリソースを選択
# "View in IaC Code" をクリック
# 対応するTerraformコードを確認
```

**エビデンス収集**:
- 検出されたドリフトのリスト
- Terraformとの差分
- コードへの追跡結果

**保存先**: `evidence/phase2/s09-iac-drift-detection/`

---

## Phase 3: 統合検証（S10-S11）

### S10: インシデント対応フロー

**目的**: Log4Shell等の重大脆弱性への迅速な対応

**実行手順**:

```bash
# 1. シナリオ設定
# log4js 6.3.0（Log4Shell類似の脆弱性）が含まれている

# 2. Wizでの検出確認
# Wiz Console → Vulnerabilities
# "log4js" でフィルター
# CVE情報を確認

# 3. 影響範囲の特定
# どのコンテナで使用されているか
# どのソースコードファイルで参照されているか
# 実行時に使用されているか（Runtime Context）

# 4. 修正計画の作成
# package.jsonの更新
# Dockerイメージの再ビルド
# ECS/EKSへの再デプロイ

# 5. 修正の実施
cd taskflow-app/backend
npm install log4js@latest
npm audit fix

# 6. 再スキャンと確認
wizcli dir scan --path . --policy-hits-only
```

**エビデンス収集**:
- 初期検出時のスクリーンショット
- 影響範囲の分析結果
- 修正前後の比較
- 対応時間の記録

**保存先**: `evidence/phase3/s10-incident-response/`

---

### S11: AWS Inspector比較

**目的**: AWS InspectorとWizの定量的比較

**実行手順**:

```bash
# 1. AWS Inspectorを有効化
aws inspector2 enable \
  --resource-types ECR EC2 LAMBDA

# 2. 同じECRイメージをスキャン
# AWS Inspector（自動スキャン）
# Wiz CLI
wizcli docker scan --image ${ECR_REGISTRY}/taskflow-backend:${IMAGE_TAG}

# 3. スキャン結果の収集
# AWS Inspector結果をJSON形式でエクスポート
aws inspector2 list-findings --output json > comparison/aws-inspector/findings.json

# Wiz結果をJSON形式でエクスポート
wizcli docker scan \
  --image ${ECR_REGISTRY}/taskflow-backend:${IMAGE_TAG} \
  --output-format json > comparison/wiz/findings.json

# 4. 比較分析
# - 検出された脆弱性の数
# - CVSSスコア別の分布
# - 誤検知（False Positive）の数
# - 修正提案の有無
# - スキャン速度
# - Code-to-Cloudトレーサビリティ
```

**比較項目**:

| 項目 | AWS Inspector | Wiz |
|-----|--------------|-----|
| 検出脆弱性数 | ? | ? |
| Critical | ? | ? |
| High | ? | ? |
| Medium | ? | ? |
| Low | ? | ? |
| 誤検知数 | ? | ? |
| スキャン時間 | ? | ? |
| 修正提案 | ❌/✅ | ✅ |
| Code-to-Cloud | ❌ | ✅ |
| SBOM生成 | 限定的 | ✅ |

**エビデンス収集**:
- 両ツールのスキャン結果（JSON）
- 比較表（Excel/CSV）
- 差異の詳細分析
- 推奨事項

**保存先**: `comparison/`

---

## エビデンスの収集

### ディレクトリ構造

```bash
evidence/
├── phase1/
│   ├── s01-ide-integration/
│   │   ├── vscode-screenshot-001.png
│   │   ├── vscode-screenshot-002.png
│   │   └── detected-vulnerabilities.md
│   ├── s02-vcs-integration/
│   │   ├── github-pr-screenshot.png
│   │   ├── wiz-comment-screenshot.png
│   │   └── scan-results.json
│   ├── s03-cicd-integration/
│   ├── s04-iac-scanning/
│   └── s05-secret-detection/
├── phase2/
│   ├── s06-sbom-tracking/
│   ├── s07-container-traceability/
│   ├── s08-runtime-prioritization/
│   └── s09-iac-drift-detection/
└── phase3/
    ├── s10-incident-response/
    └── s11-aws-inspector-comparison/
```

### エビデンス収集のベストプラクティス

1. **スクリーンショット**
   - 日時が表示されるように
   - 重要な部分をハイライト
   - ファイル名に連番を付ける

2. **ログファイル**
   - JSON形式で保存
   - タイムスタンプを含める
   - 機密情報をマスク

3. **コマンド履歴**
   - 実行したコマンドを記録
   - 出力結果も保存

---

## 検証結果のレポート作成

### レポートテンプレート

```markdown
# Wiz Code検証レポート - [シナリオ名]

## 実施情報
- **実施日**: 2025-XX-XX
- **実施者**: [名前]
- **シナリオ**: SXX - [シナリオ名]
- **所要時間**: X時間

## 目的
[このシナリオの検証目的]

## 検証手順
1. [ステップ1]
2. [ステップ2]
...

## 検証結果

### 検出された脆弱性
| ID | 脆弱性名 | 重要度 | 場所 | 検出方法 |
|----|---------|--------|------|---------|
| 1  | SQLインジェクション | Critical | tasks.js:65 | IDE/VCS/CI |
| 2  | XSS | High | index.js:120 | IDE/VCS |

### スクリーンショット
![検出画面](../evidence/phase1/s01/screenshot-001.png)

### 統計データ
- 検出された脆弱性総数: X件
- Critical: X件
- High: X件
- Medium: X件
- Low: X件

## 学び・気づき
- [学んだこと1]
- [学んだこと2]

## 推奨事項
- [推奨1]
- [推奨2]

## 次のステップ
- [次にやること]
```

---

## トラブルシューティング

### GitHub Actionsが失敗する

```bash
# ログを確認
gh run view --log

# Secretsを再設定
gh secret set WIZ_CLIENT_ID
gh secret set WIZ_CLIENT_SECRET

# ワークフローを手動実行
gh workflow run "S03: Wiz Full Scan"
```

### Wizスキャンがタイムアウトする

```bash
# タイムアウト時間を延長
wizcli dir scan --path . --timeout 600

# 大きなディレクトリを除外
wizcli dir scan --path . --exclude "node_modules,dist"
```

### AWS環境の構築に失敗する

```bash
# Terraformのログを詳細表示
export TF_LOG=DEBUG
terraform apply

# 状態ファイルをクリーン
terraform destroy
rm -rf .terraform terraform.tfstate*
terraform init
```

---

## 参考資料

- [Phase 1詳細手順](../phase1-shift-left/README.md)
- [Phase 2詳細手順](../phase2-code-to-cloud/README.md)
- [Phase 3詳細手順](../phase3-integration/README.md)
- [Wiz CLI Reference](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [手動セットアップガイド](./MANUAL_SETUP_GUIDE.md)
