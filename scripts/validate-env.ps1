# =============================================================================
# 環境変数検証スクリプト（PowerShell版）
# =============================================================================
# 用途: Phase 1またはPhase 2の環境変数が正しく設定されているか検証
#
# 使用方法:
#   .\scripts\validate-env.ps1 phase1    # Phase 1の環境変数を検証
#   .\scripts\validate-env.ps1 phase2    # Phase 2の環境変数を検証
#
# 詳細: docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md を参照
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('phase1', 'phase2')]
    [string]$Phase
)

# カラー出力関数
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# 環境変数検証関数
function Test-EnvVar {
    param(
        [string]$VarName,
        [string]$Description,
        [bool]$Required = $true,
        [string]$Pattern = $null
    )

    $value = [System.Environment]::GetEnvironmentVariable($VarName)

    if ([string]::IsNullOrEmpty($value)) {
        if ($Required) {
            Write-Error "${VarName}: 未設定（必須）- $Description"
            return $false
        } else {
            Write-Warning "${VarName}: 未設定（オプション）- $Description"
            return $true
        }
    }

    # プレースホルダーチェック
    if ($value -match "your_.*_here" -or $value -match "xxx") {
        Write-Error "${VarName}: プレースホルダー値のままです - $Description"
        return $false
    }

    # パターンマッチング検証
    if ($Pattern -and $value -notmatch $Pattern) {
        Write-Error "${VarName}: 形式が不正です（期待: $Pattern） - $Description"
        return $false
    }

    # 値のマスク表示（先頭4文字のみ）
    $maskedValue = if ($value.Length -gt 8) {
        $value.Substring(0, 4) + "..." + $value.Substring($value.Length - 4)
    } else {
        "****"
    }

    Write-Success "${VarName}: 設定済み ($maskedValue)"
    return $true
}

# メイン処理
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Wiz Code検証 - 環境変数検証スクリプト" -ForegroundColor Cyan
Write-Host " Phase: $Phase" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# .envファイルの読み込み
$envFile = ".env.$Phase"
if (Test-Path $envFile) {
    Write-Info ".envファイルを読み込んでいます: $envFile"
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)
        }
    }
    Write-Success ".envファイルを読み込みました"
    Write-Host ""
} else {
    Write-Warning ".envファイルが見つかりません: $envFile"
    Write-Info "環境変数から直接検証します"
    Write-Host ""
}

$allValid = $true

# -----------------------------------------------------------------------------
# Phase 1: 共通環境変数の検証
# -----------------------------------------------------------------------------
Write-Host "--- Wiz 認証情報 ---" -ForegroundColor Yellow
$allValid = (Test-EnvVar "WIZ_CLIENT_ID" "Wiz Client ID" -Required $true) -and $allValid
$allValid = (Test-EnvVar "WIZ_CLIENT_SECRET" "Wiz Client Secret" -Required $true) -and $allValid
Write-Host ""

Write-Host "--- GitHub 認証情報 ---" -ForegroundColor Yellow
$allValid = (Test-EnvVar "GITHUB_TOKEN" "GitHub Personal Access Token" -Required $true) -and $allValid
$allValid = (Test-EnvVar "GITHUB_OWNER" "GitHubユーザー名または組織名" -Required $true) -and $allValid
$allValid = (Test-EnvVar "GITHUB_REPO" "リポジトリ名" -Required $true) -and $allValid
Write-Host ""

Write-Host "--- ローカル開発環境 ---" -ForegroundColor Yellow
$allValid = (Test-EnvVar "DB_HOST" "PostgreSQLホスト" -Required $false) -and $allValid
$allValid = (Test-EnvVar "DB_PORT" "PostgreSQLポート" -Required $false -Pattern "^\d+$") -and $allValid
$allValid = (Test-EnvVar "DB_NAME" "データベース名" -Required $false) -and $allValid
$allValid = (Test-EnvVar "DB_USER" "データベースユーザー" -Required $false) -and $allValid
Write-Host ""

# -----------------------------------------------------------------------------
# Phase 2: AWS環境変数の検証
# -----------------------------------------------------------------------------
if ($Phase -eq "phase2") {
    Write-Host "--- AWS 認証情報 ---" -ForegroundColor Yellow
    $allValid = (Test-EnvVar "AWS_ACCOUNT_ID" "AWSアカウントID" -Required $true -Pattern "^\d{12}$") -and $allValid
    $allValid = (Test-EnvVar "AWS_REGION" "AWSリージョン" -Required $true -Pattern "^[a-z]{2}-[a-z]+-\d$") -and $allValid
    $allValid = (Test-EnvVar "AWS_ACCESS_KEY_ID" "AWSアクセスキーID" -Required $true) -and $allValid
    $allValid = (Test-EnvVar "AWS_SECRET_ACCESS_KEY" "AWSシークレットアクセスキー" -Required $true) -and $allValid
    Write-Host ""

    Write-Host "--- AWS ECS/ECR 設定 ---" -ForegroundColor Yellow
    $allValid = (Test-EnvVar "ECR_BACKEND_REPO" "バックエンドECRリポジトリ名" -Required $true) -and $allValid
    $allValid = (Test-EnvVar "ECR_FRONTEND_REPO" "フロントエンドECRリポジトリ名" -Required $true) -and $allValid
    $allValid = (Test-EnvVar "ECS_CLUSTER_NAME" "ECSクラスター名" -Required $true) -and $allValid
    Write-Host ""

    Write-Host "--- AWS RDS 設定 ---" -ForegroundColor Yellow
    $allValid = (Test-EnvVar "RDS_ENDPOINT" "RDSエンドポイント" -Required $false) -and $allValid
    $allValid = (Test-EnvVar "RDS_USERNAME" "RDSユーザー名" -Required $false) -and $allValid
    $allValid = (Test-EnvVar "RDS_PASSWORD" "RDSパスワード" -Required $false) -and $allValid
    Write-Host ""
}

# -----------------------------------------------------------------------------
# 検証結果のサマリー
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
if ($allValid) {
    Write-Host " 検証結果: 成功 ✅" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Success "すべての必須環境変数が正しく設定されています"
    Write-Info "次のステップ: シナリオドキュメントに従って検証を開始してください"

    if ($Phase -eq "phase1") {
        Write-Info "  → docs/phase1-shift-left/S01-ide-integration.md"
    } else {
        Write-Info "  → docs/phase2-code-to-cloud/S06-sbom-tracking.md"
    }

    exit 0
} else {
    Write-Host " 検証結果: 失敗 ❌" -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Error "一部の環境変数が正しく設定されていません"
    Write-Info "修正方法:"
    Write-Info "  1. .env.$Phase ファイルを編集"
    Write-Info "  2. .env.$Phase.template を参照して正しい値を設定"
    Write-Info "  3. 再度このスクリプトを実行: .\scripts\validate-env.ps1 $Phase"
    Write-Info ""
    Write-Info "詳細: docs/guides/ENVIRONMENT_VARIABLES_GUIDE.md を参照"

    exit 1
}
