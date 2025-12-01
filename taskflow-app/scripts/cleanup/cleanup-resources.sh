#!/bin/bash
# ============================================================
# Wiz検証リソースのクリーンアップスクリプト
# ============================================================
# 本スクリプトには以下の意図的な脆弱性が含まれています：
# 1. ハードコードされたAWS認証情報（S05で検出）
#
# 本番環境では絶対に使用しないでください
# ============================================================

set -e

# ハードコードされたAWS認証情報（S05で検出される脆弱性）
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

ENVIRONMENT=${1:-dev}

echo "==================================="
echo "環境: $ENVIRONMENT"
echo "AWS環境のクリーンアップを開始します"
echo "==================================="

# Terraformディレクトリに移動
cd terraform/environments/$ENVIRONMENT

# Terraform状態を確認
if [ ! -f "terraform.tfstate" ]; then
    echo "警告: terraform.tfstateが見つかりません"
    echo "リソースが既に削除されているか、手動で削除する必要があります"
    exit 0
fi

# リソース削除の確認
echo ""
echo "警告: 以下のリソースが削除されます:"
terraform show -json | jq -r '.values.root_module.resources[].address'
echo ""
read -p "続行しますか？ (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "クリーンアップをキャンセルしました"
    exit 0
fi

# Terraform destroy実行
echo "Terraform destroyを実行しています..."
terraform destroy -auto-approve

# ECRイメージの削除
echo "ECRイメージを削除しています..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

repositories=("${ENVIRONMENT}-taskflow-backend" "${ENVIRONMENT}-taskflow-frontend")

for repo in "${repositories[@]}"; do
    echo "リポジトリ ${repo} のイメージを削除中..."

    # すべてのイメージIDを取得
    image_ids=$(aws ecr list-images \
        --repository-name $repo \
        --query 'imageIds[*]' \
        --output json)

    if [ "$image_ids" != "[]" ]; then
        aws ecr batch-delete-image \
            --repository-name $repo \
            --image-ids "$image_ids" || true
    fi

    # リポジトリ削除
    aws ecr delete-repository \
        --repository-name $repo \
        --force || true
done

# CloudWatchロググループの削除
echo "CloudWatchロググループを削除しています..."
log_groups=$(aws logs describe-log-groups \
    --log-group-name-prefix "/ecs/${ENVIRONMENT}/taskflow" \
    --query 'logGroups[*].logGroupName' \
    --output text)

for log_group in $log_groups; do
    echo "ロググループ ${log_group} を削除中..."
    aws logs delete-log-group --log-group-name $log_group || true
done

# S3バケットの削除（Terraformステート用）
echo "S3バケットを削除しています..."
bucket_name="${ENVIRONMENT}-taskflow-terraform-state-${AWS_ACCOUNT_ID}"

if aws s3 ls "s3://${bucket_name}" 2>/dev/null; then
    echo "バケット ${bucket_name} を空にしています..."
    aws s3 rm "s3://${bucket_name}" --recursive || true

    echo "バケット ${bucket_name} を削除しています..."
    aws s3 rb "s3://${bucket_name}" --force || true
fi

# DynamoDBテーブルの削除（Terraformロック用）
echo "DynamoDBテーブルを削除しています..."
table_name="${ENVIRONMENT}-taskflow-terraform-lock"

if aws dynamodb describe-table --table-name $table_name 2>/dev/null; then
    aws dynamodb delete-table --table-name $table_name || true
fi

echo "==================================="
echo "クリーンアップ完了"
echo "==================================="
echo ""
echo "以下を確認してください:"
echo "1. AWSコンソールで全リソースが削除されたことを確認"
echo "2. Wizコンソールでクラウドリソースが削除されたことを確認"
echo "3. 予期しない課金が発生していないことを確認"
