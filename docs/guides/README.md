# WizCode検証プロジェクト - ガイド一覧

本ディレクトリには、WizCode検証プロジェクトのセットアップ・実行・管理に関する包括的なガイドが含まれています。

## 📚 ガイドの読み方

### 初めての方へ - 推奨読了順序

```
1️⃣ このREADME（ガイド全体の概要を把握）
    ↓
2️⃣ MANUAL_SETUP_GUIDE.md（環境セットアップ）
    ↓
3️⃣ 環境別ガイド（該当する環境のみ）
    - WINDOWS_SETUP_GUIDE.md（Windows環境の方）
    - ENVIRONMENT_VARIABLES_GUIDE.md（環境変数設定）
    ↓
4️⃣ BRANCH_MANAGEMENT_GUIDE.md（ブランチ戦略）
    ↓
5️⃣ 各シナリオドキュメント（S01-S11）
    ↓
6️⃣ EVIDENCE_COLLECTION_GUIDE.md（エビデンス収集）
    ↓
7️⃣ 必要に応じて参照
    - TROUBLESHOOTING_GUIDE.md（トラブル時）
```

---

## 🎯 目的別ガイド選択

### 「初めてセットアップする」場合

**Phase 1のみ実施する場合（AWS不要）**
1. ✅ [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md) - 基本セットアップ
2. ✅ [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md) - Phase 1環境変数設定
3. ✅ [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md) - ブランチ戦略
4. ✅ [Phase 1シナリオ](../phase1-shift-left/) - S01～S05実施

**全Phase実施する場合（AWS必要）**
1. ✅ [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md) - 完全セットアップ
2. ✅ [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md) - Phase 2環境変数設定
3. ✅ [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md) - ブランチ戦略
4. ✅ [Phase 1シナリオ](../phase1-shift-left/) - S01～S05実施
5. ✅ [Phase 2シナリオ](../phase2-code-to-cloud/) - S06～S09実施
6. ✅ [Phase 3シナリオ](../phase3-integration/) - S10～S11実施

### 「Windows環境で作業する」場合

1. ✅ [WINDOWS_SETUP_GUIDE.md](./WINDOWS_SETUP_GUIDE.md) - Windows専用セットアップ
2. ✅ [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md) - 補足情報確認
3. ✅ [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md) - PowerShell環境変数設定

### 「検証を繰り返し実施する」場合

1. ✅ [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md) - ブランチ作成・削除・再利用
2. ✅ 各シナリオドキュメント - 検証手順確認

### 「顧客提案資料を作成する」場合

1. ✅ [EVIDENCE_COLLECTION_GUIDE.md](./EVIDENCE_COLLECTION_GUIDE.md) - エビデンス収集方法
2. ✅ 各シナリオドキュメント - スクリーンショット取得ポイント

### 「トラブルが発生した」場合

