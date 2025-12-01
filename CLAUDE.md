# CLAUDE.md

このファイルは、Claude Code（claude.ai/code）がこのリポジトリで作業する際のガイドラインを提供します。

## プロジェクト概要

これは**Wiz Code検証プロジェクト**であり、Wizのセキュリティ機能をさまざまな開発シナリオでテストおよび検証するために設計されています。このプロジェクトにはドキュメントとWiz Code機能を検証するためのステップバイステップガイドが含まれており、実装コードは含まれていません。

**重要**: このリポジトリには、テスト目的で意図的にセキュリティ脆弱性が含まれています。**本番環境ではこのリポジトリのコードを絶対に使用しないでください。**

## リポジトリ構造

```
WizCodeVerification/
├── README.md                           # メインプロジェクト概要とシナリオガイド
├── SCENARIO_MAP.md                     # 検証シナリオ構成図（11シナリオ）
├── CLAUDE.md                           # 本ファイル（Claude Code向け指示）
│
├── docs/                              # ドキュメント
│   ├── overview/                      # 全体概要
│   │   └── architecture.md           # システムアーキテクチャ
│   │
│   ├── phase1-shift-left/            # Phase 1: シフトレフト（S01-S05）
│   │   ├── README.md
│   │   ├── S01-ide-integration.md    # IDE統合とリアルタイムスキャン
│   │   ├── S02-vcs-integration.md    # GitHub AppとPRスキャン
│   │   ├── S03-cicd-integration.md   # CI/CDパイプライン統合
│   │   ├── S04-iac-scanning.md       # IaCスキャン
│   │   └── S05-secret-detection.md   # シークレット検出
│   │
│   ├── phase2-code-to-cloud/         # Phase 2: Code-to-Cloud（S06-S09）
│   │   ├── README.md
│   │   ├── S06-sbom-tracking.md      # SBOM生成と追跡
│   │   ├── S07-container-traceability.md  # コンテナトレーサビリティ
│   │   ├── S08-runtime-prioritization.md  # ランタイム優先順位付け
│   │   └── S09-iac-drift-detection.md     # IaC Drift検出
│   │
│   └── phase3-integration/           # Phase 3: 統合・比較（S10-S11）
│       ├── README.md
│       ├── S10-incident-response.md  # インシデント対応フロー
│       └── S11-aws-inspector-comparison.md  # AWS Inspector比較
│
├── wiz-code-verification-taskflow/   # TaskFlowサンプルアプリケーション
│   ├── .github/workflows/            # CI/CDワークフロー
│   ├── backend/                      # バックエンド（Node.js/Express）
│   ├── frontend/                     # フロントエンド（Next.js/React）
│   ├── terraform/                    # IaC（Terraform）
│   ├── k8s/                          # Kubernetes manifests
│   └── scripts/                      # 各種スクリプト
│
├── comparison/                       # S11用：比較検証データ
│   ├── aws-inspector/
│   └── wiz/
│
└── evidence/                         # 検証エビデンス
    ├── phase1/
    ├── phase2/
    └── phase3/
```

## 主要なアーキテクチャコンセプト

### 検証シナリオ（全11シナリオ）

**Phase 1: シフトレフト（シナリオS01-S05）**
- **S01**: VSCode IDE統合とリアルタイムセキュリティフィードバック
- **S02**: GitHub App統合とプルリクエストスキャン
- **S03**: Wiz CLIを使用したGitHub Actions CI/CDパイプライン
- **S04**: IaC（Terraform）スキャン
- **S05**: シークレット検出

**Phase 2: Code-to-Cloudインフラ（シナリオS06-S09）**
- **S06**: SBOM生成と依存関係追跡
- **S07**: コンテナトレーサビリティ（ECS/EKS → ソースコード）
- **S08**: ランタイム脆弱性の優先順位付け
- **S09**: IaC Drift検出とコード追跡

**Phase 3: 統合・比較（シナリオS10-S11）**
- **S10**: インシデント対応フロー（Log4Shell等）
- **S11**: AWS Inspector vs Wiz比較

### 意図的なセキュリティ問題

プロジェクトには、Wizの検出機能をテストするための意図的に脆弱なファイルが含まれています:
- **Dockerfile**: 古いベースイメージ、ハードコードされたシークレット、rootユーザー実行
- **Terraformファイル**: パブリックS3バケット、暗号化なしのRDS、開放されたセキュリティグループ
- **設定ファイル**: ハードコードされたAWS認証情報、APIキー、データベースパスワード
- **アプリケーションコード**: SQLインジェクション、XSS、認証バイパス

## よく使用するWiz CLIコマンド

### 認証

```bash
# Wiz CLIでの認証
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"
```

### ディレクトリスキャン（ソースコード、シークレット、依存関係）

```bash
wizcli dir scan --path . --policy "Default vulnerabilities policy"
```

### IaCスキャン（Terraform、CloudFormation、Kubernetes）

```bash
wizcli iac scan --path ./terraform --policy-hits-only
```

### Dockerイメージスキャン

```bash
wizcli docker scan --image app:latest --tag "component=backend"
```

### SBOM生成

```bash
wizcli docker scan --image app:latest --sbom-output sbom.json --sbom-format cyclonedx
```

### Code-to-CloudトレーサビリティのためのDockerイメージタグ付け

```bash
wizcli docker tag \
  --image app:latest \
  --source-repo "$GITHUB_REPOSITORY" \
  --source-branch "$GITHUB_REF_NAME" \
  --source-commit "$GITHUB_SHA"
```

