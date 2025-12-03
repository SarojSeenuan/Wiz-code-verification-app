# シナリオ7: コンテナトレーサビリティ（Code-to-Cloud）

## 📋 シナリオ概要

### 目的
AWS ECS Fargateにデプロイされた実行中のコンテナを、ソースコードまで遡って追跡し、脆弱性がどのGitコミットで導入されたかを特定する能力を検証します。

### 検証内容
- ✅ ECS実行中タスクとECRイメージの紐付け
- ✅ ECRイメージとGitHubソースコードの紐付け
- ✅ 脆弱性検出からコミットSHAまでの追跡
- ✅ Dockerfileとpackage.jsonへのリンク確認

---

## ⏱️ 所要時間

| フェーズ | 所要時間 |
|---------|---------|
| **ワークフロー実行** | 15-20分 |
| **Wiz確認** | 10-15分 |

**💡 前提**: S06完了後、ECSタスクが実行中であること。

---

## 📋 前提条件

### ✅ 必須要件
- [x] **S06完了**: SBOMが生成され、ECRにイメージがプッシュ済み
- [x] **ECSタスク実行中**: taskflow-backend, taskflow-frontendサービスが起動中

---

## 🔧 手順1: ワークフロー実行（Code-to-Cloudメタデータ付与）

### 1.1 S07ワークフローの実行

```bash
cd ~/WizCodeVerification/taskflow-app

# ワークフロー手動実行
gh workflow run S07-container-build.yml
```

このワークフローは、Dockerイメージに以下のメタデータを付与します：
- Git Commit SHA
- Git Branch
- Build Date
- GitHub Repository URL

---

## 🔧 手順2: Wizコンソールでトレーサビリティ確認

### 2.1 実行中のECSタスクを確認

```
1. Wizコンソール > Cloud > Resources > ECS Tasks
2. フィルター: Status = Running
3. taskflow-backend-service または taskflow-frontend-service を選択
```

### 2.2 Code-to-Cloud連携を確認

**確認項目**:
```
✅ Container Imagesタブ:
   - ECRイメージ名とタグ
   - イメージのSHA256ダイジェスト
   - スキャン結果

✅ Source Codeタブ:
   - GitHubリポジトリ名: <org>/WizCodeVerification
   - コミットSHA: 直接コミットへのリンク
   - Dockerfile: taskflow-app/backend/Dockerfile
   - ビルド日時
```

### 2.3 脆弱性からソースコードへの追跡

```
1. Vulnerabilitiesタブで脆弱性を選択
2. 該当するパッケージを確認（例: express, next）
3. Source Codeタブで package.json を開く
4. GitHubで脆弱な依存関係を特定
5. Blame機能で導入したコミットを確認
```

---

## ✅ 検証完了チェックリスト

- [ ] **ECSタスク確認**: 実行中のタスクがWizで可視化された
- [ ] **イメージ紐付け**: ECSタスクとECRイメージが紐付けられた
- [ ] **ソース紐付け**: ECRイメージとGitHubソースコードが紐付けられた
- [ ] **コミット追跡**: 脆弱性からGitコミットまで追跡できた

---

## 🎯 次のステップ

- [S08: ランタイム脆弱性の優先順位付け](S08-runtime-prioritization.md)

---

**✅ S07検証完了**: Code-to-Cloudトレーサビリティが確認できました。
