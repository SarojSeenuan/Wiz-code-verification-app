# S09: IaC Drift検出とコード追跡

## 概要

クラウド環境で行われた手動変更（Drift）を検出し、IaCコード（Terraform）との差分を明確にできることを確認します。設定の乖離を早期に発見し、コードとインフラの一貫性を保つことを検証します。

## 検証目的

- Terraformでデプロイされたリソースの手動変更を検出
- IaCコードとの差分を可視化
- セキュリティリスクの高いDriftを特定
- 対応するTerraformコードの特定

## 前提条件

### 必要な環境
- Terraformで管理されているAWSリソース
- Wiz Cloud有効化
- AWS Connector設定済み

### 必須ツール
- Terraform 1.6+
- AWS CLI v2
- Wiz CLI

## 検証手順

### Step 1: Terraformでインフラをデプロイ

```hcl
# terraform/main.tf - 初期状態（セキュアな設定）

resource "aws_s3_bucket" "app_data" {
  bucket = "taskflow-app-data-${random_string.suffix.result}"

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
    Purpose     = "Application Data"
  }
}

# セキュアな設定: パブリックアクセスブロック
resource "aws_s3_bucket_public_access_block" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# セキュリティグループ（最小権限）
resource "aws_security_group" "app_sg" {
  name        = "taskflow-app-sg"
  description = "Security group for taskflow application"
  vpc_id      = aws_vpc.main.id

  # HTTPSのみ許可（特定IPから）
  ingress {
    description = "HTTPS from corporate network"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    description = "Allow HTTPS outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "taskflow-app-sg"
    ManagedBy = "Terraform"
  }
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
```

```bash
# Terraform適用
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# デプロイ後の状態を保存（比較用）
terraform show -json > terraform-initial-state.json
```

### Step 2: AWSコンソールから手動変更を実施

意図的にDriftを発生させます:

**変更1: S3バケットのパブリックアクセスブロックを無効化**

```bash
# AWSコンソールまたはCLIで実行
aws s3api delete-public-access-block \
  --bucket taskflow-app-data-xxxxx
```

**変更2: セキュリティグループに危険なルールを追加**

```bash
# 全ポート開放ルールを追加
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 0-65535 \
  --cidr 0.0.0.0/0
```

**変更3: S3バケットの暗号化を無効化**

```bash
# 暗号化設定を削除
aws s3api delete-bucket-encryption \
  --bucket taskflow-app-data-xxxxx
```

**変更4: タグの削除・変更**

```bash
# Terraform管理タグを削除
aws s3api delete-bucket-tagging \
  --bucket taskflow-app-data-xxxxx
```

### Step 3: Wiz CloudでDrift検出

1. **Wiz Console → Inventory → Cloud Resources**
2. **Driftフィルターを適用**
   - **Configuration Drift**: チェック
3. **taskflow-app-data** S3バケットを検索
4. **Drift Details** タブを確認

**検出されるべきDrift**:

| リソース | 変更内容 | リスクレベル |
|---------|---------|------------|
| S3バケット | パブリックアクセスブロック無効化 | CRITICAL |
| S3バケット | 暗号化設定削除 | HIGH |
| セキュリティグループ | 全ポート開放（0.0.0.0/0） | CRITICAL |
| S3バケット | 管理タグ削除 | MEDIUM |

### Step 4: Terraformコードとの差分確認

Wiz Consoleで表示される差分:

```diff
# S3 Public Access Block
- block_public_acls       = true
+ block_public_acls       = false (DRIFT DETECTED)

- block_public_policy     = true
+ block_public_policy     = false (DRIFT DETECTED)

# S3 Encryption
- sse_algorithm = "AES256"
+ sse_algorithm = null (DRIFT DETECTED)

# Security Group Ingress Rules
  ingress {
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["10.0.0.0/8"]
  }

+ ingress {
+   from_port   = 0
+   to_port     = 65535
+   cidr_blocks = ["0.0.0.0/0"]  # ← 手動で追加された危険なルール
+ }
```

### Step 5: Wiz CLIでのDrift検出（オプション）

```bash
# Wiz CLIでDrift検出（将来の機能として）
wizcli iac drift \
  --terraform-state terraform.tfstate \
  --aws-region us-east-1

# または、Terraformとの統合
terraform plan -detailed-exitcode

# 差分があれば終了コード2を返す
if [ $? -eq 2 ]; then
  echo "Drift detected! Running Wiz analysis..."
  wizcli iac scan --path .
fi
```

