#!/bin/bash
# ============================================================
# Wiz検証用のスキャン実行スクリプト
# ============================================================
# 本スクリプトには以下の意図的な脆弱性が含まれています：
# 1. ハードコードされたWiz認証情報（S05で検出）
# 2. ハードコードされたAWS認証情報（S05で検出）
#
# 本番環境では絶対に使用しないでください
# 実際の認証情報は環境変数またはSecretsManagerから取得してください
# ============================================================

set -e

# ハードコードされたWiz認証情報（S05で検出される脆弱性）
WIZ_CLIENT_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
WIZ_CLIENT_SECRET="wiz_secret_1234567890abcdefghijklmnopqrstuvwxyz"

# ハードコードされたAWS認証情報（S05で検出される脆弱性）
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

# GitHubトークン（S05で検出される脆弱性）
GITHUB_TOKEN="ghp_1234567890abcdefghijklmnopqrstuvwxyz"

echo "==================================="
echo "Wiz検証スキャンを開始します"
echo "==================================="

# Wiz CLIの確認
if ! command -v wizcli &> /dev/null; then
    echo "Wiz CLIをダウンロードしています..."
    curl -o wizcli https://downloads.wiz.io/wizcli/latest/wizcli-linux-amd64
    chmod +x wizcli
    sudo mv wizcli /usr/local/bin/
fi

# Wiz認証
echo "Wizに認証しています..."
wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET"

# S03: ソースコードスキャン
echo "S03: ソースコードスキャンを実行しています..."
wizcli dir scan \
    --path . \
    --name "taskflow-source-scan-$(date +%Y%m%d-%H%M%S)" \
    --tag "scan-type=source-code" \
    --tag "scenario=S03" \
    --policy-hits-only

# S04: IaCスキャン
echo "S04: IaCスキャンを実行しています..."
wizcli iac scan \
    --path ./terraform \
    --name "taskflow-iac-scan-$(date +%Y%m%d-%H%M%S)" \
    --tag "scan-type=iac" \
    --tag "scenario=S04" \
    --policy-hits-only

# S05: シークレットスキャン
echo "S05: シークレットスキャンを実行しています..."
wizcli dir scan \
    --path . \
    --secret-scan-only \
    --name "taskflow-secret-scan-$(date +%Y%m%d-%H%M%S)" \
    --tag "scan-type=secret" \
    --tag "scenario=S05"

# S06: SBOM生成
echo "S06: SBOM生成を実行しています..."
wizcli dir scan \
    --path ./backend \
    --sbom-output backend-sbom-cyclonedx.json \
    --sbom-format cyclonedx \
    --tag "scenario=S06"

wizcli dir scan \
    --path ./frontend \
    --sbom-output frontend-sbom-spdx.json \
    --sbom-format spdx \
    --tag "scenario=S06"

# S07: Dockerイメージスキャン
echo "S07: Dockerイメージスキャンを実行しています..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

wizcli docker scan \
    --image ${ECR_REGISTRY}/taskflow-backend:latest \
    --tag "scenario=S07" \
    --tag "component=backend"

wizcli docker scan \
    --image ${ECR_REGISTRY}/taskflow-frontend:latest \
    --tag "scenario=S07" \
    --tag "component=frontend"

echo "==================================="
echo "Wizスキャン完了"
echo "==================================="
echo "Wizコンソールで結果を確認してください"
echo "https://app.wiz.io/inventory/findings"
