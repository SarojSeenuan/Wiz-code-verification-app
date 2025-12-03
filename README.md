# WizCode 検証プロジェクト

## 📚 はじめに

**初めての方へ**: このプロジェクトには複数のガイドがあります。まずは **[ガイド一覧](docs/guides/README.md)** で全体像を把握することをお勧めします。

**クイックスタート**:
- **[手動セットアップガイド](docs/guides/MANUAL_SETUP_GUIDE.md)** - GitHub、Wiz、AWS認証情報の取得と設定方法
- **[Windows環境セットアップ](docs/guides/WINDOWS_SETUP_GUIDE.md)** - PowerShellでの環境構築（Windows利用者向け）
- **[環境変数管理ガイド](docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md)** - Phase別の環境変数設定

## 概要

本プロジェクトは、Wiz Codeのセキュリティ機能を包括的に検証するための実践的なガイドです。開発段階からランタイムまで、セキュリティを一貫して管理するWiz Codeの能力を実証することを目的としています。

## プロジェクト構成

```
WizCodeVerification/
├── README.md                    # 本ファイル（プロジェクト概要）
├── SCENARIO_MAP.md              # 検証シナリオ構成図
├── CLAUDE.md                    # Claude Code向け指示書
├── .env.phase1.template         # Phase 1環境変数テンプレート
├── .env.phase2.template         # Phase 2環境変数テンプレート
│
├── docs/                        # ドキュメント
│   ├── guides/                 # セットアップ・検証ガイド
│   │   ├── README.md           # ガイドナビゲーションハブ
│   │   ├── MANUAL_SETUP_GUIDE.md
│   │   ├── WINDOWS_SETUP_GUIDE.md
│   │   ├── ENVIRONMENT_VARIABLES_GUIDE.md
│   │   ├── BRANCH_MANAGEMENT_GUIDE.md
│   │   ├── EVIDENCE_COLLECTION_GUIDE.md
│   │   └── AWS_DEPLOYMENT_GUIDE.md
│   │
│   ├── overview/               # 全体概要
│   │   └── verification-design.md
│   │
│   ├── phase1-shift-left/      # Phase 1: シフトレフト
│   │   ├── README.md
│   │   ├── S01-ide-integration.md
│   │   ├── S02-vcs-integration.md
│   │   ├── S03-cicd-integration.md
│   │   ├── S04-iac-scanning.md
│   │   └── S05-secret-detection.md
│   │
│   ├── phase2-code-to-cloud/   # Phase 2: Code-to-Cloud
│   │   ├── README.md
│   │   ├── S06-sbom-tracking.md
│   │   ├── S07-container-traceability.md
│   │   ├── S08-runtime-prioritization.md
│   │   └── S09-iac-drift-detection.md
│   │
│   └── phase3-integration/     # Phase 3: 統合・比較
│       ├── README.md
│       ├── S10-incident-response.md
│       └── S11-aws-inspector-comparison.md
│
├── scripts/                    # 検証用スクリプト（プロジェクト全体で使用）
│   ├── validate-env.ps1        # 環境変数検証（PowerShell）
│   ├── validate-env.sh         # 環境変数検証（Bash）
│   ├── run-wiz-scan.ps1        # Wizスキャン実行（PowerShell）
│   └── run-wiz-scan.sh         # Wizスキャン実行（Bash）
│
├── taskflow-app/               # TaskFlowアプリケーション（実行可能なサンプルアプリ）
│   ├── .github/workflows/      # CI/CDワークフロー（S03-S07）
│   ├── backend/                # バックエンド（Node.js/Express）
│   ├── frontend/               # フロントエンド（Next.js/React）
│   ├── terraform/              # IaC（Terraform modules + environments）
│   └── k8s/                    # Kubernetes manifests（Kustomize構造）
│
├── comparison/                 # S11用：比較検証
│   ├── aws-inspector/
│   └── wiz/
│
└── evidence/                   # 検証エビデンス
    ├── phase1/
    ├── phase2/
    └── phase3/
```

## 検証シナリオ

### Phase 1: シフトレフト機能の検証（開発段階のセキュリティ）

開発者がコードを書く段階で、セキュリティ問題を早期発見・修正することを検証します。

