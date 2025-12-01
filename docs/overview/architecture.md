# Wiz Code検証プロジェクト アーキテクチャ

## 概要

本ドキュメントでは、Wiz Code検証プロジェクトの技術アーキテクチャと、検証対象となるTaskFlowアプリケーションの構成を説明します。

## システム全体構成

```
┌─────────────────────────────────────────────────────────────────┐
│                        開発環境（ローカル）                        │
├─────────────────────────────────────────────────────────────────┤
│  VSCode + Wiz Extension                                         │
│  ├─ リアルタイムスキャン                                           │
│  ├─ インラインフィードバック                                        │
│  └─ ワンクリック修正                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │ git push
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub（ソースコード管理）                      │
├─────────────────────────────────────────────────────────────────┤
│  GitHub Repository                                              │
│  ├─ ソースコード (TypeScript, Node.js)                           │
│  ├─ IaC (Terraform)                                             │
│  └─ CI/CD (GitHub Actions)                                      │
│                                                                 │
│  Wiz GitHub App                                                 │
│  ├─ Pull Request スキャン                                        │
│  ├─ インラインコメント                                            │
│  └─ マージブロック                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │ GitHub Actions trigger
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD パイプライン                            │
├─────────────────────────────────────────────────────────────────┤
│  GitHub Actions                                                 │
│  ├─ ソースコードスキャン (Wiz CLI)                                 │
│  ├─ Dockerイメージビルド                                          │
│  ├─ イメージスキャン (Wiz CLI)                                    │
│  ├─ SBOM生成                                                    │
│  ├─ メタデータタグ付け                                            │
│  └─ ECRプッシュ                                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │ Docker push
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS コンテナレジストリ                          │
├─────────────────────────────────────────────────────────────────┤
│  Amazon ECR                                                     │
│  ├─ コンテナイメージ保管                                           │
│  ├─ メタデータ（Git情報）                                          │
│  └─ SBOM                                                        │
│                                                                 │
│  Wiz Cloud Scanner                                              │
│  └─ ECRイメージの自動スキャン                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │ Deploy
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AWS ランタイム環境                              │
├─────────────────────────────────────────────────────────────────┤
│  Amazon ECS / EKS                                               │
│  ├─ コンテナ実行                                                  │
│  ├─ ネットワーク構成                                              │
│  └─ IAM権限                                                      │
│                                                                 │
│  Wiz Sensor                                                     │
│  ├─ ランタイム分析                                                │
│  ├─ 実行中パッケージ検出                                           │
│  ├─ ネットワーク露出分析                                           │
│  └─ 権限分析                                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │ Send telemetry
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Wiz Security Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  Wiz Code                                                       │
│  ├─ ソースコードスキャン結果                                        │
│  ├─ IaCスキャン結果                                               │
│  └─ シークレット検出結果                                           │
│                                                                 │
│  Wiz Cloud                                                      │
│  ├─ コンテナイメージスキャン結果                                     │
│  ├─ ランタイム脆弱性                                              │
│  ├─ ネットワーク露出                                              │
│  └─ IAM権限分析                                                  │
│                                                                 │
│  Wiz Security Graph                                             │
│  ├─ Code-to-Cloud トレーサビリティ                                │
│  ├─ 依存関係の可視化                                              │
│  ├─ 脆弱性の優先順位付け                                           │
│  └─ Attack Pathの検出                                            │
└─────────────────────────────────────────────────────────────────┘
```

## TaskFlowアプリケーション構成

TaskFlowは、検証用に構築するサンプルのタスク管理アプリケーションです。

### アプリケーション構成

