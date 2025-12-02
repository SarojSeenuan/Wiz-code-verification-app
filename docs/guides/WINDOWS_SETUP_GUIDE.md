# Windows環境セットアップガイド

本ガイドでは、Windows 10/11でWiz Code検証環境をセットアップする手順を説明します。

> **📌 このドキュメントを読むべきタイミング**
> [MANUAL_SETUP_GUIDE.md](./MANUAL_SETUP_GUIDE.md)を読んだ後、Windows環境の方のみ読んでください。

> **📖 次に読むべきドキュメント**
> [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)

> **🔙 ガイド一覧に戻る**
> [ガイド一覧](./README.md)

---

## 目次

1. [前提条件](#前提条件)
2. [PowerShell管理者権限での起動](#powershell管理者権限での起動)
3. [必須ツールのインストール](#必須ツールのインストール)
4. [環境変数の設定](#環境変数の設定)
5. [パス設定の確認](#パス設定の確認)
6. [PowerShellスクリプトの実行](#powershellスクリプトの実行)
7. [Windows固有のトラブルシューティング](#windows固有のトラブルシューティング)

---

## 前提条件

### Windows バージョン

- ✅ Windows 10 バージョン 1903以降
- ✅ Windows 11（すべてのバージョン）
- ✅ Windows Server 2019以降

### PowerShell バージョン

```powershell
# PowerShellバージョン確認
$PSVersionTable.PSVersion

# 推奨: PowerShell 5.1以上
# PowerShell 7.x（推奨）はこちらからインストール:
# https://github.com/PowerShell/PowerShell/releases
```

**PowerShell 7のインストール（推奨）**:
```powershell
# wingetでインストール
winget install Microsoft.PowerShell
```

---

## PowerShell管理者権限での起動

多くのインストール操作には管理者権限が必要です。

### 方法1: スタートメニューから

1. **スタートメニュー**を開く
2. 「**PowerShell**」と入力
3. 「**Windows PowerShell**」または「**PowerShell 7**」を右クリック
4. 「**管理者として実行**」を選択

### 方法2: ファイルエクスプローラーから

1. **ファイルエクスプローラー**を開く
2. プロジェクトディレクトリに移動
3. アドレスバーに「**powershell**」と入力してEnter
4. PowerShellが開いたら、以下を実行して管理者権限で再起動:

```powershell
Start-Process powershell -Verb runAs
```

### 管理者権限の確認

```powershell
# 現在のユーザーが管理者権限で実行しているか確認
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "✓ 管理者権限で実行中" -ForegroundColor Green
} else {
    Write-Host "✗ 管理者権限が必要です" -ForegroundColor Red
    Write-Host "PowerShellを管理者として再起動してください" -ForegroundColor Yellow
}
```

---

## 必須ツールのインストール

### wingetを使った一括インストール（推奨）

winget（Windows Package Manager）を使用すると、すべてのツールを簡単にインストールできます。

```powershell
# wingetが利用可能か確認
winget --version

# wingetがない場合、Microsoft Storeから「アプリ インストーラー」をインストール
```

**一括インストールスクリプト**:

```powershell
# Node.js 18 LTS
winget install OpenJS.NodeJS.LTS

# Git
winget install Git.Git

# Docker Desktop
winget install Docker.DockerDesktop

# Visual Studio Code
winget install Microsoft.VisualStudioCode

# AWS CLI
winget install Amazon.AWSCLI

# Terraform
winget install Hashicorp.Terraform

# GitHub CLI（オプション）
winget install GitHub.cli

Write-Host "すべてのツールのインストールが完了しました" -ForegroundColor Green
Write-Host "システムを再起動してください" -ForegroundColor Yellow
```

### 手動インストール

wingetが使えない場合は、以下のリンクから各ツールを手動でインストールしてください：

| ツール | ダウンロードURL |
|--------|----------------|
| Node.js | https://nodejs.org/ |
| Git | https://git-scm.com/download/win |
| Docker Desktop | https://www.docker.com/products/docker-desktop |
| VS Code | https://code.visualstudio.com/ |
| AWS CLI | https://aws.amazon.com/cli/ |
| Terraform | https://www.terraform.io/downloads |

### インストール確認

```powershell
# バージョン確認スクリプト
Write-Host "=== インストール確認 ===" -ForegroundColor Cyan

$tools = @(
    @{Name="Node.js"; Command="node"; Args="--version"; MinVersion="v18.0.0"},
    @{Name="npm"; Command="npm"; Args="--version"; MinVersion="9.0.0"},
    @{Name="Git"; Command="git"; Args="--version"; MinVersion="2.30.0"},
    @{Name="Docker"; Command="docker"; Args="--version"; MinVersion="20.0.0"},
    @{Name="AWS CLI"; Command="aws"; Args="--version"; MinVersion="2.0.0"},
    @{Name="Terraform"; Command="terraform"; Args="--version"; MinVersion="1.6.0"}
)

foreach ($tool in $tools) {
    try {
        $version = & $tool.Command $tool.Args 2>&1
        Write-Host "✓ $($tool.Name): $version" -ForegroundColor Green
    } catch {
        Write-Host "✗ $($tool.Name): インストールされていません" -ForegroundColor Red
    }
}
```

---

## 環境変数の設定

### システム環境変数の永続設定

Windows環境変数は、PowerShellセッション終了後も保持するために**システム環境変数**として設定します。

#### Wiz認証情報の設定

```powershell
# ユーザー環境変数として設定（推奨）
[System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_ID', 'your_client_id_here', 'User')
[System.Environment]::SetEnvironmentVariable('WIZ_CLIENT_SECRET', 'your_client_secret_here', 'User')

# 設定確認
Write-Host "WIZ_CLIENT_ID: $env:WIZ_CLIENT_ID" -ForegroundColor Cyan
Write-Host "WIZ_CLIENT_SECRET: $env:WIZ_CLIENT_SECRET" -ForegroundColor Cyan
```

#### AWS認証情報の設定（Phase 2以降）

```powershell
# AWS認証情報
[System.Environment]::SetEnvironmentVariable('AWS_ACCESS_KEY_ID', 'your_access_key', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_SECRET_ACCESS_KEY', 'your_secret_key', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_REGION', 'us-east-1', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_ACCOUNT_ID', 'your_account_id', 'User')

# 設定確認
Write-Host "AWS_ACCESS_KEY_ID: $env:AWS_ACCESS_KEY_ID" -ForegroundColor Cyan
Write-Host "AWS_REGION: $env:AWS_REGION" -ForegroundColor Cyan
```

### 現在のセッションのみで設定（一時的）

```powershell
# 現在のPowerShellセッションのみで有効
$env:WIZ_CLIENT_ID = "your_client_id_here"
$env:WIZ_CLIENT_SECRET = "your_client_secret_here"

# ⚠️ PowerShellを閉じると消えます
```

### .envファイルを使った設定（推奨）

プロジェクトルートに`.env`ファイルを作成して管理する方法が推奨されます。

```powershell
# .envファイルの作成
@"
WIZ_CLIENT_ID=your_client_id_here
WIZ_CLIENT_SECRET=your_client_secret_here
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your_account_id
"@ | Out-File -FilePath .env -Encoding UTF8

Write-Host ".envファイルを作成しました" -ForegroundColor Green
```

**.envファイルから環境変数を読み込むスクリプト**:

```powershell
# load-env.ps1
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
            Write-Host "設定: $name" -ForegroundColor Green
        }
    }
    Write-Host ".envファイルから環境変数を読み込みました" -ForegroundColor Cyan
} else {
    Write-Host ".envファイルが見つかりません" -ForegroundColor Red
}
```

---

## パス設定の確認

### PATHの確認

```powershell
# 現在のPATHを表示
$env:Path -split ';' | ForEach-Object { Write-Host $_ }

# 特定のツールがPATHに含まれているか確認
$requiredPaths = @(
    "nodejs",
    "Git",
    "Docker",
    "AWS CLI",
    "Terraform"
)

Write-Host "=== PATH確認 ===" -ForegroundColor Cyan
foreach ($path in $requiredPaths) {
    $found = $env:Path -split ';' | Where-Object { $_ -like "*$path*" }
    if ($found) {
        Write-Host "✓ $path が見つかりました: $found" -ForegroundColor Green
    } else {
        Write-Host "✗ $path が見つかりません" -ForegroundColor Red
    }
}
```

### PATHの追加（必要な場合）

```powershell
# 例: Wiz CLIをPATHに追加
$wizCliPath = "C:\Program Files\wizcli"

# 現在のセッションのみ
$env:Path += ";$wizCliPath"

# 永続的に追加（ユーザー環境変数）
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = "$currentPath;$wizCliPath"
[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')

Write-Host "PATHに追加しました: $wizCliPath" -ForegroundColor Green
```

---

## PowerShellスクリプトの実行

### 実行ポリシーの設定

Windows PowerShellはデフォルトでスクリプト実行が制限されています。

```powershell
# 現在の実行ポリシーを確認
Get-ExecutionPolicy

# 実行ポリシーを変更（管理者権限が必要）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 確認
Get-ExecutionPolicy
```

**実行ポリシーの種類**:
- **Restricted**: スクリプト実行不可（デフォルト）
- **RemoteSigned**: ローカルスクリプトは実行可、ダウンロードスクリプトは署名が必要（推奨）
- **Unrestricted**: すべてのスクリプトを実行可（非推奨）

### PowerShellスクリプトの実行

```powershell
# スクリプトの実行
cd taskflow-app\scripts\setup
.\init-database.ps1

# 引数を渡す
.\run-wiz-scan.ps1 -ScanType "s03"
```

### 一時的にバイパスして実行

```powershell
# 実行ポリシーを一時的にバイパス
powershell -ExecutionPolicy Bypass -File .\init-database.ps1
```

---

## Windows固有のトラブルシューティング

### 問題1: PowerShell実行ポリシーエラー

**エラーメッセージ**:
```
.\init-database.ps1 : このシステムではスクリプトの実行が無効になっているため、ファイル .\init-database.ps1 を読み込むことができません。
```

**解決方法**:
```powershell
# 実行ポリシーを変更
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### 問題2: Docker Desktopが起動しない

**症状**: Docker Desktopが起動時にエラーを表示

**解決方法**:

1. **WSL 2が有効化されているか確認**:
```powershell
# WSL 2の状態確認
wsl --list --verbose

# WSL 2をデフォルトに設定
wsl --set-default-version 2
```

2. **Hyper-Vが有効化されているか確認**（Windows Pro/Enterprise）:
```powershell
# 管理者PowerShellで実行
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

3. **Docker Desktopの再インストール**:
```powershell
# Docker Desktopをアンインストール
winget uninstall Docker.DockerDesktop

# 再インストール
winget install Docker.DockerDesktop
```

---

### 問題3: パスにスペースが含まれる場合のエラー

**症状**: ファイルパスにスペースが含まれているとコマンドが失敗する

**解決方法**:

```powershell
# ダブルクォートでパスを囲む
cd "C:\Users\Your Name\Documents\WizCodeVerification"

# または、バッククォート（`）を使用
cd C:\Users\Your` Name\Documents\WizCodeVerification
```

---

### 問題4: 環境変数が反映されない

**症状**: 環境変数を設定したが、コマンドで認識されない

**解決方法**:

```powershell
# PowerShellを再起動
exit

# または、環境変数を再読み込み
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
```

---

### 問題5: Git Bash vs PowerShellの混在

**症状**: Git BashとPowerShellでコマンドが異なる

**解決方法**:

| 操作 | Git Bash | PowerShell |
|------|----------|------------|
| ディレクトリ移動 | `cd /c/Users/...` | `cd C:\Users\...` |
| 環境変数設定 | `export VAR=value` | `$env:VAR = "value"` |
| 環境変数表示 | `echo $VAR` | `Write-Host $env:VAR` |
| スクリプト実行 | `./script.sh` | `.\script.ps1` |

**推奨**: PowerShellに統一して使用

---

### 問題6: PostgreSQL接続エラー（localhost vs 127.0.0.1）

**症状**: `localhost`での接続が失敗する

**解決方法**:

```powershell
# localhostの代わりに127.0.0.1を使用
$env:DATABASE_HOST = "127.0.0.1"

# または、hostsファイルを確認
notepad C:\Windows\System32\drivers\etc\hosts

# 以下が含まれているか確認:
# 127.0.0.1 localhost
```

---

### 問題7: ポート競合エラー

**症状**: `EADDRINUSE: address already in use :::3000`

**解決方法**:

```powershell
# 使用中のポートを確認
netstat -ano | findstr :3000

# プロセスIDを確認して終了
taskkill /PID <プロセスID> /F

# または、すべてのNode.jsプロセスを終了
Get-Process node | Stop-Process -Force
```

---

## 動作確認チェックリスト

```powershell
# 動作確認スクリプト
Write-Host "=== WizCode検証環境 動作確認 ===" -ForegroundColor Cyan

# ツール確認
Write-Host "`n1. ツールバージョン確認" -ForegroundColor Yellow
node --version
npm --version
git --version
docker --version
aws --version
terraform --version

# 環境変数確認
Write-Host "`n2. 環境変数確認" -ForegroundColor Yellow
Write-Host "WIZ_CLIENT_ID: $(if($env:WIZ_CLIENT_ID){'設定済み'}else{'未設定'})" -ForegroundColor $(if($env:WIZ_CLIENT_ID){'Green'}else{'Red'})
Write-Host "AWS_ACCESS_KEY_ID: $(if($env:AWS_ACCESS_KEY_ID){'設定済み'}else{'未設定'})" -ForegroundColor $(if($env:AWS_ACCESS_KEY_ID){'Green'}else{'Red'})

# Docker確認
Write-Host "`n3. Docker起動確認" -ForegroundColor Yellow
docker ps

# PostgreSQL確認（Docker Compose使用時）
Write-Host "`n4. PostgreSQL起動確認" -ForegroundColor Yellow
docker ps | Select-String "postgres"

Write-Host "`n✓ 動作確認完了" -ForegroundColor Green
```

---

## 次のステップ

Windows環境のセットアップが完了したら、以下のドキュメントに進んでください：

1. **[ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md)** - 環境変数の詳細設定
2. **[BRANCH_MANAGEMENT_GUIDE.md](./BRANCH_MANAGEMENT_GUIDE.md)** - ブランチ戦略の理解
3. **[Phase 1シナリオ](../phase1-shift-left/README.md)** - S01から検証開始

---

## 参考資料

- [PowerShell公式ドキュメント](https://docs.microsoft.com/ja-jp/powershell/)
- [Windows Package Manager (winget)](https://docs.microsoft.com/ja-jp/windows/package-manager/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/)
- [WSL 2のインストール](https://docs.microsoft.com/ja-jp/windows/wsl/install)

---

**🔙 [ガイド一覧に戻る](./README.md)**