| シナリオ | タイトル | 内容 | 所要時間 |
|---------|---------|------|---------|
| [S01](docs/phase1-shift-left/S01-ide-integration.md) | IDE統合 | VSCode拡張機能によるリアルタイム脆弱性検出 | 1-2時間 |
| [S02](docs/phase1-shift-left/S02-vcs-integration.md) | VCS統合 | GitHub AppによるPR自動スキャン | 2-3時間 |
| [S03](docs/phase1-shift-left/S03-cicd-integration.md) | CI/CD統合 | GitHub ActionsでのWiz CLI統合 | 2-3時間 |
| [S04](docs/phase1-shift-left/S04-iac-scanning.md) | IaCスキャン | Terraform設定ミスの検出 | 2-3時間 |
| [S05](docs/phase1-shift-left/S05-secret-detection.md) | シークレット検出 | ハードコードされたシークレット検出 | 1-2時間 |

### Phase 2: Code-to-Cloud トレーサビリティの検証

デプロイされたリソースをソースコードまで遡り、影響範囲を特定する機能を検証します。

| シナリオ | タイトル | 内容 | 所要時間 |
|---------|---------|------|---------|
| [S06](docs/phase2-code-to-cloud/S06-sbom-tracking.md) | SBOM生成と追跡 | 依存関係の完全な追跡 | 2-3時間 |
| [S07](docs/phase2-code-to-cloud/S07-container-traceability.md) | コンテナトレーサビリティ | AWS ECS/EKSからソースコードへの追跡 | 3-4時間 |
| [S08](docs/phase2-code-to-cloud/S08-runtime-prioritization.md) | ランタイム優先順位付け | 実行中パッケージの脆弱性優先順位付け | 2-3時間 |
| [S09](docs/phase2-code-to-cloud/S09-iac-drift-detection.md) | IaC Drift検出 | 手動変更の検出とコード追跡 | 2-3時間 |

### Phase 3: 統合シナリオと比較検証

実際のインシデント対応や他ツールとの比較を通じて、Wiz Codeの総合力を検証します。

| シナリオ | タイトル | 内容 | 所要時間 |
|---------|---------|------|---------|
| [S10](docs/phase3-integration/S10-incident-response.md) | インシデント対応フロー | Log4Shell等の重大脆弱性への対応 | 3-4時間 |
| [S11](docs/phase3-integration/S11-aws-inspector-comparison.md) | AWS Inspector比較 | 定量的な比較検証 | 4-6時間 |

## クイックスタート

### 前提条件

#### 必須アカウント
- **Wiz**: 検証環境へのアクセス権限
- **GitHub**: リポジトリ作成・管理権限
- **AWS**: ECS/EKS環境構築権限（Phase 2以降）

#### 必須ツール
```bash
# 必須ツールのバージョン確認
code --version        # Visual Studio Code
git --version         # Git 2.x+
docker --version      # Docker 20.x+
aws --version         # AWS CLI 2.x+
```

#### Wiz認証情報
```bash
export WIZ_CLIENT_ID="your_client_id"
export WIZ_CLIENT_SECRET="your_client_secret"
```

### セットアップガイド

初めて環境をセットアップする場合は、以下のガイドを参照してください：

#### 🔰 必読ガイド
- **[ガイド一覧](docs/guides/README.md)** - すべてのガイドへのナビゲーションハブ
- **[手動セットアップガイド](docs/guides/MANUAL_SETUP_GUIDE.md)** - GitHub、Wiz、AWS認証情報の取得と設定方法

#### 🪟 Windows利用者向け
- **[Windows環境セットアップ](docs/guides/WINDOWS_SETUP_GUIDE.md)** - PowerShell完全対応の環境構築手順

#### ⚙️ 環境設定
- **[環境変数管理ガイド](docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md)** - Phase別の環境変数設定と.envファイル管理

#### 🌿 ブランチ管理
- **[ブランチ管理ガイド](docs/guides/BRANCH_MANAGEMENT_GUIDE.md)** - 再検証用のブランチ戦略とGit操作

#### ☁️ AWS環境構築（Phase 2以降）
- **[AWS Deployment Guide](docs/guides/AWS_DEPLOYMENT_GUIDE.md)** - ECS Fargate、ECR、RDS等のデプロイ手順（2-3時間）

#### 📸 エビデンス収集
- **[エビデンス収集ガイド](docs/guides/EVIDENCE_COLLECTION_GUIDE.md)** - 検証結果のスクリーンショットとレポート作成方法

#### ローカル開発環境のクイックスタート

```bash
# 1. PostgreSQLデータベースを起動
docker-compose up -d

# 2. バックエンドのセットアップ
cd taskflow-app/backend
npm install
npm run dev

# 3. フロントエンドのセットアップ（別ターミナル）
cd taskflow-app/frontend
npm install
npm run dev
```

