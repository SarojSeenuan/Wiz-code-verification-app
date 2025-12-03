#!/bin/bash

# =============================================================================
# 環境変数検証スクリプト（Bash版）
# =============================================================================
# 用途: Phase 1またはPhase 2の環境変数が正しく設定されているか検証
#
# 使用方法:
#   ./scripts/validate-env.sh phase1    # Phase 1の環境変数を検証
#   ./scripts/validate-env.sh phase2    # Phase 2の環境変数を検証
#
# 詳細: docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md を参照
# =============================================================================

set -e

# カラー出力定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 出力関数
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# 引数チェック
if [ $# -ne 1 ]; then
    print_error "使用方法: $0 {phase1|phase2}"
    exit 1
fi

PHASE=$1
if [[ "$PHASE" != "phase1" && "$PHASE" != "phase2" ]]; then
    print_error "Phase は 'phase1' または 'phase2' を指定してください"
    exit 1
fi

# 環境変数検証関数
validate_env_var() {
    local var_name=$1
    local description=$2
    local required=${3:-true}
    local pattern=${4:-}

    local value="${!var_name}"

    if [ -z "$value" ]; then
        if [ "$required" = "true" ]; then
            print_error "$var_name: 未設定（必須） - $description"
            return 1
        else
            print_warning "$var_name: 未設定（オプション） - $description"
            return 0
        fi
    fi

    # プレースホルダーチェック
    if [[ "$value" =~ your_.*_here ]] || [[ "$value" =~ xxx ]]; then
        print_error "$var_name: プレースホルダー値のままです - $description"
        return 1
    fi

    # パターンマッチング検証
    if [ -n "$pattern" ]; then
        if ! [[ "$value" =~ $pattern ]]; then
            print_error "$var_name: 形式が不正です（期待: $pattern） - $description"
            return 1
        fi
    fi

    # 値のマスク表示（先頭4文字のみ）
    local masked_value
    if [ ${#value} -gt 8 ]; then
        masked_value="${value:0:4}...${value: -4}"
    else
        masked_value="****"
    fi

    print_success "$var_name: 設定済み ($masked_value)"
    return 0
}

# メイン処理
echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN} Wiz Code検証 - 環境変数検証スクリプト${NC}"
echo -e "${CYAN} Phase: $PHASE${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# .envファイルの読み込み
ENV_FILE=".env.$PHASE"
if [ -f "$ENV_FILE" ]; then
    print_info ".envファイルを読み込んでいます: $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
    print_success ".envファイルを読み込みました"
    echo ""
else
    print_warning ".envファイルが見つかりません: $ENV_FILE"
    print_info "環境変数から直接検証します"
    echo ""
fi

ALL_VALID=true

# -----------------------------------------------------------------------------
# Phase 1: 共通環境変数の検証
# -----------------------------------------------------------------------------
echo -e "${YELLOW}--- Wiz 認証情報 ---${NC}"
validate_env_var "WIZ_CLIENT_ID" "Wiz Client ID" "true" || ALL_VALID=false
validate_env_var "WIZ_CLIENT_SECRET" "Wiz Client Secret" "true" || ALL_VALID=false
echo ""

echo -e "${YELLOW}--- GitHub 認証情報 ---${NC}"
validate_env_var "GITHUB_TOKEN" "GitHub Personal Access Token" "true" || ALL_VALID=false
validate_env_var "GITHUB_OWNER" "GitHubユーザー名または組織名" "true" || ALL_VALID=false
validate_env_var "GITHUB_REPO" "リポジトリ名" "true" || ALL_VALID=false
echo ""

echo -e "${YELLOW}--- ローカル開発環境 ---${NC}"
validate_env_var "DB_HOST" "PostgreSQLホスト" "false" || ALL_VALID=false
validate_env_var "DB_PORT" "PostgreSQLポート" "false" "^[0-9]+$" || ALL_VALID=false
validate_env_var "DB_NAME" "データベース名" "false" || ALL_VALID=false
validate_env_var "DB_USER" "データベースユーザー" "false" || ALL_VALID=false
echo ""

# -----------------------------------------------------------------------------
# Phase 2: AWS環境変数の検証
# -----------------------------------------------------------------------------
if [ "$PHASE" = "phase2" ]; then
    echo -e "${YELLOW}--- AWS 認証情報 ---${NC}"
    validate_env_var "AWS_ACCOUNT_ID" "AWSアカウントID" "true" "^[0-9]{12}$" || ALL_VALID=false
    validate_env_var "AWS_REGION" "AWSリージョン" "true" "^[a-z]{2}-[a-z]+-[0-9]$" || ALL_VALID=false
    validate_env_var "AWS_ACCESS_KEY_ID" "AWSアクセスキーID" "true" || ALL_VALID=false
    validate_env_var "AWS_SECRET_ACCESS_KEY" "AWSシークレットアクセスキー" "true" || ALL_VALID=false
    echo ""

    echo -e "${YELLOW}--- AWS ECS/ECR 設定 ---${NC}"
    validate_env_var "ECR_BACKEND_REPO" "バックエンドECRリポジトリ名" "true" || ALL_VALID=false
    validate_env_var "ECR_FRONTEND_REPO" "フロントエンドECRリポジトリ名" "true" || ALL_VALID=false
    validate_env_var "ECS_CLUSTER_NAME" "ECSクラスター名" "true" || ALL_VALID=false
    echo ""

    echo -e "${YELLOW}--- AWS RDS 設定 ---${NC}"
    validate_env_var "RDS_ENDPOINT" "RDSエンドポイント" "false" || ALL_VALID=false
    validate_env_var "RDS_USERNAME" "RDSユーザー名" "false" || ALL_VALID=false
    validate_env_var "RDS_PASSWORD" "RDSパスワード" "false" || ALL_VALID=false
    echo ""
fi

# -----------------------------------------------------------------------------
# 検証結果のサマリー
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}=============================================${NC}"
if [ "$ALL_VALID" = true ]; then
    echo -e "${GREEN} 検証結果: 成功 ✅${NC}"
    echo -e "${CYAN}=============================================${NC}"
    echo ""
    print_success "すべての必須環境変数が正しく設定されています"
    print_info "次のステップ: シナリオドキュメントに従って検証を開始してください"

    if [ "$PHASE" = "phase1" ]; then
        print_info "  → docs/phase1-shift-left/S01-ide-integration.md"
    else
        print_info "  → docs/phase2-code-to-cloud/S06-sbom-tracking.md"
    fi

    exit 0
else
    echo -e "${RED} 検証結果: 失敗 ❌${NC}"
    echo -e "${CYAN}=============================================${NC}"
    echo ""
    print_error "一部の環境変数が正しく設定されていません"
    print_info "修正方法:"
    print_info "  1. .env.$PHASE ファイルを編集"
    print_info "  2. .env.$PHASE.template を参照して正しい値を設定"
    print_info "  3. 再度このスクリプトを実行: ./scripts/validate-env.sh $PHASE"
    print_info ""
    print_info "詳細: docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md を参照"

    exit 1
fi
