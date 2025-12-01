# S07: コンテナトレーサビリティ

## 概要

AWS ECS/EKSにデプロイされたコンテナを、ソースコードまで遡って追跡できることを検証します。実行中のワークロードで検出された脆弱性を、どのGitコミットで導入されたかまで特定できることを確認します。

## 検証目的

- デプロイされたコンテナがWiz Cloudで検出されることを確認
- コンテナ → ECRイメージ → CI/CDビルド → ソースコードの完全な追跡
- Wiz Security Graphでの可視化
- 脆弱性の原因となったコード変更の特定

## 前提条件

### AWS環境
- AWS アカウント
- ECS Clusterまたは EKS Cluster
- ECR Repository
- 必要なIAMロール

### Wiz設定
- Wiz Cloud有効化
- AWS Connector設定完了
- Wiz Sensor デプロイ（ECS/EKS）

### 必須ツール
- Docker Desktop
- AWS CLI v2
- kubectl（EKS使用時）
- Wiz CLI

## 検証手順

### Step 1: ECRリポジトリの作成

```bash
# 環境変数設定
export AWS_ACCOUNT_ID="123456789012"
export AWS_REGION="us-east-1"
export ECR_REPOSITORY="taskflow-backend"

# ECRリポジトリ作成
aws ecr create-repository \
  --repository-name $ECR_REPOSITORY \
  --region $AWS_REGION

# ECR URLを取得
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

### Step 2: メタデータ付きイメージのビルドとプッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Gitメタデータを取得
export GIT_COMMIT=$(git rev-parse HEAD)
export GIT_BRANCH=$(git branch --show-current)
export GIT_REPO=$(git config --get remote.origin.url)

# イメージをビルド
docker build \
  --build-arg GIT_COMMIT=$GIT_COMMIT \
  --build-arg GIT_BRANCH=$GIT_BRANCH \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_COMMIT \
  ./backend

# Wiz CLIでイメージにメタデータをタグ付け
wizcli docker tag \
  --image $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_COMMIT \
  --source-repo "$GITHUB_REPOSITORY" \
  --source-branch "$GIT_BRANCH" \
  --source-commit "$GIT_COMMIT"

# ECRにプッシュ
docker push $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_COMMIT

# latestタグも付与
docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_COMMIT $ECR_REGISTRY/$ECR_REPOSITORY:latest
docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

### Step 3: ECSへのデプロイ

```json
// ecs-task-definition.json
{
  "family": "taskflow-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_REGISTRY}/${ECR_REPOSITORY}:${GIT_COMMIT}",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "GIT_COMMIT",
          "value": "${GIT_COMMIT}"
        },
        {
          "name": "GIT_BRANCH",
          "value": "${GIT_BRANCH}"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/taskflow-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole"
}
```

```bash
# 環境変数を置換
envsubst < ecs-task-definition.json > ecs-task-definition-resolved.json

# タスク定義を登録
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition-resolved.json

# サービスを作成/更新
aws ecs create-service \
  --cluster taskflow-cluster \
  --service-name taskflow-backend-service \
  --task-definition taskflow-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 4: GitHub Actionsワークフロー

