# AnbarMeh Enterprise - Windows Tauri Desktop App Builder (.EXE / MSI Setup)
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "       AnbarMeh Enterprise - Windows Desktop (.EXE / Setup) Builder (Tauri)   " -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/4] Checking Node.js and npm..." -ForegroundColor Blue
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed. Please install from https://nodejs.org" -ForegroundColor Red
    Exit 1
}
Write-Host "✓ Node: $(node -v) | npm: $(npm -v)" -ForegroundColor Green

# Check Rust / Cargo
Write-Host "[2/4] Checking Rust and Cargo for Tauri..." -ForegroundColor Blue
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "[WARNING] Cargo (Rust) was not found in PATH." -ForegroundColor Yellow
    Write-Host "To build native Windows .exe using Tauri, install Rust from: https://rustup.rs" -ForegroundColor Yellow
    Write-Host "After installing Rust and restarting PowerShell, run this script again." -ForegroundColor Yellow
    Exit 1
}
Write-Host "✓ Cargo: $(cargo --version)" -ForegroundColor Green

# Install dependencies and build React
Write-Host "[3/4] Installing dependencies & building frontend..." -ForegroundColor Blue
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed!" -ForegroundColor Red
    Exit 1
}
Write-Host "✓ Frontend built successfully into /dist" -ForegroundColor Green

# Build Tauri EXE
Write-Host "[4/4] Compiling Windows Standalone .EXE and MSI Setup..." -ForegroundColor Blue
npx @tauri-apps/cli build
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==============================================================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Windows Setup and Standalone .EXE generated successfully!" -ForegroundColor Green
    Write-Host "Output Directory: .\src-tauri\target\release\bundle\" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Tauri compilation failed. Check above errors." -ForegroundColor Red
}