1. ✅ [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - トラブルシューティング

---

## 📖 ガイド一覧と概要

### セットアップガイド

| ドキュメント | 対象者 | 内容 | 所要時間 |
|-------------|--------|------|---------|
| **[MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)** | 全員（必須） | 環境セットアップの完全ガイド | 1-2時間 |
| **[WINDOWS_SETUP_GUIDE.md](./WINDOWS_SETUP_GUIDE.md)** | Windows利用者 | Windows環境専用セットアップ | 30分 |
| **[ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)** | 全員（必須） | 環境変数の設定・管理 | 15分 |

#### MANUAL_SETUP_GUIDE.md（手動セットアップガイド）

**対象読者**: 初めてWizCode検証環境をセットアップする全ての方

**内容**:
- 前提条件（アカウント、ツール）
- GitHub環境のセットアップ
- Wiz認証情報の取得と設定
- AWS認証情報の取得と設定（Phase 2以降）
- ローカル開発環境のセットアップ
- データベースのセットアップ（3つの方法）
- 動作確認

**このガイドを読むべきタイミング**: プロジェクト開始時、最初に必ず読む

**次に読むべきドキュメント**:
- Windows環境 → [WINDOWS_SETUP_GUIDE.md](./WINDOWS_SETUP_GUIDE.md)
- その他 → [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)

---

#### WINDOWS_SETUP_GUIDE.md（Windows専用セットアップガイド）

**対象読者**: Windows 10/11でWizCode検証を実施する方

**内容**:
- PowerShell管理者権限での操作方法
- wingetを使った一括ツールインストール
- Windows固有のトラブルシューティング
- PowerShellスクリプトの実行方法
- パス設定と環境変数の永続化

**このガイドを読むべきタイミング**: MANUAL_SETUP_GUIDE.md の後、Windows環境の方のみ

**次に読むべきドキュメント**: [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)

---

#### ENVIRONMENT_VARIABLES_GUIDE.md（環境変数ガイド）

**対象読者**: 全ての方（環境変数設定が必要）

**内容**:
- Phase別環境変数一覧（Phase 1 / Phase 2）
- 必須 vs オプション環境変数
- 設定方法4種類（シェル環境変数、.envファイル、GitHub Secrets、システム環境変数）
- .env.templateファイルの使い方
- 環境変数検証スクリプト（validate-env.sh/ps1）

**このガイドを読むべきタイミング**: セットアップの最終段階、または環境変数設定時

**次に読むべきドキュメント**: [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)

---

### 運用ガイド

| ドキュメント | 対象者 | 内容 | 所要時間 |
|-------------|--------|------|---------|
| **[BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)** | 全員（推奨） | ブランチ戦略と再検証フロー | 10分 |
| **[EVIDENCE_COLLECTION_GUIDE.md](./EVIDENCE_COLLECTION_GUIDE.md)** | デモ実施者 | エビデンス収集方法 | 15分 |

#### BRANCH_MANAGEMENT_GUIDE.md（ブランチ管理ガイド）

**対象読者**: WizCode検証を繰り返し実施する方、デモ担当者

**内容**:
- シナリオ別ブランチ命名規則
- ブランチ作成→検証→削除→再作成のフロー
- Pull Request作成→スキャン→マージ→削除のサイクル
- 保護ブランチ設定
- 再検証のベストプラクティス

**このガイドを読むべきタイミング**: 検証開始前、またはブランチ戦略を理解したい時

**次に読むべきドキュメント**: 各シナリオドキュメント（[S01](../phase1-shift-left/S01-ide-integration.md) から開始）

---

#### EVIDENCE_COLLECTION_GUIDE.md（エビデンス収集ガイド）

**対象読者**: 顧客デモ・提案資料を作成する方

**内容**:
- エビデンスの種類（スクリーンショット、ログ、レポート）
- OS別スクリーンショット取得方法（Windows/macOS/Linux）
- Phase 1-3の各シナリオでの収集ポイント
- ファイル命名規則とディレクトリ構造
- 顧客提案資料への活用方法

**このガイドを読むべきタイミング**: 各シナリオ実施時、または提案資料作成時

**次に読むべきドキュメント**: 各シナリオドキュメント（スクリーンショット取得ポイント確認）

---

### 参照ガイド

| ドキュメント | 対象者 | 内容 | 参照タイミング |
|-------------|--------|------|-------------|
| **[TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)** | 全員 | トラブルシューティング集 | 問題発生時 |
| **[AWS_CONSOLE_GUIDE_JA.md](./AWS_CONSOLE_GUIDE_JA.md)** | Phase 2以降実施者 | AWS Console日本語版操作 | Phase 2開始時 |

#### TROUBLESHOOTING_GUIDE.md（トラブルシューティングガイド）

**対象読者**: エラーや問題に遭遇した全ての方

**内容**:
- セットアップ段階別FAQ
- よくあるエラーと解決法
  - データベース接続エラー
  - ポート競合エラー
  - Wiz認証エラー
  - AWS認証エラー
  - Docker関連エラー
- ログファイルの確認方法
- サポートへの問い合わせ方法

**このガイドを読むべきタイミング**: 問題やエラーが発生した時

---

#### AWS_CONSOLE_GUIDE_JA.md（AWS Console日本語版操作ガイド）

**対象読者**: Phase 2以降を実施する方、AWS初心者

**内容**:
- AWS Consoleの日本語化手順
- ECS/EKSコンソール操作（スクリーンショット付き）
- RDS操作画面
- ECR操作画面
- Inspector有効化と結果確認

**このガイドを読むべきタイミング**: Phase 2開始時、AWS操作が不明な時

---

## 🔄 検証シナリオドキュメント

### Phase 1: シフトレフト（開発段階のセキュリティ）

| シナリオ | ドキュメント | 内容 | 所要時間 |
|---------|-------------|------|---------|
| S01 | [S01-ide-integration.md](../phase1-shift-left/S01-ide-integration.md) | IDE統合（VSCode） | 1-2時間 |
| S02 | [S02-vcs-integration.md](../phase1-shift-left/S02-vcs-integration.md) | VCS統合（GitHub App） | 2-3時間 |
| S03 | [S03-cicd-integration.md](../phase1-shift-left/S03-cicd-integration.md) | CI/CD統合（GitHub Actions） | 2-3時間 |
| S04 | [S04-iac-scanning.md](../phase1-shift-left/S04-iac-scanning.md) | IaCスキャン（Terraform） | 2-3時間 |
| S05 | [S05-secret-detection.md](../phase1-shift-left/S05-secret-detection.md) | シークレット検出 | 1-2時間 |

### Phase 2: Code-to-Cloud トレーサビリティ

| シナリオ | ドキュメント | 内容 | 所要時間 |
|---------|-------------|------|---------|
| S06 | [S06-sbom-tracking.md](../phase2-code-to-cloud/S06-sbom-tracking.md) | SBOM生成と追跡 | 2-3時間 |
| S07 | [S07-container-traceability.md](../phase2-code-to-cloud/S07-container-traceability.md) | コンテナトレーサビリティ | 3-4時間 |
| S08 | [S08-runtime-prioritization.md](../phase2-code-to-cloud/S08-runtime-prioritization.md) | ランタイム優先順位付け | 2-3時間 |
| S09 | [S09-iac-drift-detection.md](../phase2-code-to-cloud/S09-iac-drift-detection.md) | IaC Drift検出 | 2-3時間 |

### Phase 3: 統合シナリオと比較検証

| シナリオ | ドキュメント | 内容 | 所要時間 |
|---------|-------------|------|---------|
| S10 | [S10-incident-response.md](../phase3-integration/S10-incident-response.md) | インシデント対応フロー | 3-4時間 |
| S11 | [S11-aws-inspector-comparison.md](../phase3-integration/S11-aws-inspector-comparison.md) | AWS Inspector比較 | 4-6時間 |

---

## 🛠️ スクリプトリファレンス

### セットアップスクリプト

| スクリプト | 用途 | 実行タイミング |
|-----------|------|-------------|
| **init-database.sh** | PostgreSQLデータベース初期化（Linux/macOS） | セットアップ時 |
| **init-database.ps1** | PostgreSQLデータベース初期化（Windows） | セットアップ時 |
| **validate-env.sh** | 環境変数検証（Linux/macOS） | セットアップ完了後 |
| **validate-env.ps1** | 環境変数検証（Windows） | セットアップ完了後 |

### 検証スクリプト

| スクリプト | 用途 | 実行タイミング |
|-----------|------|-------------|
| **run-wiz-scan.sh** | Wizスキャン実行（Linux/macOS） | 各シナリオ実施時 |
| **run-wiz-scan.ps1** | Wizスキャン実行（Windows） | 各シナリオ実施時 |

**スクリプト実行例**:
```bash
# Linux/macOS
cd taskflow-app/scripts/setup
./init-database.sh

# Windows PowerShell
cd taskflow-app\scripts\setup
.\init-database.ps1
```

---

## 📊 推奨実施パターン

### パターン1: 初心者向け（Phase 1のみ、AWS不要）

**目的**: Wiz Codeの基本機能を理解する

**推奨期間**: 2日間（10-15時間）

**手順**:
1. [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)でセットアップ
2. [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)で環境変数設定
3. [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)でブランチ戦略理解
4. Phase 1シナリオ（S01-S05）を順次実施
5. [EVIDENCE_COLLECTION_GUIDE.md](./EVIDENCE_COLLECTION_GUIDE.md)でエビデンス収集

### パターン2: 完全検証（全Phase、AWS必要）

**目的**: Wiz Codeの全機能を包括的に検証する

**推奨期間**: 6日間（40-50時間）

**手順**:
1. [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)で完全セットアップ
2. [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)でPhase 2環境変数設定
3. [BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)でブランチ戦略理解
4. Phase 1シナリオ（S01-S05）実施
5. [AWS_CONSOLE_GUIDE_JA.md](./AWS_CONSOLE_GUIDE_JA.md)でAWS環境準備
6. Phase 2シナリオ（S06-S09）実施
7. Phase 3シナリオ（S10-S11）実施
8. [EVIDENCE_COLLECTION_GUIDE.md](./EVIDENCE_COLLECTION_GUIDE.md)で総合エビデンス収集

### パターン3: 顧客デモ向け（選択的実施）

**目的**: 顧客に見せたい機能のみを実施する

**推奨期間**: 1-3日間（カスタマイズ可能）

**推奨シナリオ**:
- **開発者向けデモ**: S01（IDE統合）、S02（VCS統合）、S03（CI/CD統合）
- **DevOps/SRE向けデモ**: S07（コンテナトレーサビリティ）、S08（ランタイム優先順位付け）
- **CISO/経営層向け**: S10（インシデント対応）、S11（AWS Inspector比較）

---

## ❓ よくある質問（FAQ）

### Q1: どのガイドから読めばいいですか？

A: 初めての方は、このREADMEを読んだ後、[MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)から開始してください。

### Q2: Windows環境でも実施できますか？

A: はい、可能です。[WINDOWS_SETUP_GUIDE.md](./WINDOWS_SETUP_GUIDE.md)とPowerShellスクリプトを用意しています。

### Q3: AWS環境がない場合は？

A: Phase 1（S01-S05）はAWS不要で実施可能です。[MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)のPhase 1セットアップを参照してください。

### Q4: ガイドが多すぎて何を読めばいいかわかりません

A: [推奨読了順序](#初めての方へ---推奨読了順序)または[目的別ガイド選択](#-目的別ガイド選択)を参照してください。

### Q5: トラブルが発生しました

A: [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)を参照するか、各ガイドの「トラブルシューティング」セクションを確認してください。

---

## 📞 サポート

### TIS社内サポート
- Slackチャネル: #wiz-verification
- メール: wiz-team@tis.co.jp

### 外部サポート
- [Wiz公式ドキュメント](https://docs.wiz.io/)
- [Wiz Support Portal](https://support.wiz.io/)

---

## 🔄 ドキュメント更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|---------|
| 2025-12-03 | 2.0.0 | ガイド全体の再構成、ナビゲーション強化 |
| 2025-11-28 | 1.0.0 | 初版作成 |

---

**次のステップ**: [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)を読んでセットアップを開始してください。
