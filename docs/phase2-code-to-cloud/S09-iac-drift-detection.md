# シナリオ9: IaC Drift検出とコード追跡

## 📋 シナリオ概要

### 目的
AWS環境で手動で行われた設定変更（Drift）を検出し、TerraformコードとのDriftを明確にし、コードとインフラの一貫性を保つ能力を検証します。

### 検証内容
- ✅ TerraformとAWS実環境の差分検出
- ✅ 手動変更の特定
- ✅ Driftの可視化
- ✅ コードへの反映または手動変更の修正

---

## ⏱️ 所要時間

| フェーズ | 所要時間 |
|---------|---------|
| **Drift作成と検出** | 15-20分 |

---

## 📋 前提条件

### ✅ 必須要件
- [x] **S04完了**: TerraformコードがWizでスキャン済み
- [x] **AWS環境デプロイ**: Terraform Apply完了済み

---

## 🔧 手順1: 意図的なDriftの作成

### 1.1 AWS環境を手動変更

```bash
# セキュリティグループルールを手動追加
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0

# タグを手動変更
aws ec2 create-tags \
  --resources <resource-id> \
  --tags Key=Environment,Value=production-manual
```

---

## 🔧 手順2: WizでのDrift検出

### 2.1 Drift Detection実行

```
Wizコンソール > Code > IaC Drift Detection

確認項目:
✅ Detected Drifts: 検出された差分の数
✅ Resource Type: VPC, Security Group, EC2等
✅ Drift Type: Added, Modified, Deleted
✅ Terraform Code: 対応するTerraformファイルへのリンク
```

### 2.2 Drift詳細の確認

**期待される検出例**:
```
Drift 1:
- Resource: aws_security_group_rule.alb_http
- Type: Added (in Cloud, not in Code)
- Description: Port 8080 ingress rule added manually
- Action: Remove from Cloud or Add to Code

Drift 2:
- Resource: aws_vpc.main
- Type: Modified
- Property: tags.Environment
- Expected: "dev" (in Code)
- Actual: "production-manual" (in Cloud)
- Action: Update Cloud or Update Code
```

---

## 🔧 手順3: Driftの解消

### 3.1 オプション1: コードに反映

```bash
# Terraformコードを更新
cd ~/WizCodeVerification/taskflow-app/terraform/environments/dev

# security.tfに追加
cat >> security.tf << 'EOF'
resource "aws_security_group_rule" "alb_http_8080" {
  type              = "ingress"
  from_port         = 8080
  to_port           = 8080
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}
EOF

# Apply
terraform plan
terraform apply
```

### 3.2 オプション2: 手動変更を削除

```bash
# 手動追加したルールを削除
aws ec2 revoke-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0

# タグを修正
aws ec2 create-tags \
  --resources <resource-id> \
  --tags Key=Environment,Value=dev
```

---

## ✅ 検証完了チェックリスト

- [ ] **Drift作成**: AWS環境を手動変更した
- [ ] **Drift検出**: WizがTerraformとの差分を検出した
- [ ] **Drift詳細**: 変更内容とTerraformコードへのリンクが確認できた
- [ ] **Drift解消**: コードまたは環境を修正してDriftを解消した

---

## 🎯 次のステップ

- [S10: インシデント対応フロー](../phase3-integration/S10-incident-response.md) - Phase 3へ

---

**✅ S09検証完了**: IaC Drift検出が確認できました。
