# S11: AWS Inspector vs Wiz比較

## 概要

同一のAWS ECS環境でAWS InspectorとWiz Codeを並行実行し、脆弱性検出能力、SBOM生成能力、Code-to-Cloud追跡能力を定量的に比較します。この比較結果をもとに、TIS顧客へのWiz提案の根拠データを作成します。

## 検証目的

- 脆弱性検出能力の比較（検出数、精度、詳細度）
- SBOM生成能力の比較
- Code-to-Cloud追跡能力の比較
- ユーザビリティの比較
- コスト・運用負荷の比較

## 前提条件

### AWS環境
- 同一のECSクラスター
- 同一のコンテナイメージを使用
- 公平な比較のため条件を統一

### 有効化するツール
1. **AWS Inspector**
   - ECR Scanning有効化
   - ECS Scanning有効化

2. **Wiz Code**
   - AWS Connector設定済み
   - Wiz Sensor デプロイ済み

## 検証手順

### Step 1: テスト用コンテナイメージの準備

意図的に複数の脆弱性を含むイメージを作成:

```dockerfile
# Dockerfile - 比較検証用
FROM node:16.14.0-alpine3.14  # 古いバージョン（脆弱性あり）

WORKDIR /app

# 脆弱性を含むパッケージ
COPY package.json ./
RUN npm install

# アプリケーションコード
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
```

```json
// package.json - 意図的に脆弱なパッケージを含む
{
  "name": "comparison-test-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "4.17.1",        // 古いバージョン
    "lodash": "4.17.19",         // CVE-2020-8203
    "axios": "0.21.1",           // CVE-2021-3749
    "moment": "2.29.1",
    "pg": "8.5.1",
    "jsonwebtoken": "8.5.1",
    "bcrypt": "5.0.0"
  }
}
```

### Step 2: 両ツールの有効化

**AWS Inspector有効化**:

```bash
# ECR Scanningを有効化
aws ecr put-image-scanning-configuration \
  --repository-name comparison-test-app \
  --image-scanning-configuration scanOnPush=true

# Inspector v2を有効化
aws inspector2 enable \
  --resource-types ECR,EC2,ECR_REPOSITORY
```

**Wiz有効化**:
- AWS Connectorは既に設定済み
- Wiz Sensorも既にデプロイ済み

### Step 3: イメージのビルドとプッシュ

```bash
# イメージをビルド
docker build -t $ECR_REGISTRY/comparison-test-app:v1.0 .

# AWS Inspectorでスキャンされるようにプッシュ
docker push $ECR_REGISTRY/comparison-test-app:v1.0

# Wizでスキャン＆メタデータタグ付け
wizcli docker scan --image $ECR_REGISTRY/comparison-test-app:v1.0
wizcli docker tag \
  --image $ECR_REGISTRY/comparison-test-app:v1.0 \
  --source-repo "org/comparison-test" \
  --source-commit "$(git rev-parse HEAD)"

# 再度プッシュ
docker push $ECR_REGISTRY/comparison-test-app:v1.0
```

### Step 4: ECSへのデプロイ

```bash
# ECSタスク定義を登録
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# サービスを作成
aws ecs create-service \
  --cluster comparison-cluster \
  --service-name comparison-test \
  --task-definition comparison-test-app \
  --desired-count 2
```

### Step 5: スキャン結果の収集

**AWS Inspector結果の収集**:

```bash
# ECRスキャン結果を取得
aws ecr describe-image-scan-findings \
  --repository-name comparison-test-app \
  --image-id imageTag=v1.0 \
  --output json > inspector-ecr-results.json

# Inspector v2の脆弱性リストを取得
aws inspector2 list-findings \
  --filter-criteria '{"ecrImageTags":[{"comparison":"EQUALS","value":"comparison-test-app:v1.0"}]}' \
  --output json > inspector-findings.json

# SBOM取得（Inspector v2）
aws inspector2 get-sbom-export \
  --resource-filter-criteria '{"ecrImageTags":[{"comparison":"EQUALS","value":"comparison-test-app:v1.0"}]}' \
  --report-format CYCLONEDX_1_4 \
  --output json > inspector-sbom.json
```

**Wiz結果の収集**:

```bash
# Wizスキャン結果を取得
wizcli docker scan \
  --image $ECR_REGISTRY/comparison-test-app:v1.0 \
  --output-format json > wiz-scan-results.json

# SBOM取得
wizcli docker scan \
  --image $ECR_REGISTRY/comparison-test-app:v1.0 \
  --sbom-output wiz-sbom-cyclonedx.json \
  --sbom-format cyclonedx

wizcli docker scan \
  --image $ECR_REGISTRY/comparison-test-app:v1.0 \
  --sbom-output wiz-sbom-spdx.json \
  --sbom-format spdx
```

### Step 6: 結果の比較分析

**比較スクリプトの実行**:

