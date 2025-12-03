#!/bin/bash

# =============================================================================
# Wiz スキャン実行スクリプト（Bash版）
# =============================================================================
# 用途: Wiz CLIでディレクトリ、IaC、Dockerイメージをスキャン
#
# 使用方法:
#   ./scripts/run-wiz-scan.sh dir ./backend
#   ./scripts/run-wiz-scan.sh iac ./terraform
#   ./scripts/run-wiz-scan.sh docker taskflow-backend:latest
#   ./scripts/run-wiz-scan.sh secret ./backend
#
# 詳細: docs/guides/MANUAL_SETUP_GUIDE.md を参照
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

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${YELLOW}🔹 $1${NC}"
}

# 引数チェック
if [ $# -lt 1 ]; then
    print_error "使用方法: $0 {dir|iac|docker|secret} [path_or_image] [phase]"
    echo ""
    echo "例:"
    echo "  $0 dir ./backend"
    echo "  $0 iac ./terraform"
    echo "  $0 docker taskflow-backend:latest"
    echo "  $0 secret ./backend"
    exit 1
fi

SCAN_TYPE=$1
PATH_OR_IMAGE=${2:-.}
PHASE=${3:-phase1}
SKIP_AUTH=${SKIP_AUTH:-false}

# スキャンタイプの検証
if [[ ! "$SCAN_TYPE" =~ ^(dir|iac|docker|secret)$ ]]; then
    print_error "スキャンタイプは 'dir', 'iac', 'docker', 'secret' のいずれかを指定してください"
    exit 1
fi

# メイン処理
echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN} Wiz Code スキャン実行スクリプト${NC}"
echo -e "${CYAN} スキャンタイプ: $SCAN_TYPE${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# .envファイルの読み込み
ENV_FILE=".env.$PHASE"
if [ -f "$ENV_FILE" ]; then
    print_step ".envファイルを読み込んでいます: $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
    print_success ".envファイルを読み込みました"
else
    print_error ".envファイルが見つかりません: $ENV_FILE"
    print_info "作成方法: .env.$PHASE.template を .env.$PHASE にコピーして編集"
    exit 1
fi

# Wiz認証情報の確認
if [ -z "$WIZ_CLIENT_ID" ] || [ -z "$WIZ_CLIENT_SECRET" ]; then
    print_error "Wiz認証情報が設定されていません"
    print_info "環境変数検証: ./scripts/validate-env.sh $PHASE"
    exit 1
fi

# Wiz CLI の存在確認
print_step "Wiz CLIの確認..."
if ! command -v wizcli &> /dev/null; then
    print_error "Wiz CLIがインストールされていません"
    print_info "インストール方法: docs/guides/MANUAL_SETUP_GUIDE.md を参照"
    exit 1
fi
print_success "Wiz CLI: インストール済み"

# Wiz 認証
if [ "$SKIP_AUTH" != "true" ]; then
    print_step "Wizに認証中..."
    if wizcli auth --id "$WIZ_CLIENT_ID" --secret "$WIZ_CLIENT_SECRET" > /dev/null 2>&1; then
        print_success "Wiz認証: 成功"
    else
        print_error "Wiz認証に失敗しました"
        print_info "認証情報を確認してください: .env.$PHASE"
        exit 1
    fi
fi

# Git情報の取得
print_step "Git情報を取得中..."
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_REPO=${GITHUB_REPOSITORY:-"unknown"}

if [ "$GIT_COMMIT" = "unknown" ]; then
    print_info "Gitコミット情報が取得できませんでした（Gitリポジトリ外？）"
fi

print_info "Git Commit: $GIT_COMMIT"
print_info "Git Branch: $GIT_BRANCH"
echo ""

# スキャンタイプ別の実行
case "$SCAN_TYPE" in
    dir)
        print_step "ディレクトリスキャンを開始: $PATH_OR_IMAGE"
        print_info "コマンド: wizcli dir scan"
        echo ""

        SCAN_NAME="dir-scan-$GIT_COMMIT"
        COMPONENT_TAG=$(basename "$PATH_OR_IMAGE")

        wizcli dir scan \
            --path "$PATH_OR_IMAGE" \
            --name "$SCAN_NAME" \
            --tag "component=$COMPONENT_TAG" \
            --tag "commit=$GIT_COMMIT" \
            --tag "branch=$GIT_BRANCH" \
            --policy "Default vulnerabilities policy"

        print_success "ディレクトリスキャン: 完了"
        ;;

    iac)
        print_step "IaCスキャンを開始: $PATH_OR_IMAGE"
        print_info "コマンド: wizcli iac scan"
        echo ""

        wizcli iac scan \
            --path "$PATH_OR_IMAGE" \
            --policy-hits-only \
            --tag "iac-type=terraform" \
            --tag "commit=$GIT_COMMIT" \
            --tag "branch=$GIT_BRANCH"

        print_success "IaCスキャン: 完了"
        ;;

    docker)
        if [ -z "$PATH_OR_IMAGE" ]; then
            print_error "Dockerイメージ名が指定されていません"
            print_info "使用方法: $0 docker myimage:latest"
            exit 1
        fi

        print_step "Dockerイメージスキャンを開始: $PATH_OR_IMAGE"
        print_info "コマンド: wizcli docker scan"
        echo ""

        # イメージ名からタグを除去してコンポーネント名を抽出
        COMPONENT_TAG="${PATH_OR_IMAGE%%:*}"

        wizcli docker scan \
            --image "$PATH_OR_IMAGE" \
            --tag "component=$COMPONENT_TAG" \
            --tag "commit=$GIT_COMMIT" \
            --tag "branch=$GIT_BRANCH" \
            --tag "source-repo=$GIT_REPO"

        print_success "Dockerイメージスキャン: 完了"
        ;;

    secret)
        print_step "シークレットスキャンを開始: $PATH_OR_IMAGE"
        print_info "コマンド: wizcli dir scan --secret-scan-only"
        echo ""

        SCAN_NAME="secret-scan-$GIT_COMMIT"
        COMPONENT_TAG=$(basename "$PATH_OR_IMAGE")

        wizcli dir scan \
            --path "$PATH_OR_IMAGE" \
            --secret-scan-only \
            --name "$SCAN_NAME" \
            --tag "component=$COMPONENT_TAG" \
            --tag "scan-type=secret-detection" \
            --tag "commit=$GIT_COMMIT" \
            --tag "branch=$GIT_BRANCH"

        print_success "シークレットスキャン: 完了"
        ;;
esac

# 完了メッセージ
echo ""
echo -e "${CYAN}=============================================${NC}"
print_success "スキャン完了"
echo -e "${CYAN}=============================================${NC}"
print_info "Wizコンソールで結果を確認: https://app.wiz.io/overview"
echo ""