```
TaskFlow Application
├── Frontend (Next.js + React)
│   ├── Pages
│   │   ├── ダッシュボード
│   │   ├── タスク一覧
│   │   └── タスク詳細
│   ├── Components
│   │   ├── TaskCard
│   │   ├── TaskForm
│   │   └── UserProfile
│   └── API Client
│       └── Axios (Backend連携)
│
├── Backend (Node.js + Express)
│   ├── API Endpoints
│   │   ├── /api/tasks
│   │   ├── /api/users
│   │   └── /api/auth
│   ├── Business Logic
│   │   ├── Task Service
│   │   ├── User Service
│   │   └── Auth Service
│   └── Database Access
│       └── PostgreSQL Client
│
└── Database (Amazon RDS - PostgreSQL)
    ├── Tables
    │   ├── users
    │   ├── tasks
    │   └── task_assignments
    └── Indexes & Constraints
```

### 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|----------|
| **Frontend** | Next.js | 14.x |
| | React | 18.x |
| | Tailwind CSS | 3.x |
| **Backend** | Node.js | 18.x LTS |
| | Express.js | 4.x |
| | TypeScript | 5.x |
| **Database** | PostgreSQL | 15.x |
| **コンテナ** | Docker | 20.x |
| **オーケストレーション** | Amazon ECS/EKS | - |
| **IaC** | Terraform | 1.6+ |

### 依存関係

**Backend (package.json)**:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.17",
    "typescript": "^5.0.0",
    "jest": "^29.5.0"
  }
}
```

**Frontend (package.json)**:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.4.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "eslint": "^8.40.0"
  }
}
```

## AWSインフラ構成

### ネットワーク構成

```
VPC (10.0.0.0/16)
├── Public Subnets
│   ├── us-east-1a (10.0.1.0/24)
│   │   └── ALB
│   └── us-east-1b (10.0.2.0/24)
│       └── ALB
│
└── Private Subnets
    ├── us-east-1a (10.0.10.0/24)
    │   ├── ECS Tasks / EKS Pods
    │   └── RDS Primary
    └── us-east-1b (10.0.11.0/24)
        ├── ECS Tasks / EKS Pods
        └── RDS Standby
```

### コンピュートリソース

**ECS構成**:
```
ECS Cluster: taskflow-cluster
├── Service: taskflow-backend
│   ├── Task Definition: taskflow-backend:latest
│   ├── Launch Type: FARGATE
│   ├── Desired Count: 2
│   └── Network: awsvpc (Private Subnets)
│
└── Service: taskflow-frontend
    ├── Task Definition: taskflow-frontend:latest
    ├── Launch Type: FARGATE
    ├── Desired Count: 2
    └── Network: awsvpc (Private Subnets)
```

**EKS構成**（代替オプション）:
```
EKS Cluster: taskflow-cluster
├── Node Group: general
│   ├── Instance Type: t3.medium
│   ├── Min Size: 2
│   └── Max Size: 4
│
└── Namespaces
    ├── default
    │   ├── Deployment: taskflow-backend
    │   └── Deployment: taskflow-frontend
    └── wiz-sensor
        └── DaemonSet: wiz-sensor
```

### データベース

```
RDS PostgreSQL
├── Instance Class: db.t3.micro
├── Engine Version: 15.3
├── Multi-AZ: Enabled
├── Storage: 20GB (gp3)
├── Backup Retention: 7 days
└── Encryption: AES-256 (KMS)
```

### セキュリティグループ

```
Security Groups
├── ALB-SG
│   ├── Inbound: 443 from 0.0.0.0/0
│   └── Outbound: All to ECS-SG
│
├── ECS-SG
│   ├── Inbound: 3000 from ALB-SG
│   └── Outbound: 5432 to RDS-SG
│
└── RDS-SG
    ├── Inbound: 5432 from ECS-SG
    └── Outbound: None
```

## Wiz統合アーキテクチャ

### Wiz Codeの統合ポイント

| 統合ポイント | ツール | スキャン対象 | フィードバック |
|-----------|-------|----------|-----------|
| **IDE** | VSCode拡張 | ソースコード、IaC | リアルタイム |
| **VCS** | GitHub App | Pull Request | PRコメント |
| **CI/CD** | Wiz CLI | ソースコード、イメージ | パイプライン結果 |
| **Registry** | Wiz Cloud | ECRイメージ | Wizダッシュボード |
| **Runtime** | Wiz Sensor | 実行中コンテナ | Wizダッシュボード |