```python
# compare_results.py
import json

# データ読み込み
with open('inspector-findings.json') as f:
    inspector_data = json.load(f)

with open('wiz-scan-results.json') as f:
    wiz_data = json.load(f)

# 脆弱性数の比較
inspector_vulns = inspector_data.get('findings', [])
wiz_vulns = wiz_data.get('vulnerabilities', [])

print(f"AWS Inspector: {len(inspector_vulns)} 脆弱性")
print(f"Wiz: {len(wiz_vulns)} 脆弱性")

# 重大度別の集計
def count_by_severity(vulns, severity_field):
    counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    for v in vulns:
        severity = v.get(severity_field, 'UNKNOWN')
        if severity in counts:
            counts[severity] += 1
    return counts

inspector_counts = count_by_severity(inspector_vulns, 'severity')
wiz_counts = count_by_severity(wiz_vulns, 'severity')

print("\nAWS Inspector:")
for sev, count in inspector_counts.items():
    print(f"  {sev}: {count}")

print("\nWiz:")
for sev, count in wiz_counts.items():
    print(f"  {sev}: {count}")
```

## 比較結果（期待値）

### 脆弱性検出

| 項目 | AWS Inspector | Wiz Code | 差分 |
|-----|---------------|----------|------|
| **総検出数** | 45 | 52 | Wiz +7 |
| CRITICAL | 3 | 5 | Wiz +2 |
| HIGH | 12 | 15 | Wiz +3 |
| MEDIUM | 20 | 22 | Wiz +2 |
| LOW | 10 | 10 | 同等 |
| **False Positive率** | 8% | 3% | **Wizが優秀** |

**分析**:
- Wizはより多くの脆弱性を検出（特にCRITICAL）
- False Positiveが少ない

### SBOM生成

| 項目 | AWS Inspector | Wiz Code |
|-----|---------------|----------|
| **フォーマット** | CycloneDX 1.4 | CycloneDX 1.5, SPDX 2.3 |
| **パッケージ数** | 127 | 134 |
| **OS packages** | ✅ | ✅ |
| **App packages** | ✅ | ✅ |
| **ライセンス情報** | 限定的 | ✅ 完全 |
| **依存関係ツリー** | ❌ | ✅ |

**分析**:
- Wizはより多くのフォーマットに対応
- 依存関係の詳細情報が豊富

### Code-to-Cloud追跡

| 機能 | AWS Inspector | Wiz Code |
|-----|---------------|----------|
| **ソースコード特定** | ❌ | ✅ GitHubリポジトリ・コミット |
| **CI/CDビルド特定** | ❌ | ✅ GitHub Actions Run ID |
| **Security Graph** | ❌ | ✅ 完全な可視化 |
| **脆弱性の起源追跡** | ❌ | ✅ どのコミットで導入されたか |

**分析**:
- **Wizの圧倒的優位**
- Inspectorにはトレーサビリティ機能がない

### ランタイムコンテキスト

| 機能 | AWS Inspector | Wiz Code |
|-----|---------------|----------|
| **実行中パッケージ検出** | ❌ | ✅ |
| **露出度分析** | 限定的 | ✅ 完全 |
| **優先順位付け** | CVSSのみ | ✅ 多次元評価 |
| **ネットワーク分析** | ❌ | ✅ |

**分析**:
- Wizは実行中の脆弱性を優先
- Inspectorは静的スキャンのみ

### ユーザビリティ

| 項目 | AWS Inspector | Wiz Code | 評価 |
|-----|---------------|----------|------|
| **ダッシュボード** | 3/5 | 5/5 | Wizが優秀 |
| **検索機能** | 3/5 | 5/5 | Wizが優秀 |
| **レポート** | 4/5 | 5/5 | Wizが優秀 |
| **統合** | AWSのみ | マルチクラウド | Wizが優秀 |
| **学習曲線** | 中程度 | 易しい | Wizが優秀 |

### コスト比較

**AWS Inspector**:
- ECR Scanning: 最初の30日間無料、以降$0.09/イメージ
- EC2/ECS Scanning: $0.01/インスタンス/時間

**Wiz**:
- ワークロード数ベースの料金
- 統合ダッシュボード込み
- マルチクラウド対応

**ROI分析**:
- セキュリティチームの工数削減: 年間400時間
- インシデント対応時間短縮: 90%削減
- False Positive調査工数削減: 60%削減

## 検証ポイント

- [ ] 同一環境で公平な比較ができている
- [ ] 定量的なデータが取得できている
- [ ] Wizの優位性が明確に示されている
- [ ] TIS提案資料に使用できる品質
- [ ] 顧客への説明が可能なレベル

## 成果物

### 比較レポート（Excel）

| シート名 | 内容 |
|---------|------|
| Summary | 総合比較サマリー |
| Vulnerabilities | 脆弱性検出結果詳細 |
| SBOM | SBOM比較 |
| Code-to-Cloud | トレーサビリティ比較 |
| Usability | ユーザビリティ評価 |
| Cost | コスト比較・ROI |

### プレゼンテーション資料

1. **エグゼクティブサマリー**
   - Wizを選択すべき3つの理由
   - ROI試算

2. **技術詳細**
   - 各機能の詳細比較
   - 実際のスクリーンショット

3. **導入提案**
   - 導入ロードマップ
   - 必要リソース

## 参考資料

- [AWS Inspector Pricing](https://aws.amazon.com/inspector/pricing/)
- [Wiz Pricing](https://www.wiz.io/pricing)
- [Container Scanning Comparison](https://www.gartner.com/reviews/market/container-scanning)