### Step 6: Drift修正の選択肢

**オプション1: 手動変更を元に戻す（推奨）**

```bash
# Terraformで元の状態に戻す
terraform apply

# これにより:
# - S3パブリックアクセスブロックが再有効化
# - 暗号化が再設定
# - セキュリティグループの不正なルールが削除
# - タグが復元
```

**オプション2: 手動変更をTerraformに反映**

意図的な変更だった場合、Terraformコードを更新:

```hcl
# terraform/main.tf - 手動変更を反映（非推奨の例）

resource "aws_s3_bucket_public_access_block" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  # 手動変更を正式に反映（要承認）
  block_public_acls       = false  # 変更理由をコメント
  block_public_policy     = false  # 承認者: John Doe, 2024-01-15
  ignore_public_acls      = false
  restrict_public_buckets = false
}
```

```bash
# コードの変更をコミット
git add terraform/main.tf
git commit -m "Update S3 public access settings (approved by security team)"
git push

# 再度apply
terraform apply
```

### Step 7: CI/CDでのDrift検出自動化

```yaml
# .github/workflows/terraform-drift-detection.yml
name: Terraform Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # 6時間ごとに実行
  workflow_dispatch:

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      issues: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: ./terraform
        run: terraform init

      - name: Terraform Plan
        id: plan
        working-directory: ./terraform
        run: |
          terraform plan -detailed-exitcode -no-color -out=tfplan
        continue-on-error: true

      - name: Check for drift
        if: steps.plan.outputs.exitcode == '2'
        run: |
          echo "⚠️ Configuration drift detected!"
          terraform show tfplan > drift-details.txt

      - name: Create GitHub Issue for drift
        if: steps.plan.outputs.exitcode == '2'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const drift = fs.readFileSync('drift-details.txt', 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Infrastructure Drift Detected',
              body: `## Configuration Drift Detected\n\nAutomated drift detection found differences between Terraform code and AWS infrastructure.\n\n### Drift Details\n\`\`\`\n${drift}\n\`\`\`\n\n### Actions Required\n1. Review the drift details above\n2. Determine if changes were intentional\n3. Either:\n   - Run \`terraform apply\` to restore infrastructure to code state\n   - Update Terraform code to reflect intentional changes\n\n**Detection Time**: ${new Date().toISOString()}`,
              labels: ['infrastructure', 'drift', 'security']
            });
```

## 期待される結果

### Drift検出

| 変更内容 | 検出 | 重大度 | 推奨アクション |
|---------|------|--------|--------------|
| S3パブリックアクセス無効化 | ✅ | CRITICAL | 即座に修正 |
| 暗号化削除 | ✅ | HIGH | 即座に修正 |
| セキュリティグループ開放 | ✅ | CRITICAL | 即座に修正 |
| タグ削除 | ✅ | MEDIUM | 計画的に修正 |

### 可視化

- Wiz Consoleで差分が視覚的に表示される
- 対応するTerraformコードが特定される
- Driftの履歴がタイムラインで確認できる

## 検証ポイント

- [ ] 手動変更（Drift）が検出される
- [ ] 変更内容が具体的に表示される
- [ ] 対応するTerraformコードが特定される
- [ ] セキュリティリスクの高いDriftが優先表示される
- [ ] 修正方法が明確に提示される
- [ ] CI/CDでの自動検出が機能する

## トラブルシューティング

### 問題: Driftが検出されない

```bash
# Wiz Cloudのスキャン状態を確認
# Wiz Console → Settings → Connectors → AWS

# Terraformバックエンドの確認
terraform state list
terraform state show <resource>

# AWSリソースの実際の状態を確認
aws s3api get-public-access-block --bucket <bucket-name>
```

### 問題: 誤検知が多い

Terraformの`lifecycle`ブロックで特定のフィールドを無視:

```hcl
resource "aws_s3_bucket" "app_data" {
  # ...

  lifecycle {
    ignore_changes = [
      tags["LastModified"],  # 自動更新されるタグを無視
    ]
  }
}
```

## 関連シナリオ

- [S04: IaCスキャン](../phase1-shift-left/S04-iac-scanning.md)
- [S07: コンテナトレーサビリティ](S07-container-traceability.md)

## 参考資料

- [Wiz IaC Drift Detection](https://docs.wiz.io/wiz-docs/docs/iac-drift)
- [Terraform State Management](https://www.terraform.io/docs/language/state/index.html)
- [AWS Config Rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html)
