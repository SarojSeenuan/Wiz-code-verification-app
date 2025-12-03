# シナリオ11: AWS Inspector vs Wiz Code 比較検証

## 📋 シナリオ概要

### 目的
同一のAWS ECS環境でAWS InspectorとWiz Codeを並行実行し、脆弱性検出能力、SBOM生成能力、Code-to-Cloud追跡能力を定量的に比較します。

### 検証内容
- ✅ 脆弱性検出数の比較
- ✅ SBOM生成の有無
- ✅ Code-to-Cloudトレーサビリティの有無
- ✅ スキャン速度の比較
- ✅ 誤検知率（False Positive）の比較

---

## ⏱️ 所要時間

| フェーズ | 所要時間 |
|---------|---------|
| **AWS Inspector有効化** | 15分 |
| **比較データ収集** | 30-40分 |
| **レポート作成** | 30分 |

---

## 📋 前提条件

### ✅ 必須要件
- [x] **Phase 2完了**: S06-S09まで完了
- [x] **ECS実行中**: taskflow-backend, frontendサービスが稼働中
- [x] **Wiz Code**: 既にスキャン完了済み

---

## 🔧 手順1: AWS Inspectorの有効化

### 1.1 Inspector v2を有効化

```bash
# AWS CLIでInspectorを有効化
aws inspector2 enable \
  --resource-types ECR EC2 \
  --region ap-northeast-1
```

### 1.2 ECRイメージのスキャン

```bash
# ECRリポジトリでスキャンを有効化（既に自動スキャン設定済みの場合はスキップ）
aws ecr put-image-scanning-configuration \
  --repository-name taskflow-backend \
  --image-scanning-configuration scanOnPush=true \
  --region ap-northeast-1

aws ecr put-image-scanning-configuration \
  --repository-name taskflow-frontend \
  --image-scanning-configuration scanOnPush=true \
  --region ap-northeast-1
```

---

## 🔧 手順2: スキャン結果の収集

### 2.1 AWS Inspectorの結果確認

```bash
# Inspectorの検出結果を取得
aws inspector2 list-findings \
  --filter-criteria '{"resourceType":[{"comparison":"EQUALS","value":"AWS_ECR_CONTAINER_IMAGE"}]}' \
  --region ap-northeast-1 \
  > inspector-findings.json

# サマリー確認
cat inspector-findings.json | jq '.findings | length'
cat inspector-findings.json | jq '[.findings[].severity] | group_by(.) | map({severity: .[0], count: length})'

# SBOM エクスポート（S3バケットが必要）
aws inspector2 create-sbom-export \
  --report-format CYCLONEDX_1_4 \
  --s3-destination bucketName=wiz-verification-sbom,keyPrefix=inspector/ \
  --region ap-northeast-1

# エクスポート状況確認
aws inspector2 list-sbom-exports \
  --region ap-northeast-1
```

### 2.2 Wizの結果確認

```
Wizコンソール > Code > Container Images > taskflow-backend

確認項目:
- 脆弱性総数
- Critical/High/Medium/Low別の数
- SBOM有無
- Code-to-Cloudリンク有無
```

---

## 📊 比較結果のまとめ

### 3.1 定量比較表

| 比較項目 | AWS Inspector | Wiz Code | Wiz優位性 |
|---------|--------------|----------|-----------|
| **脆弱性検出数** | 例: 38個 | 例: 45個 | +18% |
| **SBOM生成** | ✅ CycloneDX/SPDX (S3出力) | ✅ CycloneDX/SPDX (直接出力) | **直接出力で使いやすい** |
| **Code-to-Cloud** | ❌ なし | ✅ GitHubリンク | Wizのみ |
| **スキャン速度** | 10-15分 | 2-5分 | **3倍高速** |
| **False Positive** | 例: 15% | 例: 5% | **低い** |
| **コスト** | $0.09/image/month | Wizライセンス | - |

### 3.2 機能比較表

| 機能 | AWS Inspector | Wiz Code |
|-----|--------------|----------|
| **コンテナスキャン** | ✅ ECRのみ | ✅ ECR, Docker Hub, 他 |
| **ソースコードスキャン** | ❌ | ✅ |
| **IaCスキャン** | ❌ | ✅ Terraform, CloudFormation |
| **シークレット検出** | ❌ | ✅ |
| **ランタイム優先順位付け** | ❌ | ✅ 実行中コンテナを優先 |
| **Drift検出** | ❌ | ✅ |
| **GitHub統合** | ❌ | ✅ PR Comments, Actions |
| **VSCode統合** | ❌ | ✅ |

---

## 🔧 手順3: エビデンス収集

### 3.1 スクリーンショット取得

```
1. AWS Inspectorコンソール - 脆弱性一覧
2. Wizコンソール - 脆弱性一覧
3. Wiz SBOM画面
4. Wiz Code-to-Cloudリンク画面
```

### 3.2 レポート作成

```bash
mkdir -p ~/WizCodeVerification/evidence/phase3/S11-comparison

# 比較レポートを作成
cat > ~/WizCodeVerification/evidence/phase3/S11-comparison/comparison-report.md << 'EOF'
# AWS Inspector vs Wiz Code 比較レポート

## 実施日時
2025-12-03

## 対象環境
- ECS Cluster: taskflow-dev-cluster
- ECR Images: taskflow-backend, taskflow-frontend

## 脆弱性検出数
- AWS Inspector: 38個（Critical: 5, High: 12, Medium: 15, Low: 6）
- Wiz Code: 45個（Critical: 6, High: 14, Medium: 18, Low: 7）

## Wizの優位性
1. SBOM生成機能が直接出力で使いやすい（Inspector はS3経由）
2. Code-to-Cloud追跡あり
3. 検出数が18%多い
4. スキャン速度が3倍速い
5. False Positiveが低い
6. シークレット検出、IaCスキャン等の追加機能

## 結論
両ツールともSBOM生成機能を持つが、Wiz Codeは直接出力で使いやすく、
Code-to-Cloud、シークレット検出、IaCスキャン等の包括的な機能を提供。
EOF
```

---

## ✅ 検証完了チェックリスト

- [ ] **Inspector有効化**: AWS Inspector v2を有効化した
- [ ] **スキャン実行**: 両方のツールでスキャンを実行した
- [ ] **結果収集**: 脆弱性検出数を集計した
- [ ] **機能比較**: SBOM、Code-to-Cloud等を比較した
- [ ] **レポート作成**: 比較レポートを作成した

---

## 🎯 全シナリオ完了

**おめでとうございます！** S01-S11のすべてのシナリオが完了しました。

次のステップ:
1. [EVIDENCE_COLLECTION_GUIDE.md](../guides/EVIDENCE_COLLECTION_GUIDE.md)で全エビデンスを整理
2. AWS環境のクリーンアップ（[AWS_DEPLOYMENT_GUIDE](../guides/AWS_DEPLOYMENT_GUIDE.md)参照）
3. 顧客デモ資料の作成

---

**✅ 全Phase検証完了**: Wiz Codeの包括的な検証が完了しました！
