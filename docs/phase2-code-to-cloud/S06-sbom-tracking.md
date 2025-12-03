# シナリオ6: SBOM生成と依存関係追跡（Code-to-Cloud）

## 📋 シナリオ概要

### 目的
Software Bill of Materials（SBOM）を自動生成し、ソースコードからコンテナイメージまでの依存関係を完全に追跡し、脆弱性のあるパッケージを検出する能力を検証します。

### 検証内容
- ✅ ソースコードからのSBOM生成（CycloneDX, SPDX形式）
- ✅ コンテナイメージからのSBOM生成
- ✅ 依存関係の脆弱性スキャン
- ✅ WizコンソールでのSBOM可視化
- ✅ ECRプッシュイメージとSBOMの紐付け

---

## ⏱️ 所要時間

| フェーズ | 所要時間 |
|---------|---------|
| **AWS環境デプロイ** | 2-3時間（初回のみ、[AWS_DEPLOYMENT_GUIDE](../guides/AWS_DEPLOYMENT_GUIDE.md)参照） |
| **SBOM生成検証** | 20-30分 |

**💡 前提**: AWS環境（ECS、ECR）が既にデプロイされていること。

---

## 📋 前提条件

### ✅ 必須要件
- [x] **Phase 1完了**: S01-S05のシナリオが完了済み
- [x] **AWS環境デプロイ**: [AWS_DEPLOYMENT_GUIDE](../guides/AWS_DEPLOYMENT_GUIDE.md)に従ってECS、ECRをデプロイ済み
- [x] **GitHub Actions設定**: WIZ_CLIENT_ID、WIZ_CLIENT_SECRET、AWS認証情報が設定済み

### 🔑 必要な環境変数
```bash
export AWS_ACCOUNT_ID="your_account_id"
export AWS_REGION="ap-northeast-1"
export WIZ_CLIENT_ID="your_wiz_client_id"
export WIZ_CLIENT_SECRET="your_wiz_client_secret"
```

---

## 📁 プロジェクト構造

```
WizCodeVerification/
└── taskflow-app/
    ├── .github/workflows/
    │   └── S06-sbom-generation.yml      ⭐ 既存のSBOM生成ワークフロー
    ├── backend/                         # SBOM生成対象
    │   ├── package.json
    │   └── Dockerfile
    └── frontend/                        # SBOM生成対象
        ├── package.json
        └── Dockerfile
```

---

## 🔧 手順1: ワークフロー実行とSBOM生成

### 1.1 ワークフローの手動実行

```bash
cd ~/WizCodeVerification/taskflow-app

# GitHub CLIでワークフロー手動実行
gh workflow run S06-sbom-generation.yml
```

または、GitHubのActionsタブから「S06 - SBOM Generation and Tracking」を手動実行します。

### 1.2 生成されるSBOM

このワークフローは以下のSBOMを生成します：

| コンポーネント | 形式 | 内容 |
|-------------|------|------|
| **backend（ソース）** | CycloneDX, SPDX | Node.js依存関係 |
| **frontend（ソース）** | CycloneDX, SPDX | Next.js/React依存関係 |
| **backend（コンテナ）** | CycloneDX | Dockerイメージ内の全パッケージ |
| **frontend（コンテナ）** | CycloneDX | Dockerイメージ内の全パッケージ |

---

## 🔧 手順2: SBOM確認（Wizコンソール）

### 2.1 Wizコンソールにログイン

```
1. https://app.wiz.io/ にアクセス
2. Code > Container Images に移動
```

### 2.2 ECRイメージのSBOM確認

```
フィルター設定:
- Registry: ECR
- Repository: taskflow-backend / taskflow-frontend

確認項目:
✅ イメージのSBOMタブ
✅ 検出された依存関係リスト
✅ 脆弱性のあるパッケージ
✅ ライセンス情報
```

---

## 🔧 手順3: GitHub Actions Artifactsからのダウンロード

### 3.1 Artifactsのダウンロード

```bash
# GitHub CLIで最新のワークフロー実行を確認
gh run list --workflow=S06-sbom-generation.yml --limit 1

# Artifactsをダウンロード
gh run download <run-id>
```

### 3.2 SBOMファイルの確認

```bash
# ダウンロードしたSBOMを確認
ls sbom-*
# sbom-backend-cyclonedx.json
# sbom-backend-spdx.json
# sbom-frontend-cyclonedx.json
# sbom-frontend-spdx.json
# sbom-container-backend.json
# sbom-container-frontend.json
```

### 3.3 SBOM内容の簡易確認

```bash
# 依存関係の数を確認（CycloneDX形式）
cat sbom-backend-cyclonedx.json | jq '.components | length'

# 脆弱性のあるパッケージを確認
cat sbom-backend-cyclonedx.json | jq '.components[] | select(.vulnerabilities) | .name'
```

---

## 🔧 手順4: Code-to-Cloud連携確認

### 4.1 WizコンソールでCode-to-Cloud確認

```
1. Cloud > Resources > ECS Tasks を開く
2. taskflow-backend または taskflow-frontend タスクを選択
3. 「Container Images」タブを確認
4. 「Source Code」タブを確認
   ✅ GitHubリポジトリへのリンク
   ✅ コミットSHA
   ✅ Dockerfileへのリンク
```

### 4.2 依存関係の追跡

```
1. Code > Container Images で脆弱性のあるイメージを選択
2. 「Vulnerabilities」タブで脆弱なパッケージを確認
3. 「Source Code」タブでpackage.jsonを確認
4. GitHubで該当する依存関係を特定
```

---

## ✅ 検証完了チェックリスト

- [ ] **SBOM生成**: ワークフローでCycloneDX、SPDX形式のSBOMが生成された
- [ ] **コンテナSBOM**: Dockerイメージからのsに成功した
- [ ] **Wizコンソール確認**: ECRイメージのSBOMがWizで可視化された
- [ ] **Code-to-Cloud**: コンテナイメージとソースコードが紐付けられた
- [ ] **脆弱性検出**: SBOMから脆弱性のある依存関係を検出できた

---

## 🎯 次のステップ

- [S07: コンテナトレーサビリティ](S07-container-traceability.md) - 実行中のコンテナとソースコードの紐付け
- [S08: ランタイム脆弱性の優先順位付け](S08-runtime-prioritization.md) - 実行中のコンテナの脆弱性を優先

---

**✅ S06検証完了**: SBOMの生成と追跡が確認できました。