### Code-to-Cloud データフロー

```
1. 開発者がコード変更
   └─> VSCode Wiz Extension
       └─> リアルタイムスキャン結果表示

2. PR作成
   └─> Wiz GitHub App
       └─> PRに脆弱性コメント

3. mainブランチにマージ
   └─> GitHub Actions起動
       └─> Wiz CLI スキャン
           ├─ ソースコードスキャン
           ├─ Dockerビルド
           ├─ イメージスキャン
           └─ メタデータタグ付け
               └─> ECRプッシュ
                   └─> Wiz Cloud スキャン

4. ECS/EKSデプロイ
   └─> Wiz Sensor
       ├─ ランタイム分析
       ├─ ネットワーク露出検出
       └─> Wiz Security Graph
           └─ Code-to-Cloud追跡確立
```

### メタデータタグ付け

CI/CDパイプラインで各イメージに付与されるメタデータ:

```json
{
  "source.repository": "github.com/org/taskflow",
  "source.branch": "main",
  "source.commit": "abc123def456...",
  "ci.provider": "github-actions",
  "ci.build.id": "1234567890",
  "ci.build.url": "https://github.com/.../actions/runs/123",
  "build.timestamp": "2024-11-28T10:00:00Z"
}
```

## セキュリティアーキテクチャ

### 認証・認可フロー

```
1. GitHub Actions → AWS
   └─ OIDC認証（IAMロール）
       └─ ECRプッシュ権限のみ

2. GitHub Actions → Wiz
   └─ Service Account認証
       └─ スキャン・タグ付け権限

3. ECS/EKS → RDS
   └─ IAMロール（Secrets Manager経由）
       └─ 最小権限アクセス

4. Wiz Sensor → Wiz Cloud
   └─ Sensor Service Account
       └─ テレメトリ送信のみ
```

### 意図的な脆弱性の配置

検証目的で、以下の脆弱性を意図的に配置:

| カテゴリ | 例 | 検出対象シナリオ |
|---------|-----|---------------|
| **コード脆弱性** | SQLインジェクション、XSS | S01, S02, S03 |
| **シークレット** | ハードコードされたAPIキー | S05 |
| **IaC設定ミス** | パブリックS3、暗号化なし | S04 |
| **依存関係** | 古いnpmパッケージ | S06, S08 |
| **コンテナ** | rootユーザー実行 | S07 |

## スケーラビリティ考慮事項

### 水平スケーリング

- **ECS**: Service Auto Scaling（CPU/Memory）
- **EKS**: Horizontal Pod Autoscaler（HPA）
- **RDS**: Read Replica追加可能

### モニタリング

- **CloudWatch Logs**: アプリケーションログ
- **CloudWatch Metrics**: リソースメトリクス
- **Wiz Dashboard**: セキュリティメトリクス

## コスト最適化

### リソース最適化

- **Fargate Spot**: 非本番環境で使用
- **RDS**: 検証時のみ起動
- **ECR**: ライフサイクルポリシーで古いイメージ削除

### Wiz利用最適化

- **スキャン頻度**: PRとmainマージ時のみ
- **センサー**: 本番環境のみ配置

## 災害復旧

### バックアップ戦略

- **RDS**: 自動バックアップ（7日間保持）
- **IaC**: Terraformコードでインフラ再構築可能
- **コンテナイメージ**: ECRに永続保存

### 復旧手順

1. Terraformでインフラ再構築
2. ECRから最新イメージ取得
3. ECS/EKSサービス起動
4. Wiz連携の再確認

## 参考資料

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Wiz Architecture Best Practices](https://docs.wiz.io/wiz-docs/docs/architecture)
- [Container Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