アプリケーションにアクセス：
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3001
- **pgAdmin**（オプション）: http://localhost:5050

### 推奨実施順序（利用者別）

#### 🚀 クイックスタート（1日目標、AWS環境不要）
**対象**: Wiz Codeの基本機能を素早く体験したい方

1. **[手動セットアップガイド](docs/guides/MANUAL_SETUP_GUIDE.md)** - Wiz認証情報とGitHub設定（30分）
2. **[S01: IDE統合](docs/phase1-shift-left/S01-ide-integration.md)** - VSCodeでリアルタイムスキャン（1時間）
3. **[S03: CI/CD統合](docs/phase1-shift-left/S03-cicd-integration.md)** - GitHub Actionsでのスキャン（1-2時間）
4. **[S05: シークレット検出](docs/phase1-shift-left/S05-secret-detection.md)** - ハードコードされた認証情報検出（1時間）

**合計**: 約4-5時間

#### 👨‍💻 開発者向け（Phase 1完全版、AWS環境不要）
**対象**: シフトレフトセキュリティを深く理解したい開発者

1. **事前準備**: [手動セットアップガイド](docs/guides/MANUAL_SETUP_GUIDE.md) + [環境変数管理ガイド](docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md)
2. **Phase 1実施**: [Phase 1 README](docs/phase1-shift-left/README.md) → S01からS05まで順番に実施
3. **成果確認**: [エビデンス収集ガイド](docs/guides/EVIDENCE_COLLECTION_GUIDE.md) でスクリーンショット取得

**合計**: 約2日間（10-15時間）

#### 🏗️ DevOps/SREエンジニア向け（Phase 1 + 2、AWS環境必要）
**対象**: Code-to-Cloudトレーサビリティまで検証したい方

1. **事前準備**: [SCENARIO_MAP.md](SCENARIO_MAP.md) で全体像把握
2. **Phase 1**: S01-S05を実施（10-15時間）
3. **AWS環境構築**: [AWS Deployment Guide](docs/guides/AWS_DEPLOYMENT_GUIDE.md) でECS環境構築（2-3時間）
4. **Phase 2実施**: [Phase 2 README](docs/phase2-code-to-cloud/README.md) → S06からS09まで実施
5. **成果確認**: SBOMファイル、Code-to-Cloudリンク、Drift検出結果を収集

**合計**: 約4日間（25-35時間）

#### 🎯 完全検証（全Phase、CISO/経営層向けデモ準備）
**対象**: Wiz Codeの全機能を網羅的に検証し、顧客提案資料を作成したい方

1. **事前準備**:
   - [SCENARIO_MAP.md](SCENARIO_MAP.md) - 全体像把握
   - [手動セットアップガイド](docs/guides/MANUAL_SETUP_GUIDE.md) - 環境構築
   - [ブランチ管理ガイド](docs/guides/BRANCH_MANAGEMENT_GUIDE.md) - 再検証戦略理解

2. **Phase 1**: S01-S05（10-15時間）

3. **Phase 2**: AWS環境構築 + S06-S09（15-20時間）

4. **Phase 3**: インシデント対応 + 比較検証
   - [S10: インシデント対応](docs/phase3-integration/S10-incident-response.md) - Log4Shell対応フロー（3-4時間）
   - [S11: AWS Inspector比較](docs/phase3-integration/S11-aws-inspector-comparison.md) - 定量比較検証（4-6時間）

5. **エビデンス整理**: [エビデンス収集ガイド](docs/guides/EVIDENCE_COLLECTION_GUIDE.md) - 全シナリオの結果を整理

**合計**: 約6日間（40-50時間）

#### 🪟 Windows利用者向け
**対象**: PowerShell環境で検証を実施したい方

1. **[Windows環境セットアップ](docs/guides/WINDOWS_SETUP_GUIDE.md)** - PowerShell完全対応の環境構築
2. 上記の推奨順序に従って実施（コマンドはすべてPowerShell対応済み）

## 重要な注意事項

### セキュリティ警告

本プロジェクトには、**意図的に脆弱性を含むコード**が含まれています。

- 絶対に本番環境では使用しないでください
- 検証環境を隔離してください
- 実際の認証情報は使用しないでください
- 検証終了後は環境を適切にクリーンアップしてください

### リポジトリの目的

このリポジトリは以下の目的で作成されています:

1. **Wiz Code機能の包括的検証**
2. **TIS社内での知識共有**
3. **顧客デモ・提案資料の作成**

## 検証結果の活用

### 成果物

各Phaseの検証完了後、以下の成果物を作成します:

