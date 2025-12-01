# S10: インシデント対応フロー

## 概要

Log4Shell等の重大な脆弱性が公開された際の、影響特定からコード修正、デプロイまでの一連の対応フローを実証します。Wiz CodeのCode-to-Cloud追跡機能により、従来数日かかっていた対応を数時間に短縮できることを検証します。

## 検証目的

- 重大な脆弱性発生時の迅速な対応フローを実証
- 影響範囲を数分で特定できることを確認
- ソースコードまでの追跡が即座にできることを確認
- 修正確認までのEnd-to-Endフローを測定

## シナリオ設定

**想定**: Log4Shell（CVE-2021-44228）相当の重大な脆弱性が公開

**目標時間**:
- 影響範囲特定: 5分以内
- ソースコード特定: 即座
- 修正版デプロイ: 1時間以内
- 修正確認: デプロイ後10分以内

## 前提条件

### 環境
- 複数のワークロードがECS/EKSで稼働中
- Wiz Cloud、Wiz Code有効化
- CI/CDパイプライン構築済み

### テスト用の脆弱性
実際にはLog4jの古いバージョンを使用してシミュレーション:

```json
// package.json
{
  "dependencies": {
    "log4js": "6.3.0"  // 脆弱性を含むバージョン
  }
}
```

または

```xml
<!-- pom.xml (Java/Maven) -->
<dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-core</artifactId>
    <version>2.14.1</version>  <!-- 脆弱なバージョン -->
</dependency>
```

## 検証手順

### Phase 1: 脆弱性の認知（想定: T+0分）

```
【シナリオ】
2024年12月9日 午前10:00 (JST)
Log4Shell相当の重大な脆弱性（CVE-2021-44228）が公開される
```

1. **Wiz Threat Centerで確認**
   - Wiz Console → Threat Center
   - 新たなCVEアラートを確認
   - CVE-2021-44228の詳細を確認

2. **初期評価**
   - CVSS Score: 10.0 (Critical)
   - Exploit: 公開済み
   - 影響: リモートコード実行

**所要時間: 2分**

### Phase 2: 影響範囲の特定（T+2分）

1. **Wizで影響を受けるリソースを検索**

```
Wiz Console → Vulnerabilities → Search
Filter: CVE-2021-44228
```

**検出結果（例）**:
```
影響を受けるワークロード:
1. taskflow-backend (ECS) - CRITICAL
   - Image: taskflow-backend:abc123
   - Instances: 3台
   - Internet Exposed: YES
   - Package: log4j-core@2.14.1

2. analytics-service (EKS) - CRITICAL
   - Image: analytics:def456
   - Instances: 5台
   - Internet Exposed: YES
   - Package: log4j-core@2.14.1

3. batch-processor (ECS) - HIGH
   - Image: batch:ghi789
   - Instances: 2台
   - Internet Exposed: NO
   - Package: log4j-core@2.14.1

総計: 3サービス、10インスタンス
```

2. **Security Graphで可視化**
   - 影響を受けるサービス間の関係
   - データフローの確認
   - 機密データへのアクセス有無

**所要時間: 3分**
**累積時間: 5分**

### Phase 3: ソースコードの特定（T+5分）

1. **taskflow-backendのCode Originを確認**

```
Wiz Console → Workload詳細 → Code Origin

表示される情報:
- GitHub Repository: org/taskflow-backend
- Branch: main
- Commit: abc123def456...
- Build: GitHub Actions Run #142
- File: package.json, pom.xml
```

2. **影響を受けるすべてのサービスのソースを特定**

| サービス | リポジトリ | ファイル | 行番号 |
|---------|-----------|---------|--------|
| taskflow-backend | org/taskflow-backend | pom.xml | 45-49 |
| analytics-service | org/analytics | build.gradle | 23 |
| batch-processor | org/batch-jobs | pom.xml | 67-71 |

**所要時間: 即座**
**累積時間: 5分**

### Phase 4: 修正作業（T+5分〜T+30分）

1. **修正ブランチの作成**

```bash
# taskflow-backendの修正
git clone https://github.com/org/taskflow-backend
cd taskflow-backend
git checkout -b hotfix/log4shell-cve-2021-44228
```

2. **依存関係の更新**

```xml
<!-- pom.xml - Log4jを安全なバージョンに更新 -->
<dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-core</artifactId>
    <version>2.17.0</version>  <!-- 修正バージョン -->
</dependency>
```

3. **テストの実行**

```bash
# ローカルでのテスト
mvn clean test

# Wiz CLIでスキャン
wizcli dir scan --path .

# 脆弱性が解消されたことを確認
```

4. **コミット&プッシュ**

```bash
git add pom.xml
git commit -m "hotfix: Upgrade log4j to 2.17.0 (CVE-2021-44228)"
git push origin hotfix/log4shell-cve-2021-44228
```

5. **PRの作成**

