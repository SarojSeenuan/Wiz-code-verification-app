# Phase 1: シフトレフト機能の検証

## 概要

Phase 1では、開発段階でセキュリティ問題を早期発見・修正する「シフトレフト」アプローチの有効性を検証します。開発者がコードを書く段階から、VCS、CI/CDまで、各段階でのセキュリティチェックを実装します。

## シナリオ一覧

### [S01: IDE統合](S01-ide-integration.md)
VSCodeにWiz Code拡張機能を統合し、コーディング中のリアルタイム脆弱性検出を検証します。

**検証項目**
- VSCode拡張機能のインストールと設定
- リアルタイム脆弱性検出
- 修正提案の表示
- SQLインジェクション、XSS等の検出精度

### [S02: VCS統合](S02-vcs-integration.md)
GitHub AppとしてWiz Codeを連携し、プルリクエスト作成時の自動スキャンを検証します。

**検証項目**
- GitHub App連携設定
- PR作成時の自動スキャン
- スキャン結果のPRコメント表示
- マージブロック機能

### [S03: CI/CD統合](S03-cicd-integration.md)
GitHub ActionsワークフローにWiz CLIを組み込み、CI/CDパイプラインでのスキャンを検証します。

**検証項目**
- Wiz CLIのワークフロー統合
- ソースコードスキャン（SAST）
- コンテナイメージスキャン
- SBOM生成
- パイプライン失敗時の動作

### [S04: IaCスキャン](S04-iac-scanning.md)
Infrastructure as Code（Terraform）の設定ミスを事前に検出できることを検証します。

**検証項目**
- Terraformコードのスキャン
- 設定ミスの検出（RDS公開、暗号化なし等）
- コンプライアンス基準との照合
- 修正ガイダンスの提供

### [S05: シークレット検出](S05-secret-detection.md)
ソースコードやコンテナイメージ内のハードコードされたシークレットを検出できることを検証します。

**検証項目**
- ハードコードされたシークレットの検出
- シークレット種類の特定（AWS Key、API Token等）
- IDE、VCS、CI/CDの各段階での検出
- 検出精度とFalse Positive率

## 成功基準

Phase 1のすべてのシナリオで以下が達成されること:

1. **検出精度**: 意図的に埋め込んだ脆弱性がすべて検出される
2. **フィードバック品質**: 開発者が理解できる明確な説明と修正提案が提供される
3. **統合性**: IDE、VCS、CI/CDのすべての段階で正常に動作する
4. **パフォーマンス**: スキャン実行が開発フローを妨げない速度で完了する
5. **False Positive**: 誤検知が許容範囲内（10%未満）

## 実行順序

Phase 1のシナリオは以下の順序で実行することを推奨します:

1. S01（IDE統合）- 開発者の最初の接点
2. S02（VCS統合）- コミット前のチェック
3. S03（CI/CD統合）- 自動化されたスキャン
4. S04（IaCスキャン）- インフラ設定の検証
5. S05（シークレット検出）- 全段階での横断検証

## 前提条件

Phase 1の検証を開始する前に、以下が必要です:

### 必須ツール
- Visual Studio Code (最新版)
- Git
- GitHub アカウント
- Docker Desktop
- Node.js 18+
- Terraform 1.6+

### Wiz設定
- Wiz テナントへのアクセス
- Wiz Code有効化
- Service Account作成（CI/CD用）
- GitHub App連携設定完了

### 環境変数
```bash
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
```

## Phase 2への接続

Phase 1で検出された脆弱性のうち、実際にデプロイされた環境で影響があるものを特定するため、Phase 2（Code-to-Cloud トレーサビリティ）に進みます。

## 参考資料

- [Wiz Code公式ドキュメント](https://docs.wiz.io/wiz-docs/docs/wiz-code)
- [Wiz CLI リファレンス](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [GitHub Actions連携ガイド](https://docs.wiz.io/wiz-docs/docs/github-actions-integration)
- [VSCode拡張機能ガイド](https://docs.wiz.io/wiz-docs/docs/vscode-extension)