1. **検証レポート**
   - 各シナリオの実施結果
   - スクリーンショット
   - 学びと推奨事項

2. **エビデンス**
   - [evidence/](evidence/) ディレクトリに格納
   - スクリーンショット、ログファイル等

3. **比較データ**（S11実施時）
   - AWS Inspector vs Wiz の定量比較
   - Excel/CSV形式のデータ

### 顧客提案への活用

本検証結果は、以下のような顧客提案に活用できます:

- **課題**: 開発速度とセキュリティの両立
- **解決策**: Wiz CodeによるShift-left Security
- **効果**: 脆弱性検出時間を90%削減（S10実証値）

## よくある質問（FAQ）

### Q1: すべてのシナリオを実施する必要がありますか？

必須ではありません。目的に応じて選択してください:

- **開発者向けデモ**: Phase 1（S01-S05）
- **DevOps/SREデモ**: Phase 1 + Phase 2
- **CISO/経営層向け**: 全Phase + S10、S11

### Q2: AWS環境がない場合は？

Phase 1（S01-S05）はAWS不要で実施可能です。Phase 2以降はAWSが必要ですが、AWS Free Tierでも実施できます。

### Q3: 検証にかかる総時間は？

- **Phase 1のみ**: 約2日間（10-15時間）
- **Phase 1 + 2**: 約4日間（25-35時間）
- **全Phase**: 約6日間（40-50時間）

### Q4: エラーが発生した場合は？

各シナリオドキュメントの「トラブルシューティング」セクションを参照してください。解決しない場合は、TIS Wizチームに相談してください。

### Q5: Windows環境でも実施できますか？

はい、可能です。**[Windows環境セットアップ](docs/guides/WINDOWS_SETUP_GUIDE.md)** ガイドに従ってPowerShell環境で実施できます。すべてのコマンドがPowerShell対応済みです。

### Q6: 環境変数の管理方法は？

**[環境変数管理ガイド](docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md)** を参照してください。Phase別の`.env`ファイルテンプレートと検証スクリプトが用意されています。

### Q7: 再検証時のブランチ管理は？

**[ブランチ管理ガイド](docs/guides/BRANCH_MANAGEMENT_GUIDE.md)** を参照してください。クリーンな状態で再検証するためのブランチ戦略が記載されています。

## サポート

### 外部サポート
- [Wiz公式ドキュメント](https://docs.wiz.io/)
- [Wiz Support Portal](https://support.wiz.io/)

## 参考資料

### 公式ドキュメント
- [Wiz Code Documentation](https://docs.wiz.io/wiz-docs/docs/wiz-code)
- [Wiz CLI Reference](https://docs.wiz.io/wiz-docs/docs/wiz-cli)
- [GitHub Actions Integration](https://docs.wiz.io/wiz-docs/docs/github-actions-integration)

### 関連技術
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks)
- [NIST SBOM](https://www.nist.gov/itl/executive-order-improving-nations-cybersecurity/software-security-supply-chains-software-1)

## 貢献・フィードバック

本プロジェクトへのフィードバックや改善提案は、以下の方法で受け付けています:

- GitHub Issues（内部リポジトリの場合）
- TIS内部Slackチャネル
- プルリクエスト（改善提案）

## ライセンス・利用規約

本プロジェクトは、**TIS株式会社の内部利用およびWiz検証目的**で作成されました。

- 外部への配布には TISの承認が必要
- 商用利用には制限があります
- サンプルコードは検証目的のみ使用可能

## 更新履歴

| 日付 | バージョン | 更新内容 |
|------|-----------|---------|
| 2025-11-28 | 2.0.0 | 新シナリオ構成（S01-S11）への全面刷新 |
| 2025-11-19 | 1.0.0 | 初版作成 - シナリオ1-10の完全版手順書 |

---

**それでは、Wiz Code検証を始めましょう！**

### 📖 次のステップ

#### 初めての方
1. **[ガイド一覧](docs/guides/README.md)** - すべてのガイドへのナビゲーションハブ
2. **[SCENARIO_MAP.md](SCENARIO_MAP.md)** - 全体像の把握
3. **[手動セットアップガイド](docs/guides/MANUAL_SETUP_GUIDE.md)** - 環境構築開始

#### 環境構築済みの方
- **[Phase 1 README](docs/phase1-shift-left/README.md)** - シナリオ実施開始

#### Windows利用者
- **[Windows環境セットアップ](docs/guides/WINDOWS_SETUP_GUIDE.md)** - PowerShell環境構築
