# S08: ランタイム脆弱性の優先順位付け

## 概要

実行中のワークロードに存在する脆弱性を、実際の露出度・権限・悪用可能性に基づいて優先順位付けし、対処すべき脆弱性を絞り込むことを検証します。

## 検証目的

- ランタイムコンテキストを考慮した脆弱性優先順位付けの確認
- 「実行中」vs「未使用」パッケージの区別
- 露出度（インターネットアクセス可能性）の評価
- 実際に対処すべき脆弱性数の削減効果測定

## 前提条件

### 必要な環境
- AWS ECS/EKSで実行中のワークロード
- Wiz Cloud有効化
- Wiz Sensor デプロイ済み

## 検証手順

### Step 1: 複数の脆弱性を含むアプリケーションのデプロイ

```json
// package.json - 意図的に多数の脆弱性を含む
{
  "dependencies": {
    "lodash": "4.17.15",        // CVE-2020-8203, CVE-2021-23337
    "axios": "0.19.2",          // CVE-2020-28168
    "express": "4.16.0",        // CVE-2022-24999
    "moment": "2.29.1",         // 非推奨だが実際に使用
    "jquery": "3.4.1",          // CVE-2020-11022, 11023
    "yargs-parser": "18.1.0",   // CVE-2020-7608
    "minimist": "1.2.0",        // CVE-2021-44906
    "node-fetch": "2.6.0",      // CVE-2022-0235
    "json-schema": "0.2.3",     // 未使用パッケージ
    "underscore": "1.9.1"       // 未使用パッケージ
  }
}
```

```javascript
// index.js - 実際に使用されるパッケージを明確化
const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');

// これらは実際に実行される
const app = express();

app.get('/api/users', async (req, res) => {
  // axios: ネットワーク経由で実際に使用
  const data = await axios.get('https://api.example.com/users');

  // lodash: データ処理で実際に使用
  const filtered = _.filter(data.items, { active: true });

  // moment: 日付処理で実際に使用
  const formatted = filtered.map(u => ({
    ...u,
    date: moment(u.createdAt).format('YYYY-MM-DD')
  }));

  res.json(formatted);
});

// jquery, minimist, underscore等は require されているが実際には未使用
// これらの脆弱性は優先度が低いべき
```

### Step 2: Wiz Cloudでのランタイム分析

1. **Wiz Console** にログイン
2. **Vulnerabilities → Workload Vulnerabilities** に移動
3. **フィルター設定**:
   - **Deployed**: チェック（デプロイされている脆弱性のみ）
   - **Has exploit**: チェック（エクスプロイトが存在する脆弱性）
   - **Internet exposed**: チェック（インターネット露出あり）

### Step 3: 優先順位付けの確認

Wizの優先順位付けロジックを確認:

| 脆弱性 | CVE | CVSS | 実行中 | 露出 | エクスプロイト | Wiz優先度 |
|-------|-----|------|--------|------|--------------|----------|
| lodash | CVE-2020-8203 | 7.4 | ✅ Yes | ✅ Public | ⚠️ POC | **CRITICAL** |
| axios | CVE-2020-28168 | 5.9 | ✅ Yes | ✅ Public | ✅ Exploit | **CRITICAL** |
| express | CVE-2022-24999 | 7.5 | ✅ Yes | ✅ Public | ✅ Exploit | **CRITICAL** |
| jquery | CVE-2020-11022 | 6.1 | ❌ No | ✅ Public | ✅ Exploit | MEDIUM |
| minimist | CVE-2021-44906 | 5.6 | ❌ No | ❌ Internal | ⚠️ POC | LOW |
| underscore | CVE-XXX | 5.0 | ❌ No | ❌ Internal | ❌ None | LOW |

**優先順位付けの要素**:

1. **実行状態** (Runtime Execution)
   - パッケージが実際に実行されているか
   - Wiz Sensorがプロセスレベルで検出

2. **露出度** (Exposure)
   - インターネットからアクセス可能か
   - ロードバランサー経由で公開されているか

3. **権限** (Privileges)
   - 機密データへのアクセス権があるか
   - データベース接続権限があるか

4. **悪用可能性** (Exploit Availability)
   - 公開されているエクスプロイトコードがあるか
   - POC（Proof of Concept）が公開されているか