```yaml
# .github/workflows/S07-container-build.yml
name: S07 - Container Build and Deploy

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: taskflow-backend
  ECS_CLUSTER: taskflow-cluster
  ECS_SERVICE: taskflow-backend-service

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Install Wiz CLI
        run: |
          curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
          chmod +x wizcli
          sudo mv wizcli /usr/local/bin/

      - name: Authenticate with Wiz
        env:
          WIZ_CLIENT_ID: ${{ secrets.WIZ_CLIENT_ID }}
          WIZ_CLIENT_SECRET: ${{ secrets.WIZ_CLIENT_SECRET }}
        run: |
          wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

      - name: Build Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            --build-arg GIT_COMMIT=${{ github.sha }} \
            --build-arg GIT_BRANCH=${{ github.ref_name }} \
            --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
            --build-arg BUILD_ID=${{ github.run_id }} \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            ./backend

      - name: Scan image with Wiz
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          wizcli docker scan \
            --image $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            --policy "Default vulnerabilities policy"

      - name: Tag image with Code-to-Cloud metadata
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          wizcli docker tag \
            --image $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            --source-repo "${{ github.repository }}" \
            --source-branch "${{ github.ref_name }}" \
            --source-commit "${{ github.sha }}" \
            --ci-build-id "${{ github.run_id }}"

      - name: Push image to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Deploy to ECS
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # 新しいタスク定義を登録
          TASK_DEFINITION=$(aws ecs describe-task-definition \
            --task-definition taskflow-backend \
            --query taskDefinition)

          NEW_TASK_DEF=$(echo $TASK_DEFINITION | \
            jq --arg IMAGE "$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" \
            '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

          NEW_TASK_INFO=$(aws ecs register-task-definition \
            --cli-input-json "$NEW_TASK_DEF")

          NEW_REVISION=$(echo $NEW_TASK_INFO | jq -r '.taskDefinition.revision')

          # サービスを更新
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --task-definition taskflow-backend:$NEW_REVISION \
            --force-new-deployment
```

### Step 5: Wiz Cloudでの確認

1. **Wiz Consoleにログイン**
2. **Inventory → Workloads** に移動
3. **ECS Tasksまたは Kubernetes Pods** を表示
4. **taskflow-backend** を検索
5. **詳細ページを開く**

**確認項目**:
- タスク/Podが検出されていること
- 実行中のイメージが正しく表示されていること
- メタデータ（Git情報）が含まれていること

### Step 6: Security Graphでのトレーサビリティ確認

1. **Security Graph** タブを開く
2. **Code Origin** セクションを確認
3. **トレーサビリティパスを確認**:

```
GitHub Repository (taskflow-backend)
    ↓
GitHub Commit (abc123...)
    ↓
GitHub Actions Run (#42)
    ↓
ECR Image (taskflow-backend:abc123)
    ↓
ECS Task (task/abc123-def456)
```

4. **各ノードをクリックして詳細を確認**
5. **脆弱性がある場合、どのコミットで導入されたか確認**

### Step 7: 脆弱性の追跡テスト

```bash
# 脆弱性を含むパッケージを追加
# package.jsonに古いlodashを追加
git add package.json
git commit -m "Add vulnerable lodash version for testing"
git push

# CI/CDが自動実行され、デプロイされる

# Wiz Cloudで確認
# 1. 新しいコミットでビルドされたイメージが表示される
# 2. 脆弱性が検出される
# 3. その脆弱性を導入したコミットが特定される
```

## 期待される結果

### トレーサビリティの完全性

| 項目 | 確認内容 | 結果 |
|-----|---------|------|
| ソースコード特定 | GitHubリポジトリとコミットが表示される | ✅ |
| CI/CDビルド特定 | GitHub Actions Run IDが表示される | ✅ |
| イメージ特定 | ECRイメージタグと一致する | ✅ |
| ランタイム特定 | ECSタスク/EKS Podが表示される | ✅ |

### Security Graph

- すべてのコンポーネント間の関係が可視化される
- クリック可能なリンクで各コンポーネントに移動できる
- タイムラインで変更履歴が追跡できる

## 検証ポイント

- [ ] デプロイされたコンテナがWiz Cloudで検出される
- [ ] コンテナからソースコードまで完全に追跡できる
- [ ] CI/CDパイプラインとの紐付けが確認できる
- [ ] Security Graphで可視化される
- [ ] 脆弱性を導入したコミットが特定できる
- [ ] メタデータが正確に記録されている

## 関連シナリオ

- [S06: SBOM生成と追跡](S06-sbom-tracking.md)
- [S08: ランタイム優先順位付け](S08-runtime-prioritization.md)
- [S10: インシデント対応フロー](../phase3-integration/S10-incident-response.md)

## 参考資料

- [Wiz Code-to-Cloud](https://docs.wiz.io/wiz-docs/docs/code-to-cloud)
- [Wiz ECS Integration](https://docs.wiz.io/wiz-docs/docs/aws-ecs-integration)
- [Wiz Security Graph](https://docs.wiz.io/wiz-docs/docs/security-graph)
