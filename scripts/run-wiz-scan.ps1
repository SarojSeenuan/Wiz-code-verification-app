# =============================================================================
# Wiz スキャン実行スクリプト（PowerShell版）
# =============================================================================
# 用途: Wiz CLIでディレクトリ、IaC、Dockerイメージをスキャン
#
# 使用方法:
#   .\scripts\run-wiz-scan.ps1 -ScanType dir -Path ./backend
#   .\scripts\run-wiz-scan.ps1 -ScanType iac -Path ./terraform
#   .\scripts\run-wiz-scan.ps1 -ScanType docker -Image taskflow-backend:latest
#   .\scripts\run-wiz-scan.ps1 -ScanType secret -Path ./backend
#
# 詳細: docs/guides/WINDOWS_SETUP_GUIDE.md を参照
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dir', 'iac', 'docker', 'secret')]
    [string]$ScanType,

    [Parameter(Mandatory=$false)]
    [string]$Path = ".",

    [Parameter(Mandatory=$false)]
    [string]$Image = "",

    [Parameter(Mandatory=$false)]
    [string]$Phase = "phase1",

    [Parameter(Mandatory=$false)]
    [switch]$SkipAuth
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

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "🔹 $Message" -ForegroundColor Yellow
}

# エラーハンドリング
$ErrorActionPreference = "Stop"

# メイン処理
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Wiz Code スキャン実行スクリプト" -ForegroundColor Cyan
Write-Host " スキャンタイプ: $ScanType" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# .envファイルの読み込み
$envFile = ".env.$Phase"
if (Test-Path $envFile) {
    Write-Step ".envファイルを読み込んでいます: $envFile"
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)
        }
    }
    Write-Success ".envファイルを読み込みました"
} else {
    Write-Error ".envファイルが見つかりません: $envFile"
    Write-Info "作成方法: .env.$Phase.template を .env.$Phase にコピーして編集"
    exit 1
}

# Wiz認証情報の確認
$wizClientId = $env:WIZ_CLIENT_ID
$wizClientSecret = $env:WIZ_CLIENT_SECRET

if ([string]::IsNullOrEmpty($wizClientId) -or [string]::IsNullOrEmpty($wizClientSecret)) {
    Write-Error "Wiz認証情報が設定されていません"
    Write-Info "環境変数検証: .\scripts\validate-env.ps1 $Phase"
    exit 1
}

# Wiz CLI の存在確認
Write-Step "Wiz CLIの確認..."
try {
    $wizVersion = wizcli version 2>&1
    Write-Success "Wiz CLI: インストール済み"
} catch {
    Write-Error "Wiz CLIがインストールされていません"
    Write-Info "インストール方法: docs/guides/WINDOWS_SETUP_GUIDE.md を参照"
    exit 1
}

# Wiz 認証
if (-not $SkipAuth) {
    Write-Step "Wizに認証中..."
    try {
        wizcli auth --id $wizClientId --secret $wizClientSecret | Out-Null
        Write-Success "Wiz認証: 成功"
    } catch {
        Write-Error "Wiz認証に失敗しました"
        Write-Info "認証情報を確認してください: .env.$Phase"
        exit 1
    }
}

# Git情報の取得
Write-Step "Git情報を取得中..."
$gitCommit = git rev-parse --short HEAD 2>$null
$gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
$gitRepo = $env:GITHUB_REPOSITORY

if ([string]::IsNullOrEmpty($gitCommit)) {
    $gitCommit = "unknown"
    Write-Info "Gitコミット情報が取得できませんでした（Gitリポジトリ外？）"
}

if ([string]::IsNullOrEmpty($gitBranch)) {
    $gitBranch = "unknown"
}

Write-Info "Git Commit: $gitCommit"
Write-Info "Git Branch: $gitBranch"
Write-Host ""

# スキャンタイプ別の実行
switch ($ScanType) {
    "dir" {
        Write-Step "ディレクトリスキャンを開始: $Path"
        Write-Info "コマンド: wizcli dir scan"
        Write-Host ""

        $scanName = "dir-scan-$gitCommit"
        $componentTag = Split-Path -Leaf $Path

        wizcli dir scan `
            --path $Path `
            --name $scanName `
            --tag "component=$componentTag" `
            --tag "commit=$gitCommit" `
            --tag "branch=$gitBranch" `
            --policy "Default vulnerabilities policy"

        if ($LASTEXITCODE -eq 0) {
            Write-Success "ディレクトリスキャン: 完了"
        } else {
            Write-Error "ディレクトリスキャン: 失敗（終了コード: $LASTEXITCODE）"
            exit $LASTEXITCODE
        }
    }

    "iac" {
        Write-Step "IaCスキャンを開始: $Path"
        Write-Info "コマンド: wizcli iac scan"
        Write-Host ""

        wizcli iac scan `
            --path $Path `
            --policy-hits-only `
            --tag "iac-type=terraform" `
            --tag "commit=$gitCommit" `
            --tag "branch=$gitBranch"

        if ($LASTEXITCODE -eq 0) {
            Write-Success "IaCスキャン: 完了"
        } else {
            Write-Error "IaCスキャン: 失敗（終了コード: $LASTEXITCODE）"
            exit $LASTEXITCODE
        }
    }

    "docker" {
        if ([string]::IsNullOrEmpty($Image)) {
            Write-Error "Dockerイメージ名が指定されていません"
            Write-Info "使用方法: .\scripts\run-wiz-scan.ps1 -ScanType docker -Image myimage:latest"
            exit 1
        }

        Write-Step "Dockerイメージスキャンを開始: $Image"
        Write-Info "コマンド: wizcli docker scan"
        Write-Host ""

        $componentTag = $Image -replace ':.+$', ''

        wizcli docker scan `
            --image $Image `
            --tag "component=$componentTag" `
            --tag "commit=$gitCommit" `
            --tag "branch=$gitBranch" `
            --tag "source-repo=$gitRepo"

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dockerイメージスキャン: 完了"
        } else {
            Write-Error "Dockerイメージスキャン: 失敗（終了コード: $LASTEXITCODE）"
            exit $LASTEXITCODE
        }
    }

    "secret" {
        Write-Step "シークレットスキャンを開始: $Path"
        Write-Info "コマンド: wizcli dir scan --secret-scan-only"
        Write-Host ""

        $scanName = "secret-scan-$gitCommit"
        $componentTag = Split-Path -Leaf $Path

        wizcli dir scan `
            --path $Path `
            --secret-scan-only `
            --name $scanName `
            --tag "component=$componentTag" `
            --tag "scan-type=secret-detection" `
            --tag "commit=$gitCommit" `
            --tag "branch=$gitBranch"

        if ($LASTEXITCODE -eq 0) {
            Write-Success "シークレットスキャン: 完了"
        } else {
            Write-Error "シークレットスキャン: 失敗（終了コード: $LASTEXITCODE）"
            exit $LASTEXITCODE
        }
    }
}

# 完了メッセージ
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Success "スキャン完了"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Info "Wizコンソールで結果を確認: https://app.wiz.io/overview"
Write-Host ""
