# S04: Wiz IaCスキャン検証手順書

このドキュメントは、Wiz CLIを使用してTerraform IaCスキャンの検証を実施する手順を説明します。

## 目的

このシナリオでは、以下を検証します：
1. 脆弱なTerraform設定に対するWiz IaCスキャン
2. セキュリティ問題の検出と分類（CRITICAL、HIGH、MEDIUM）
3. 問題を修正した後の再スキャンによる改善確認

## 検証環境

### 前提条件

- Docker Desktop がインストールされている
- Wiz認証情報（`WIZ_CLIENT_ID`、`WIZ_CLIENT_SECRET`）が設定されている
- GitHub Actions ワークフローを実行できる環境

### 必要なツール

```bash
# Docker
docker --version

# Terraform（オプション：ローカル検証用）
terraform --version
```

## 検証手順

### ステップ1: 脆弱なTerraform設定の確認

脆弱なTerraform設定ファイルを確認します：

```bash
# 脆弱な設定ファイルの場所
cd taskflow-app/terraform/environments/vulnerable

# ファイル内容の確認
cat main.tf
```

**含まれている脆弱性（20種類）：**

#### CRITICAL (5件)
1. ハードコードされたDBパスワード（RDS）
2. パブリックアクセス可能なRDS
3. セキュリティグループが全ポートを0.0.0.0/0に開放
4. IAMロールの過度に広範な権限（Action: "*", Resource: "*"）
5. Lambda環境変数に平文のシークレット

#### HIGH (8件)
6. RDS暗号化なし
7. S3パブリックアクセスブロック無効
8. S3暗号化なし
9. EBS暗号化なし
10. SSH/RDPが0.0.0.0/0に開放
11. Elasticsearch暗号化なし
12. ECRがパブリックアクセス可能
13. Lambda環境変数暗号化なし

#### MEDIUM (7件)
14. S3アクセスログなし
15. RDSバックアップなし
16. KMSキーの自動ローテーションなし
17. SNS暗号化なし
18. SQS暗号化なし
19. ELBログなし
20. ECRイメージスキャン無効

### ステップ2: Wiz IaCスキャンの実行

#### 方法1: GitHub Actionsワークフローを使用（推奨）

1. **変更をコミットしてプッシュ**

```bash
# 現在のブランチを確認
git branch

# 変更をステージング
git add taskflow-app/terraform/environments/vulnerable/main.tf

# コミット
git commit -m "S04: 脆弱なTerraform設定を更新（検証用）

- 15種類の脆弱性を追加
- IAMロール、Lambda、KMS、SNS、SQS、ALB、Elasticsearch、ECR の設定を追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# プッシュ
git push origin feature/test-s02-wiz-scan-verification
```

2. **ワークフローを手動実行**

```bash
# GitHub CLIを使用してワークフローを実行
gh workflow run "S04 - Wiz IaC Scan"

# または、GitHub UIから実行:
# Actions > S04 - Wiz IaC Scan > Run workflow
```

3. **実行状況を確認**

```bash
# ワークフローの実行状況を確認
gh run list --workflow="S04 - Wiz IaC Scan"

# ログを確認
gh run view --log
```

#### 方法2: Wiz CLIを直接実行（ローカル検証）

```bash
# Wiz CLIイメージを取得
docker pull public-registry.wiz.io/wiz-app/wizcli:1
docker tag public-registry.wiz.io/wiz-app/wizcli:1 wizcli:latest

# Wiz認証
docker run --rm \
  -e WIZ_CLIENT_ID="$WIZ_CLIENT_ID" \
  -e WIZ_CLIENT_SECRET="$WIZ_CLIENT_SECRET" \
  wizcli:latest auth

# 脆弱なTerraform設定をスキャン
docker run --rm \
  -e WIZ_CLIENT_ID="$WIZ_CLIENT_ID" \
  -e WIZ_CLIENT_SECRET="$WIZ_CLIENT_SECRET" \
  --mount type=bind,src="$(pwd)",dst=/scan \
  wizcli:latest iac scan \
  --path /scan/taskflow-app/terraform/environments/vulnerable \
  --name "terraform-vulnerable-local" \
  --tag "environment=vulnerable" \
  --tag "purpose=security-testing" \
  --output /scan/vulnerable-iac-results.sarif,sarif \
  --output /scan/vulnerable-iac-results.json,json \
  --policy-hits-only
```

### ステップ3: スキャン結果の確認

#### GitHub Securityタブで確認

1. GitHubリポジトリにアクセス
2. **Security** タブをクリック
3. **Code scanning alerts** を選択
4. カテゴリ `wiz-iac-vulnerable` でフィルタリング
5. 検出された脆弱性を確認

#### Wizコンソールで確認