### Step 4: 従来の方法との比較

```bash
# 従来の脆弱性スキャナー（すべての脆弱性を平等に扱う）
# 総脆弱性数: 45件
# - CRITICAL: 3件
# - HIGH: 12件
# - MEDIUM: 20件
# - LOW: 10件

# Wizのランタイム優先順位付け後
# 実際に対処すべき脆弱性: 8件
# - 実行中 + インターネット露出 + エクスプロイトあり: 3件
# - 実行中 + インターネット露出: 5件
#
# 優先順位が下がった脆弱性: 37件
# - 未使用パッケージ: 25件
# - 内部のみ（非露出）: 12件
```

**削減効果**:
- 対処すべき脆弱性が 45件 → 8件に削減（82%削減）
- セキュリティチームの作業効率が大幅に向上

### Step 5: Security Graphでの可視化

1. **Wiz Console → Security Graph**
2. **実行中の脆弱性をクリック**
3. **関連するリソースを確認**:

```
GitHub Commit (abc123)
    ↓
ECR Image
    ↓
ECS Task (running)
    ↓
Vulnerable Package (lodash@4.17.15)
    ↓
CVE-2020-8203
    ├ CVSS: 7.4
    ├ Exploit: Available
    ├ Status: Running
    ├ Exposure: Internet
    └ Fix: Upgrade to 4.17.21
```

### Step 6: 修正の優先順位決定

Wizの推奨に基づいて修正を実施:

```json
// package.json - 優先度の高い脆弱性のみ修正
{
  "dependencies": {
    "lodash": "4.17.21",        // ✅ 修正（実行中 + 露出）
    "axios": "1.6.0",           // ✅ 修正（実行中 + 露出）
    "express": "4.18.2",        // ✅ 修正（実行中 + 露出）
    "moment": "2.29.4",         // ✅ 修正（実行中）

    // 未使用パッケージは後回しまたは削除
    "jquery": "3.4.1",          // ⏸️ 後回し（未使用）
    "minimist": "1.2.0",        // ⏸️ 後回し（未使用）
    "underscore": "1.9.1"       // ⏸️ 後回し（未使用）
  }
}
```

## 期待される結果

### 脆弱性の分類

| カテゴリ | 件数 | 割合 | アクション |
|---------|------|------|-----------|
| 実行中 + 露出 + エクスプロイト | 3 | 7% | 即座に修正 |
| 実行中 + 露出 | 5 | 11% | 優先的に修正 |
| 実行中のみ | 7 | 16% | 計画的に修正 |
| 未使用パッケージ | 30 | 66% | 低優先度/削除 |

### 効果測定

**修正前**:
- セキュリティチームが45件の脆弱性を調査・評価
- 所要時間: 約2週間

**修正後（Wiz使用）**:
- 8件の脆弱性に集中
- 所要時間: 約2日間
- **効率化: 85%**

## 検証ポイント

- [ ] 実行中パッケージが正確に検出される
- [ ] 未使用パッケージの脆弱性が低優先度として扱われる
- [ ] インターネット露出が正確に判定される
- [ ] エクスプロイトの有無が考慮される
- [ ] Security Graphで可視化される
- [ ] 対処すべき脆弱性数が大幅に削減される

## トラブルシューティング

### 問題: 実行中パッケージが検出されない

```bash
# Wiz Sensorの状態確認
kubectl get pods -n wiz-sensor  # EKSの場合
aws ecs describe-services --cluster <cluster> --services wiz-sensor  # ECSの場合

# Sensorログを確認
kubectl logs -n wiz-sensor <pod-name>
```

### 問題: 露出度が正しく判定されない

Wizコンソールで以下を確認:
- ロードバランサーの設定
- セキュリティグループのルール
- NACLの設定

## 関連シナリオ

- [S06: SBOM生成と追跡](S06-sbom-tracking.md)
- [S07: コンテナトレーサビリティ](S07-container-traceability.md)
- [S10: インシデント対応フロー](../phase3-integration/S10-incident-response.md)

## 参考資料

- [Wiz Runtime Context](https://docs.wiz.io/wiz-docs/docs/runtime-context)
- [Vulnerability Prioritization](https://docs.wiz.io/wiz-docs/docs/vulnerability-prioritization)