```bash
gh pr create \
  --title "🚨 HOTFIX: Log4Shell (CVE-2021-44228)" \
  --body "## Critical Security Fix\n\nUpgrades log4j-core from 2.14.1 to 2.17.0 to address CVE-2021-44228 (Log4Shell).\n\n**CVSS**: 10.0 (Critical)\n**Affected**: taskflow-backend\n\n**Testing**:\n- ✅ Unit tests passed\n- ✅ Wiz scan clean\n\n**Deployment**: Requires immediate deployment" \
  --label "security,hotfix,critical"
```

**所要時間: 25分**
**累積時間: 30分**

### Phase 5: CI/CDビルド&スキャン（T+30分〜T+40分）

GitHub Actionsが自動実行:

```yaml
# 自動実行されるワークフロー
1. ソースコードスキャン (Wiz CLI)
2. ビルド (Maven/Gradle)
3. Dockerイメージビルド
4. イメージスキャン (Wiz CLI)
5. SBOM生成
6. メタデータタグ付け
7. ECRプッシュ
```

**ビルド完了**:
- 新しいイメージ: `taskflow-backend:hotfix-log4shell`
- Wizスキャン結果: **CVE-2021-44228 検出なし** ✅

**所要時間: 10分**
**累積時間: 40分**

### Phase 6: デプロイ（T+40分〜T+50分）

```bash
# ECSへの緊急デプロイ
aws ecs update-service \
  --cluster production \
  --service taskflow-backend \
  --task-definition taskflow-backend:latest \
  --force-new-deployment

# デプロイ状況の監視
aws ecs wait services-stable \
  --cluster production \
  --services taskflow-backend

# すべてのインスタンスが新バージョンに切り替わるまで待機
```

**所要時間: 10分**
**累積時間: 50分**

### Phase 7: 修正確認（T+50分〜T+60分）

1. **Wiz Cloudで再スキャン**
   - Wiz Console → Workloads → taskflow-backend
   - Vulnerabilities タブを確認
   - **CVE-2021-44228: 検出されず** ✅

2. **Security Graphで確認**
   - 新しいイメージが使用されていることを確認
   - Code Originが新しいコミットを指していることを確認

3. **残りのサービスも同様に修正**
   - analytics-service
   - batch-processor

**所要時間: 10分**
**累積時間: 60分**

## 結果比較

### 従来の方法（Wizなし）

| フェーズ | 所要時間 | 累積 |
|---------|---------|------|
| 脆弱性の認知 | 30分〜数時間 | 30分 |
| 影響範囲の特定 | **4-8時間** | 4.5時間 |
| ソースコードの特定 | **2-4時間** | 7時間 |
| 修正作業 | 1時間 | 8時間 |
| ビルド&テスト | 30分 | 8.5時間 |
| デプロイ | 30分 | 9時間 |
| 修正確認 | **2-4時間** | 11時間 |

**総計: 約1-2営業日**

### Wiz使用時

| フェーズ | 所要時間 | 累積 |
|---------|---------|------|
| 脆弱性の認知 | 2分 | 2分 |
| 影響範囲の特定 | **3分** | 5分 |
| ソースコードの特定 | **即座** | 5分 |
| 修正作業 | 25分 | 30分 |
| ビルド&テスト | 10分 | 40分 |
| デプロイ | 10分 | 50分 |
| 修正確認 | **10分** | 60分 |

**総計: 約1時間**

**削減効果: 91-95%の時間削減**

## 期待される結果

### 定量的成果

| 指標 | 目標 | 実績 |
|-----|------|------|
| 影響範囲特定時間 | <5分 | 確認 |
| ソースコード特定 | 即座 | 確認 |
| 総対応時間 | <1時間 | 確認 |
| 時間削減率 | >90% | 確認 |

### 定性的成果

- **ストレス軽減**: 手作業での調査が不要
- **正確性**: 見落としのリスクが低減
- **再現性**: 同じフローで次回も対応可能
- **証跡**: すべての対応履歴がWizに記録

## 検証ポイント

- [ ] 影響を受けるリソースがすべて特定される
- [ ] ソースコードまで即座に追跡できる
- [ ] 修正確認が確実に行える
- [ ] 対応時間が目標内に収まる
- [ ] 見落としがない

## エビデンス収集

### スクリーンショット
1. Threat Centerのアラート表示
2. 影響を受けるリソースのリスト
3. Security Graphのトレーサビリティ
4. 修正後のスキャン結果

### ログ
- Wizスキャンログ
- GitHub Actions実行ログ
- デプロイログ

### タイムライン
各ステップの開始・終了時刻を記録

## 関連シナリオ

- [S06: SBOM生成と追跡](../phase2-code-to-cloud/S06-sbom-tracking.md)
- [S07: コンテナトレーサビリティ](../phase2-code-to-cloud/S07-container-traceability.md)
- [S08: ランタイム優先順位付け](../phase2-code-to-cloud/S08-runtime-prioritization.md)

## 参考資料

- [Log4Shell対応ガイド](https://www.cisa.gov/log4j)
- [Wiz Threat Center](https://docs.wiz.io/wiz-docs/docs/threat-center)
- [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
