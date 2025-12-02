# エビデンス収集ガイド

本ガイドでは、WizCode検証のエビデンス（証拠）を収集し、顧客提案資料を作成する方法を説明します。

> **📌 このドキュメントを読むべきタイミング**
> 各シナリオ実施時、または提案資料作成時に読んでください。

> **📖 次に読むべきドキュメント**
> 各シナリオドキュメント（スクリーンショット取得ポイント確認）

> **🔙 ガイド一覧に戻る**
> [ガイド一覧](./README.md)

---

## 目次

1. [エビデンスの種類](#エビデンスの種類)
2. [スクリーンショット取得方法](#スクリーンショット取得方法)
3. [Phase別収集ポイント](#phase別収集ポイント)
4. [ディレクトリ構造](#ディレクトリ構造)
5. [ファイル命名規則](#ファイル命名規則)
6. [顧客提案資料への活用](#顧客提案資料への活用)
7. [エビデンステンプレート](#エビデンステンプレート)

---

## エビデンスの種類

### 1. スクリーンショット

**対象**:
- Wiz IDEプラグインの検出画面
- GitHub PRのコメント
- Wiz Consoleのスキャン結果
- AWS Consoleの設定画面
- GitHub Actionsのワークフロー実行結果

**形式**: PNG, JPEG
**推奨解像度**: 1920x1080以上

### 2. ログファイル

**対象**:
- Wiz CLIスキャンログ
- GitHub Actionsジョブログ
- アプリケーションログ
- データベースログ

**形式**: TXT, LOG, JSON

### 3. レポートファイル

**対象**:
- Wizスキャンレポート（JSON/PDF）
- SBOM（CycloneDX/SPDX）
- 比較レポート（S11: AWS Inspector vs Wiz）

**形式**: JSON, PDF, CSV, XLSX

### 4. 設定ファイル

**対象**:
- .github/workflows/*.yml
- terraform/*.tf
- docker-compose.yml
- .env.example

**形式**: YAML, HCL, JSON

---

## スクリーンショット取得方法

### Windows

#### 方法1: Snipping Tool（推奨）

1. **Windows + Shift + S**を押す
2. 範囲を選択
3. クリップボードに自動コピー
4. ペイントまたはPowerPointに貼り付けて保存

#### 方法2: Print Screen

```powershell
# 全画面キャプチャ
PrintScreen

# アクティブウィンドウのみ
Alt + PrintScreen
```

#### 方法3: Snipping Toolアプリ

```powershell
# Snipping Toolを起動
start snippingtool
```

### macOS

#### 方法1: スクリーンショット（推奨）

```bash
# 範囲を選択してキャプチャ
Command + Shift + 4

# ウィンドウ全体をキャプチャ
Command + Shift + 4, 次にSpaceキーを押してウィンドウをクリック

# 全画面キャプチャ
Command + Shift + 3
```

#### 方法2: Screencaptureコマンド

```bash
# 範囲選択
screencapture -i evidence/screenshot.png

# ウィンドウ選択
screencapture -w evidence/screenshot.png
```

### Linux（Ubuntu/Debian）

```bash
# Gnome Screenshot（範囲選択）
gnome-screenshot -a

# Spectacle（KDE）
spectacle -r

# scrot（コマンドライン）
scrot evidence/screenshot.png
```

---

## Phase別収集ポイント

### Phase 1: シフトレフト（S01-S05）

#### S01: IDE統合

**収集するエビデンス**:
1. VSCode左側のWizパネル（脆弱性一覧）
2. 脆弱性が検出されたコード部分（行番号表示）
3. 修正提案のポップアップ
4. Wizコンソールの検出結果

**キャプチャ手順**:
```markdown
1. VSCodeでバックエンドコードを開く
2. Wizパネルを開く（左側メニュー）
3. 検出された脆弱性をクリック
4. コードエディタとWizパネルが両方映るようにウィンドウサイズを調整
5. スクリーンショットを撮影

ファイル名: s01_ide_vscode_detection.png
```

#### S02: VCS統合

**収集するエビデンス**:
1. GitHub PRページ全体
2. Wizコメント（インラインコメント）
3. Files changedタブのインラインコメント
4. Checksタブ（Wizスキャン結果）

**キャプチャ手順**:
```markdown
1. PRページを開く
2. Conversationタブでスクロールしてコメント全体を表示
3. スクリーンショットを撮影
4. Files changedタブに移動
5. 脆弱性が検出された行のインラインコメントを撮影

ファイル名:
- s02_vcs_pr_comment.png
- s02_vcs_pr_inline_comment.png
```

#### S03: CI/CD統合

**収集するエビデンス**:
1. GitHub Actionsワークフロー実行画面
2. ジョブログ（Wizスキャン部分）
3. スキャン結果サマリー
4. Artifactsダウンロード画面

**キャプチャ手順**:
```markdown
1. GitHub → Actions → 該当ワークフローを開く
2. ワークフロー全体が映るようにスクリーンショットを撮影
3. 各ジョブ（source-code-scan, docker-build-and-scan等）を展開
4. Wizスキャン実行部分のログを撮影

ファイル名:
- s03_cicd_workflow_overview.png
- s03_cicd_wiz_scan_log.png
```

#### S04: IaCスキャン

**収集するエビデンス**:
1. Wiz CLIスキャン実行結果（ターミナル）
2. Wizコンソールの検出結果（IaC設定ミス）
3. Terraformコード（脆弱性部分）
4. 修正提案

**キャプチャ手順**:
```markdown
1. ターミナルでWiz CLIスキャンを実行
2. スキャン結果全体を撮影
3. Wizコンソール → Findings → IaC Misconfigurations
4. 検出された設定ミスの詳細を撮影

ファイル名:
- s04_iac_cli_scan_result.png
- s04_iac_wiz_console_findings.png
```

#### S05: シークレット検出

**収集するエビデンス**:
1. Wiz CLIシークレットスキャン結果
2. Wizコンソールのシークレット一覧
3. 検出されたシークレットの詳細（種類、場所）
4. GitHub PRでの検出（S02と併用）

**キャプチャ手順**:
```markdown
1. wizcli dir scan --secret-scan-only を実行
2. 検出されたシークレット一覧を撮影
3. Wizコンソール → Secrets
4. 検出されたシークレットの詳細を撮影

ファイル名:
- s05_secret_cli_detection.png
- s05_secret_wiz_console.png
```

---

### Phase 2: Code-to-Cloud（S06-S09）

#### S06: SBOM生成と追跡

**収集するエビデンス**:
1. SBOM生成コマンド実行結果
2. 生成されたSBOMファイル（JSON）の一部
3. Wizコンソールのパッケージ一覧
4. 脆弱性のあるパッケージの詳細

**キャプチャ手順**:
```markdown
1. wizcli docker scan --sbom-output sbom.json を実行
2. 生成されたSBOMファイルをテキストエディタで開く
3. JSONの構造が見えるようにスクリーンショットを撮影
4. Wizコンソール → Packages → 脆弱性のあるパッケージを撮影

ファイル名:
- s06_sbom_generation.png
- s06_sbom_json_preview.png
```

#### S07: コンテナトレーサビリティ

**収集するエビデンス**:
1. AWS ECS/EKSコンソール（デプロイされたコンテナ）
2. Wizコンソール → Security Graph（トレーサビリティ）
3. ECRイメージ詳細
4. GitHubリポジトリへのリンク

**キャプチャ手順**:
```markdown
1. AWS ECS → Clusters → Services → Tasks
2. 実行中のタスクを撮影
3. Wizコンソール → Security Graph
4. コンテナをクリックして「Code」タブを開く
5. ソースコードへのリンクが表示されることを確認して撮影

ファイル名:
- s07_aws_ecs_running_tasks.png
- s07_wiz_security_graph.png
- s07_wiz_code_traceability.png
```

#### S08: ランタイム優先順位付け

**収集するエビデンス**:
1. Wizコンソールの脆弱性リスト（優先順位付き）
2. 実行中vs未使用パッケージの区別
3. リスクスコア
4. 修正提案

**キャプチャ手順**:
```markdown
1. Wizコンソール → Vulnerabilities
2. フィルター:「In Use」を選択
3. 優先順位が高い脆弱性を撮影
4. 「Not In Use」フィルターに切り替えて比較

ファイル名:
- s08_wiz_runtime_vulnerabilities.png
- s08_wiz_priority_comparison.png
```

#### S09: IaC Drift検出

**収集するエビデンス**:
1. AWSコンソールでの手動変更（例：SG変更）
2. Wizコンソール → Drift検出結果
3. TerraformコードとAWS実際の設定の差分
4. 修正提案

**キャプチャ手順**:
```markdown
1. AWSコンソールでセキュリティグループを手動変更
2. 変更後の設定を撮影
3. Wizコンソール → IaC Drift
4. 検出されたDriftの詳細を撮影

ファイル名:
- s09_aws_manual_change.png
- s09_wiz_drift_detection.png
```

---

### Phase 3: 統合シナリオ（S10-S11）

#### S10: インシデント対応フロー

**収集するエビデンス**:
1. Wiz Threat Centerでの脆弱性認知
2. Security Graphでの影響範囲特定
3. ソースコード特定
4. 修正コミット
5. 修正後の再スキャン結果

**タイムライン記録**:
```markdown
| ステップ | 開始時刻 | 終了時刻 | 所要時間 |
|---------|---------|---------|---------|
| 脆弱性認知 | 10:00 | 10:02 | 2分 |
| 影響範囲特定 | 10:02 | 10:05 | 3分 |
| コード特定 | 10:05 | 10:07 | 2分 |
| 修正実施 | 10:07 | 10:30 | 23分 |
| CI/CDビルド | 10:30 | 10:40 | 10分 |
| デプロイ | 10:40 | 10:45 | 5分 |
| 修正確認 | 10:45 | 10:50 | 5分 |
| **合計** | - | - | **50分** |
```

#### S11: AWS Inspector比較

**収集するエビデンス**:
1. AWS Inspector有効化画面
2. AWS Inspectorスキャン結果
3. Wizスキャン結果
4. 比較表（Excel/CSV）

**比較表テンプレート**:
```csv
項目,AWS Inspector,Wiz,Wizの優位
脆弱性検出数,120,145,+25件
検出精度（False Positive）,15%,5%,-10%
ソースコードへの追跡,なし,あり,✓
SBOM生成,あり,あり,-
Code-to-Cloud,なし,あり,✓
優先順位付け,限定的,包括的,✓
マルチクラウド,なし,あり,✓
```

---

## ディレクトリ構造

```
evidence/
├── phase1/
│   ├── s01-ide-integration/
│   │   ├── screenshots/
│   │   │   ├── s01_ide_vscode_detection.png
│   │   │   ├── s01_ide_popup_suggestion.png
│   │   │   └── s01_wiz_console_findings.png
│   │   ├── logs/
│   │   │   └── vscode-wiz-extension.log
│   │   └── README.md
│   ├── s02-vcs-integration/
│   │   ├── screenshots/
│   │   ├── logs/
│   │   └── README.md
│   └── ...（S03-S05）
├── phase2/
│   ├── s06-sbom-tracking/
│   ├── s07-container-traceability/
│   └── ...（S08-S09）
└── phase3/
    ├── s10-incident-response/
    └── s11-aws-inspector-comparison/
        ├── screenshots/
        ├── reports/
        │   ├── aws_inspector_report.pdf
        │   ├── wiz_report.pdf
        │   └── comparison.xlsx
        └── README.md
```

---

## ファイル命名規則

### スクリーンショット

```
<シナリオID>_<カテゴリ>_<内容>_<番号>.png
```

**例**:
- `s01_ide_vscode_detection_01.png`
- `s02_vcs_pr_comment_01.png`
- `s03_cicd_workflow_overview_01.png`

### ログファイル

```
<シナリオID>_<ツール>_<タイプ>_<日付>.log
```

**例**:
- `s03_wizcli_scan_20251203.log`
- `s06_github_actions_20251203.log`

### レポートファイル

```
<シナリオID>_<ツール>_report_<日付>.<拡張子>
```

**例**:
- `s06_wizcli_sbom_20251203.json`
- `s11_aws_inspector_report_20251203.pdf`
- `s11_comparison_20251203.xlsx`

---

## 顧客提案資料への活用

### ステップ1: エビデンスの整理

```bash
# エビデンスディレクトリに移動
cd evidence/

# フェーズごとにエビデンスを確認
ls -R phase1/
ls -R phase2/
ls -R phase3/
```

### ステップ2: PowerPoint資料作成

**推奨構成**:

1. **表紙**: プロジェクト名、実施日、担当者
2. **目次**: Phase 1-3の概要
3. **Phase 1（5-10スライド）**:
   - S01: IDE統合のデモ（スクリーンショット）
   - S02: VCS統合のデモ
   - S03: CI/CD統合のデモ
   - S04: IaCスキャンのデモ
   - S05: シークレット検出のデモ
4. **Phase 2（5-10スライド）**:
   - S06: SBOM生成
   - S07: Code-to-Cloud トレーサビリティ
   - S08: ランタイム優先順位付け
   - S09: IaC Drift検出
5. **Phase 3（5-10スライド）**:
   - S10: インシデント対応フロー（タイムライン）
   - S11: AWS Inspector比較（比較表）
6. **まとめ**: Wizの価値提案、ROI、次のステップ

### ステップ3: 提案資料テンプレート

**スライド例（S01: IDE統合）**:

```markdown
# S01: IDE統合デモ

## 検証目的
開発者がコードを書いている最中に、リアルタイムでセキュリティ問題を検出

## デモ内容
- VSCodeにWiz拡張機能をインストール
- 意図的にSQL注入脆弱性を含むコードを作成
- Wizがリアルタイムで警告を表示

## 結果
- ✅ SQL注入脆弱性を即座に検出
- ✅ 修正提案を表示
- ✅ コミット前に開発者が修正可能

## スクリーンショット
[s01_ide_vscode_detection.png]

## 顧客への価値
- 開発速度を落とさずにセキュリティを向上
- セキュリティチームへのエスカレーション不要
- コスト削減: 脆弱性修正コストを90%削減
```

---

## エビデンステンプレート

### README.md（各シナリオディレクトリ）

```markdown
# S01: IDE統合 - 検証エビデンス

## 実施日
2025年12月3日

## 実施者
- 担当者: 山田太郎
- レビュアー: 佐藤花子

## 検証環境
- OS: Windows 11
- VSCode: 1.85.0
- Wiz拡張機能: 1.2.3
- Node.js: 18.18.0

## 検証内容
意図的にSQL注入脆弱性とXSS脆弱性を含むコードを作成し、Wiz IDEプラグインが検出できることを確認した。

## 検証結果
- ✅ SQL注入脆弱性を検出（tasks.js:45）
- ✅ XSS脆弱性を検出（api.js:102）
- ✅ 修正提案を表示
- ✅ ワンクリック修正機能を確認

## 収集したエビデンス
- `screenshots/s01_ide_vscode_detection.png`: VSCode検出画面
- `screenshots/s01_ide_popup_suggestion.png`: 修正提案ポップアップ
- `screenshots/s01_wiz_console_findings.png`: Wizコンソールの検出結果
- `logs/vscode-wiz-extension.log`: Wiz拡張機能のログ

## 課題・所見
- 検出速度: コード入力後2秒以内に検出（期待通り）
- 精度: False Positive なし
- UX: 開発者にとって非侵襲的なフィードバック

## 次のステップ
- S02（VCS統合）の検証に進む
- エビデンスを提案資料に統合
```

---

## 次のステップ

エビデンス収集方法を理解したら、以下のドキュメントに進んでください：

1. **各シナリオドキュメント** - 具体的な収集ポイントを確認
2. **顧客提案資料作成** - PowerPointテンプレートを使用
3. **[README.md](../../README.md)** - プロジェクト全体に戻る

---

## 参考資料

- [スクリーンショットツール比較](https://www.example.com/screenshot-tools)
- [PowerPoint資料作成のベストプラクティス](https://www.example.com/powerpoint-best-practices)
- [エビデンス管理のガイドライン](https://www.example.com/evidence-management)

---

**🔙 [ガイド一覧に戻る](./README.md)**