1. [Wiz Console](https://app.wiz.io/) にログイン
2. **Code** > **IaC Scans** に移動
3. スキャン名 `terraform-vulnerable-*` で検索
4. 検出された問題の詳細を確認：
   - 問題の種類
   - 重要度（CRITICAL、HIGH、MEDIUM）
   - 影響を受けるリソース
   - 修正方法の推奨事項

#### ローカルで結果ファイルを確認

```bash
# SARIF形式の結果を確認
cat vulnerable-iac-results.sarif | jq '.'

# JSON形式の結果を確認
cat vulnerable-iac-results.json | jq '.'

# 検出された問題の数を確認
cat vulnerable-iac-results.json | jq '.summary'
```

### ステップ4: 脆弱性の修正

修正済みのTerraform設定ファイルを確認します：

```bash
# 修正版ファイルの場所
cd verification-samples/s04-wiz-iac-verification

# 修正内容を確認
cat main-fixed.tf
```

**主な修正内容：**

1. **RDS**
   - ランダムパスワード生成を使用
   - `publicly_accessible = false` に変更
   - `storage_encrypted = true` に設定
   - バックアップ保持期間を7日に設定
   - CloudWatchログ出力を有効化

2. **S3**
   - パブリックアクセスブロックを全て有効化
   - KMS暗号化を設定
   - アクセスログを有効化
   - バージョニングを有効化

3. **セキュリティグループ**
   - CIDRを特定のネットワークに制限（0.0.0.0/0を削除）
   - 必要なポートのみ開放（全ポート開放を削除）
   - SSHアクセスをBastion用サブネットのみに制限

4. **EBS**
   - `encrypted = true` に設定
   - KMSキーを指定

5. **IAM**
   - 特定のサービス（Lambda）のみに引き受けポリシーを制限
   - 最小権限の原則に従ったポリシー設定

6. **Lambda**
   - 環境変数からシークレットを削除
   - Secrets Managerを使用
   - KMS暗号化を設定

7. **KMS**
   - 自動ローテーションを有効化

8. **SNS/SQS**
   - KMS暗号化を設定

9. **ALB**
   - 内部ALBに変更
   - アクセスログを有効化
   - 削除保護を有効化

10. **Elasticsearch**
    - 保存時の暗号化を有効化
    - ノード間暗号化を有効化
    - HTTPSを強制

11. **ECR**
    - イメージタグを不変に設定
    - プッシュ時のスキャンを有効化
    - KMS暗号化を設定
    - アクセスを特定のアカウントに制限

### ステップ5: 修正版のスキャン実行

修正版Terraform設定をスキャンして、問題が解消されたことを確認します：

```bash
# 修正版ファイルをスキャン
docker run --rm \
  -e WIZ_CLIENT_ID="$WIZ_CLIENT_ID" \
  -e WIZ_CLIENT_SECRET="$WIZ_CLIENT_SECRET" \
  --mount type=bind,src="$(pwd)",dst=/scan \
  wizcli:latest iac scan \
  --path /scan/verification-samples/s04-wiz-iac-verification \
  --name "terraform-fixed-local" \
  --tag "environment=secure" \
  --tag "purpose=security-testing" \
  --tag "status=fixed" \
  --output /scan/fixed-iac-results.sarif,sarif \
  --output /scan/fixed-iac-results.json,json \
  --policy-hits-only
```

### ステップ6: 修正前後の比較

```bash
# 修正前の問題数を確認
echo "=== 修正前（Vulnerable） ==="
cat vulnerable-iac-results.json | jq '.summary'

# 修正後の問題数を確認
echo "=== 修正後（Fixed） ==="
cat fixed-iac-results.json | jq '.summary'

# 差分を比較
echo "=== 改善された問題 ==="
# 検出された問題の種類を比較
```

## 期待される結果

### 修正前（Vulnerable）

- **CRITICAL**: 5件以上
- **HIGH**: 8件以上
- **MEDIUM**: 7件以上
- **合計**: 20件以上の問題が検出される

### 修正後（Fixed）

- **CRITICAL**: 0件
- **HIGH**: 0件
- **MEDIUM**: 0件（または最小限）
- **合計**: 大幅に削減または0件

## トラブルシューティング

### 問題: Wiz CLIの認証に失敗する

```bash
# 環境変数を確認
echo $WIZ_CLIENT_ID
echo $WIZ_CLIENT_SECRET

# 認証情報が正しいか確認
docker run --rm \
  -e WIZ_CLIENT_ID="$WIZ_CLIENT_ID" \
  -e WIZ_CLIENT_SECRET="$WIZ_CLIENT_SECRET" \
  wizcli:latest auth
```

### 問題: スキャン結果が期待と異なる

```bash
# ポリシー設定を確認
# Wizコンソールで IaC ポリシーを確認してください

# スキャン対象のファイルを確認
ls -la taskflow-app/terraform/environments/vulnerable/
```

### 問題: GitHub Actionsワークフローが失敗する

```bash
# ワークフローログを確認
gh run view --log

# シークレットが設定されているか確認
# Settings > Secrets and variables > Actions
# WIZ_CLIENT_ID と WIZ_CLIENT_SECRET が設定されているか確認
```

## エビデンス保存

検証結果は以下の場所に保存されます：

```bash
# GitHub Actionsの場合
evidence/phase1/S04/
  ├── vulnerable-iac-results.sarif
  └── vulnerable-iac-results.json

# Artifactとしても保存される
# Actions > ワークフロー実行 > Artifacts からダウンロード可能
```

## 次のステップ

1. 検出された問題をWizコンソールで詳細確認
2. 修正の優先順位を決定
3. S05（シークレット検出）の検証に進む

## 参考資料

- [Wiz IaC Scanning Documentation](https://docs.wiz.io/wiz-docs/docs/iac-scanning)
- [Terraform Security Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [AWS Well-Architected Framework - Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)

---

**検証完了チェックリスト：**

- [ ] 脆弱なTerraform設定ファイルを確認
- [ ] Wiz IaCスキャンを実行
- [ ] GitHub Securityタブで結果を確認
- [ ] Wizコンソールで詳細を確認
- [ ] 修正版Terraform設定を確認
- [ ] 修正版のスキャンを実行
- [ ] 修正前後の比較を実施
- [ ] エビデンスを保存
- [ ] 検証レポートを作成
