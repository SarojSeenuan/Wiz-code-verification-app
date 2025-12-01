# Phase 2: Code-to-Cloud トレーサビリティの検証

## 概要

Phase 2では、デプロイされたクラウドリソースをソースコードまで遡り、影響範囲を特定する「Code-to-Cloud トレーサビリティ」機能を検証します。ランタイム環境で検出された問題を、どのコード変更が原因かまで追跡できることがポイントです。

## コンセプト

従来のセキュリティツールは、「コード内の脆弱性」と「実行環境の脆弱性」を別々に管理していました。Wiz Codeは、この2つを統合し、実行中のワークロードに存在する脆弱性をソースコードまで追跡することで、真に対処が必要な問題を特定します。

### Code-to-Cloud の利点

1. **影響範囲の即座の特定**: 新たな脆弱性が公開された際、影響を受けるリソースを数分で特定
2. **優先順位の最適化**: 実際に実行中のコードの脆弱性を優先的に対応
3. **迅速な修正**: ソースコードまで遡れるため、修正が迅速
4. **監査証跡**: デプロイされたすべてのリソースの出自を追跡可能

## シナリオ一覧

### [S06: SBOM生成と追跡](S06-sbom-tracking.md)
Software Bill of Materials（SBOM）を生成し、依存関係の脆弱性をソースからイメージまで追跡できることを確認します。

**検証項目**
- SBOMの自動生成（CycloneDX、SPDX形式）
- 依存関係の脆弱性検出
- ソースコード → ビルド → イメージの追跡
- SBOMのWizコンソールでの可視化

### [S07: コンテナトレーサビリティ](S07-container-traceability.md)
AWS ECS/EKSにデプロイされたコンテナを、ソースコードまで遡って追跡できることを確認します。

**検証項目**
- コンテナのデプロイとWiz Cloud検出
- コンテナ → ECRイメージ → ビルド → ソースコードの追跡
- Wiz Security Graphでの可視化
- CI/CDパイプラインとの紐付け

### [S08: ランタイム脆弱性の優先順位付け](S08-runtime-prioritization.md)
実行中のワークロードに存在する脆弱性を優先順位付けし、実際に影響のある脆弱性に集中できることを確認します。

**検証項目**
- ランタイム脆弱性の検出
- 「実行中」vs「未使用」パッケージの区別
- 露出度・権限・悪用可能性による優先順位付け
- 脆弱性からソースコードへの紐付け

### [S09: IaC Drift検出とコード追跡](S09-iac-drift-detection.md)
クラウド環境で行われた手動変更（Drift）を検出し、IaCコードとの差分を明確にできることを確認します。

**検証項目**
- Terraformでのインフラデプロイ
- AWSコンソールからの手動変更実施
- Driftの自動検出
- Terraformコードとの差分可視化

## 成功基準

Phase 2のすべてのシナリオで以下が達成されること:

1. **完全な追跡**: デプロイされたリソースからソースコードまで完全に追跡可能
2. **精度**: 追跡情報が正確で、誤った紐付けがない
3. **可視化**: Wiz Security Graphで関係性が視覚的に理解できる
4. **優先順位付け**: 実行中の脆弱性が適切に優先表示される
5. **Drift検出**: 手動変更が確実に検出され、差分が明確

## 実行順序

Phase 2のシナリオは以下の順序で実行することを推奨します:

1. S06（SBOM生成）- 依存関係の可視化基盤
2. S07（コンテナトレーサビリティ）- デプロイから追跡まで
3. S08（ランタイム優先順位付け）- 実行中の脆弱性分析
4. S09（IaC Drift検出）- 設定変更の追跡

## 前提条件

Phase 2の検証を開始する前に、以下が必要です:

### AWS環境
- AWS アカウント
- ECS または EKS クラスターの構築権限
- ECR（Elastic Container Registry）へのアクセス
- Terraform実行環境

### Wiz設定
- Wiz Cloud有効化
- AWS Connectorの設定完了
- Wiz Sensorのデプロイ（ECS/EKS）
- Code-to-Cloud連携有効化

