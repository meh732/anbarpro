# AnbarMeh Windows PowerShell Prerequisites Downloader & Interactive Installer
# Language: English
$Host.UI.RawUI.WindowTitle = "AnbarMeh Windows Setup & Network Manager"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       AnbarMeh Enterprise Deployment - Windows Setup System     " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "`n🔍 Checking system prerequisites..." -ForegroundColor White

# Helper to check if a command exists
function Test-CommandExists {
    param ([string]$Command)
    return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

# Auto-install prerequisites if missing
$needsRestart = $false

# 1. Check & Install Git
if (-not (Test-CommandExists "git")) {
    Write-Host "⚠️ Git is missing. Installing Git via Windows Package Manager..." -ForegroundColor Yellow
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
    $needsRestart = $true
} else {
    Write-Host "✅ Git is already installed." -ForegroundColor Green
}

# 2. Check & Install Node.js
if (-not (Test-CommandExists "node")) {
    Write-Host "⚠️ Node.js is missing. Installing Node.js LTS via Windows Package Manager..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS -e --silent --accept-package-agreements --accept-source-agreements
    $needsRestart = $true
} else {
    Write-Host "✅ Node.js is already installed." -ForegroundColor Green
}

# 3. Check & Install Nginx
if (-not (Test-DirectoryExists "C:\nginx") -and -not (Test-CommandExists "nginx")) {
    Write-Host "💡 Note: For Windows reverse proxies, you can set up IIS (Internet Information Services) or standard Nginx for Windows." -ForegroundColor Gray
}

if ($needsRestart) {
    Write-Host "`n⚠️ Prerequisites were installed! You may need to restart your terminal or computer for environment variables (PATH) to refresh." -ForegroundColor Yellow
    $confirm = Read-Host "Would you like to try executing the setup immediately anyway? (Y/n)"
    if ($confirm -eq "n") {
        Write-Host "Exiting. Please reopen PowerShell and run setup.bat again." -ForegroundColor Cyan
        exit
    }
}

Write-Host "`n🚀 Executing Interactive English Deployment Console..." -ForegroundColor Green
node .\scripts\setup-menu.cjs
