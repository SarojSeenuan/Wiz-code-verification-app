# シナリオ10: インシデント対応フロー（Log4Shell想定）

## 📋 シナリオ概要

### 目的
Log4Shell等の重大な脆弱性（CVE）が公開された際の、影響範囲特定からコード修正、デプロイまでの一連の対応フローを実証し、Wizのトータル対応時間短縮効果を検証します。

### 検証内容
- ✅ CVEの影響範囲特定（数分）
- ✅ 影響を受けるコンテナ・ソースコードの特定
- ✅ 修正PRの作成とCI/CD実行
- ✅ 修正版のデプロイと確認
- ✅ 従来手法との対応時間比較

---

## ⏱️ 所要時間

| フェーズ | 所要時間 |
|---------|---------|
| **影響範囲特定** | 5分 |
| **修正とデプロイ** | 30-40分 |

**従来手法との比較**: 数日 → 数時間

---

## 📋 前提条件

### ✅ 必須要件
- [x] **Phase 2完了**: S06-S09まで完了
- [x] **ECS実行中**: taskflow-backendサービスが稼働中

---

## 🔧 手順1: CVE影響範囲の特定

### 1.1 Wizコンソールで脆弱性検索

```
Wizコンソール > Code > Vulnerabilities

検索:
- CVE-ID: CVE-2021-44228 (Log4Shell)
  または
- Package: log4j-core
- Version: < 2.17.0
```

### 1.2 影響範囲の確認

**確認項目**:
```
✅ 影響を受けるリポジトリ: backend
✅ 影響を受けるイメージ: taskflow-backend:xxx
✅ 実行中のコンテナ: ECS taskflow-backend-service
✅ ソースコード: package.json または pom.xml
✅ 導入コミット: Git Blame経由で特定
```

**従来手法との比較**:
| 従来手法 | Wiz | 時間短縮 |
|---------|-----|---------|
| 全サービスを手動調査 | 自動フィルタリング | 数日 → 5分 |

---

## 🔧 手順2: 修正PRの作成

### 2.1 ローカルで依存関係を更新

```bash
cd ~/WizCodeVerification/taskflow-app/backend

# package.jsonまたはpom.xmlを修正
# log4j-coreのバージョンを2.17.1以上に更新

# コミット
git checkout -b hotfix/log4shell-CVE-2021-44228
git add package.json
git commit -m "hotfix: Log4Shell (CVE-2021-44228) 修正 - log4j-core 2.17.1に更新"
git push origin hotfix/log4shell-CVE-2021-44228
```

### 2.2 PRを作成してCI/CD実行

```bash
gh pr create \
  --title "Hotfix: Log4Shell (CVE-2021-44228) 修正" \
  --body "log4j-coreを2.17.1に更新してCVE-2021-44228を修正"
```

PR作成により自動的に：
- Wiz CLIスキャン実行
- Dockerイメージビルド
- 脆弱性再スキャン

---

## 🔧 手順3: 修正の確認

### 3.1 CI/CDログで脆弱性解消を確認

```
GitHub Actions > PR Checks

✅ Wiz Scan: No Critical Vulnerabilities
✅ Docker Build: Success
✅ log4j-core: 2.17.1 (Safe)
```

### 3.2 PRマージとデプロイ

```bash
# PRをマージ
gh pr merge --squash

# mainブランチのCI/CDが自動実行され、ECSにデプロイ
```

### 3.3 Wizコンソールで修正を確認

```
1. Code > Container Images
2. 最新のtaskflow-backend イメージを選択
3. Vulnerabilitiesタブで CVE-2021-44228 が消えたことを確認
```

---

## 📊 対応時間の比較

| フェーズ | 従来手法 | Wiz Code | 短縮効果 |
|---------|---------|----------|---------|
| **影響範囲特定** | 1-2日（全サービス手動調査） | **5分**（自動フィルタリング） | **99%短縮** |
| **ソースコード特定** | 0.5-1日（各チームに問い合わせ） | **1分**（Code-to-Cloud） | **99%短縮** |
| **修正とテスト** | 0.5-1日 | 1時間 | 変わらず |
| **デプロイと確認** | 0.5日 | 30分 | 大幅短縮 |
| **合計** | **2.5-4.5日** | **2-3時間** | **95%短縮** |

---

## ✅ 検証完了チェックリスト

- [ ] **影響範囲特定**: CVEで影響を受けるコンテナを特定した
- [ ] **ソースコード特定**: Code-to-Cloudでソースを特定した
- [ ] **修正PR**: 依存関係を更新してPRを作成した
- [ ] **CI/CD実行**: 修正版のスキャンとビルドが成功した
- [ ] **デプロイ確認**: ECSに修正版がデプロイされた
- [ ] **脆弱性解消**: Wizで脆弱性が消えたことを確認した

---

## 🎯 次のステップ

- [S11: AWS Inspector比較](S11-aws-inspector-comparison.md) - 最終シナリオ

---

**✅ S10検証完了**: インシデント対応フローが実証できました。