### CI/CD
- GitHub Actions設定済み
- AWS OIDC連携設定
- ECRへのプッシュ権限

### 必須ツール
- Docker Desktop
- kubectl（EKS使用時）
- AWS CLI v2
- Terraform 1.6+
- Wiz CLI

### 環境変数
```bash
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
export AWS_ACCOUNT_ID="your_aws_account"
export AWS_REGION="us-east-1"
```

## アーキテクチャ概要

```
┌─────────────────┐
│  GitHub Repo    │
│  (Source Code)  │
└────────┬────────┘
         │
         │ git push
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  - Build        │◄──── Wiz CLI Scan
│  - Test         │       ├ SBOM生成
│  - Scan         │       ├ 脆弱性検出
│  - Push to ECR  │       └ メタデータタグ付け
└────────┬────────┘
         │
         │ docker push
         │
         ▼
┌─────────────────┐
│  Amazon ECR     │◄──── Wiz Cloud Scan
│  (Images)       │       └ イメージ分析
└────────┬────────┘
         │
         │ deploy
         │
         ▼
┌─────────────────┐
│  ECS / EKS      │◄──── Wiz Sensor
│  (Runtime)      │       ├ ランタイム分析
│                 │       ├ 実行中パッケージ検出
│                 │       └ ネットワーク露出分析
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│  Wiz Cloud      │
│  Security Graph │
│                 │
│  - Source Code  │
│  - CI/CD Build  │
│  - Container    │
│  - Runtime      │
│  - Vulnerabilities
└─────────────────┘
```

## Phase 1との連携

Phase 1で実装したシフトレフト機能により、開発段階で多くの脆弱性が検出・修正されます。Phase 2では、それでもデプロイされた環境に残存する脆弱性や、新たに公開された脆弱性に対して、迅速に対応するための追跡機能を検証します。

## Phase 3への接続

Phase 2で構築したCode-to-Cloud追跡機能を活用し、Phase 3では実際のインシデント対応フローと他ツールとの比較を実施します。

## トレーサビリティの仕組み

### メタデータタグ付け

CI/CDパイプラインでコンテナイメージをビルドする際、以下のメタデータを付与します:

```bash
wizcli docker tag \
  --image $ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \
  --source-repo "$GITHUB_REPOSITORY" \
  --source-branch "$GITHUB_REF_NAME" \
  --source-commit "$GITHUB_SHA" \
  --ci-build-id "$GITHUB_RUN_ID"
```

### Security Graph

Wizは以下の情報を統合してSecurity Graphを構築します:

1. **ソースコード**: GitHubリポジトリ、ブランチ、コミットSHA
2. **CI/CDビルド**: GitHub Actions Run ID、ビルド時刻
3. **コンテナイメージ**: ECRイメージタグ、レイヤー情報、SBOM
4. **ランタイム**: ECS/EKSのタスク/Pod、実行中のプロセス
5. **脆弱性**: CVE ID、影響を受けるパッケージ、修正バージョン

## 検証データの収集

各シナリオで以下のエビデンスを収集します:

1. **スクリーンショット**
   - Wiz Security Graphの表示
   - トレーサビリティパスの確認
   - 脆弱性の優先順位表示

2. **レポート**
   - SBOMファイル（JSON/XML）
   - スキャン結果（SARIF形式）
   - Drift検出レポート

3. **ログ**
   - CI/CDパイプライン実行ログ
   - Wiz CLIスキャンログ
   - デプロイログ

## 参考資料

- [Wiz Code-to-Cloud Traceability](https://docs.wiz.io/wiz-docs/docs/code-to-cloud)
- [Wiz Security Graph](https://docs.wiz.io/wiz-docs/docs/security-graph)
- [SBOM生成ガイド](https://docs.wiz.io/wiz-docs/docs/sbom-generation)
- [Wiz Sensor デプロイガイド](https://docs.wiz.io/wiz-docs/docs/sensor-deployment)
- [AWS ECS/EKS連携](https://docs.wiz.io/wiz-docs/docs/aws-ecs-eks-integration)