## テストと検証コマンド

```bash
# シナリオ1: VSCodeテスト
# Wiz VSCode拡張機能をインストールし、リアルタイムスキャンをテスト
code --install-extension WizCloud.wiz-vscode

# シナリオ2: GitHub統合テスト
gh repo create wiz-code-verification-repo --public
# Wiz GitHub Appをインストールし、PRスキャンをテスト

# シナリオ3: CI/CDパイプラインテスト
# .github/workflows/にGitHub Actionsワークフローを作成
# git pushとPR作成でテスト

# AWS環境セットアップ（シナリオ4-7）
terraform init
terraform plan
terraform apply

# Dockerオペレーション
docker build -t test-image .
docker run -d test-image
```

## 環境セットアップ

```bash
# 必須ツール
- Visual Studio Code（Wiz拡張機能付き）
- GitHub CLI (gh)
- Docker Desktop
- AWS CLI v2
- Terraform 1.6+
- kubectl（EKSシナリオ用）

# 必須環境変数
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
export AWS_ACCOUNT_ID="your_aws_account"
export AWS_REGION="us-east-1"
```

## プロジェクトのコンテキストと目的

これは、顧客デモンストレーション用にWizセキュリティプラットフォーム機能を検証するための**TIS社内プロジェクト**です。検証対象:

1. **シフトレフトセキュリティ**: IDE、VCS、CI/CDでの早期検出
2. **Code-to-Cloudトレーサビリティ**: デプロイされたリソースとソースコードの紐付け
3. **ランタイムコンテキスト**: 実際の使用状況に基づく脆弱性の優先順位付け
4. **自動修正**: セキュリティ問題の識別と修正ワークフロー

## このリポジトリでの作業

### テストファイル作成時

Wizに検出させるために、常に意図的なセキュリティ問題を含めてください:

```dockerfile
# 脆弱なDockerfileの例
FROM ubuntu:18.04  # 古いベースイメージ
ENV AWS_SECRET_KEY="hardcoded_secret"  # ハードコードされたシークレット
USER root  # rootユーザーとして実行
```

```hcl
# 脆弱なTerraformの例
resource "aws_s3_bucket" "public" {
  # パブリックアクセスブロックの設定ミス
}
```

### ドキュメント修正時

- 日本語の一貫性を保つ（これは日本語プロジェクトです）
- シナリオの追加/削除時はステップ番号とクロスリファレンスを更新
- 検証レポート用のスクリーンショット取得ポイントを最新に保つ
- すべてのコマンドがテストされ、動作することを確認

### セキュリティに関する考慮事項

- **実際の認証情報は絶対にコミットしない** - プレースホルダー値のみ使用
- **すべての脆弱性は意図的なもの** - Wiz検出機能のテスト用
- **この環境を本番システムから隔離する**
- **誤って公開しないよう、検証用の専用AWSアカウントを使用する**

## ファイル命名規則

- `SXX-name.md`: 詳細なステップバイステップのシナリオドキュメント（XX = 01-11）
- `README.md`: 各Phaseの概要とナビゲーション
- ファイル名は日本語プロジェクト規則に従い、英語の説明的な名前を使用

## 作業時の注意事項

### ドキュメント作成・編集時

1. **日本語で記述**: すべてのドキュメントは日本語で記述してください
2. **コメントも日本語**: コード例内のコメントも日本語で記述してください
3. **一貫性の維持**: 既存のドキュメントスタイルと用語を統一してください
4. **実行可能性の確保**: 記載されたコマンドは実際に動作することを確認してください

### コード作成時

1. **意図的な脆弱性**: テスト用の脆弱性は明確にコメントで示してください
2. **本番使用禁止**: コードには「本番環境では使用しないでください」という警告を含めてください
3. **わかりやすい例**: 検証目的が明確にわかる例を提供してください

### 新しいシナリオ追加時

1. **SCENARIO_MAP.md更新**: 新シナリオを追加したら必ず更新してください
2. **README.md更新**: ルートREADMEとPhase READMEの両方を更新してください
3. **テンプレート使用**: 既存のシナリオドキュメントをテンプレートとして使用してください

## Claude Codeとして作業する際のベストプラクティス

1. **ファイルを読んでから編集**: 既存ファイルを編集する前に必ずReadツールで内容を確認
2. **日本語で応答**: ユーザーとのコミュニケーションは日本語で行う
3. **絵文字は使用しない**: ユーザーから明示的に要求されない限り使用しない
4. **段階的な作業**: 大きなタスクは小さなステップに分割して実行
5. **検証の実施**: ドキュメントに記載したコマンドが実際に動作するか確認

## プロジェクトの目標

このプロジェクトは、TIS株式会社において以下の目的で使用されます:

1. **Wiz Code機能の包括的な検証**
2. **顧客デモンストレーション用の実証環境**
3. **社内でのベストプラクティス共有**
4. **提案資料のためのエビデンス収集**

このプロジェクトは、Wizセキュリティ機能の顧客デモンストレーション資料と検証環境の両方として機能します。

## 参考資料

- [Wiz公式ドキュメント](https://docs.wiz.io/)
- [Wiz Code Documentation](https://docs.wiz.io/wiz-docs/docs/wiz-code)
- [Wiz CLI Reference](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [GitHub Actions連携ガイド](https://docs.wiz.io/wiz-docs/docs/github-actions-integration)

---

*本プロジェクトは、TIS株式会社におけるWiz Code検証プロジェクトの一環として作成されました。*
