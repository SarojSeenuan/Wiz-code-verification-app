# Terraform Infrastructure as Code

このディレクトリには、TaskFlowアプリケーションのAWSインフラストラクチャを定義するTerraformコードが含まれています。

## 概要

Wiz Code検証プロジェクトの一環として、意図的なセキュリティ設定ミスを含むTerraform構成を用意しています。

## ディレクトリ構造

```
terraform/
├── environments/      # 環境別設定
│   ├── dev/          # 開発環境
│   ├── prod/         # 本番環境
│   └── vulnerable/   # 検証用（意図的な脆弱性を含む）
└── modules/          # 再利用可能なモジュール
    ├── ecs/          # ECSクラスターとサービス
    ├── rds/          # RDSデータベース
    ├── ecr/          # ECRリポジトリ
    └── networking/   # VPC、サブネット、セキュリティグループ
```

## S04検証シナリオ

このTerraformコードは、以下のWiz Code機能を検証するために使用されます：

### 検出される脆弱性

1. **セキュリティグループの設定ミス**
   - 0.0.0.0/0からのポート開放
   - 不要なポートの公開

2. **RDSの設定ミス**
   - 暗号化未設定
   - パブリックアクセス許可
   - バックアップ未設定

3. **S3の設定ミス**
   - パブリックアクセスブロック未設定
   - バージョニング未設定
   - ログ記録未設定

4. **IAMの設定ミス**
   - 過度に広い権限
   - ワイルドカードリソース

## 使用方法

### 初期化

```bash
cd environments/dev
terraform init
```

### プランの確認

```bash
terraform plan
```

### Wizスキャン

```bash
# Docker経由でWiz CLIを使用
docker run --rm \
  -e WIZ_CLIENT_ID="$WIZ_CLIENT_ID" \
  -e WIZ_CLIENT_SECRET="$WIZ_CLIENT_SECRET" \
  --mount type=bind,src="$(pwd)",dst=/scan \
  wizcli:latest iac scan \
  --path /scan \
  --policy-hits-only
```

## 環境

### dev
開発環境用の設定。一部の脆弱性を含みますが、基本的なセキュリティ対策は実装されています。

### prod
本番環境用の設定。セキュリティベストプラクティスに準拠した構成です。

### vulnerable
**検証専用**の環境。意図的に複数のセキュリティ脆弱性を含んでいます。

## 注意事項

⚠️ **警告**: このTerraformコードは検証目的で作成されており、意図的なセキュリティ脆弱性が含まれています。

**本番環境では絶対に使用しないでください。**

## 検証ポイント

- ✅ IaCスキャンによる脆弱性検出
- ✅ ポリシー違反の可視化
- ✅ CI/CDパイプラインでの自動スキャン
- ✅ 修正提案の確認

## 参考資料

- [Wiz IaC Scanning Documentation](https://docs.wiz.io/wiz-docs/docs/iac-scanning)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
