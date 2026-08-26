@echo off
chcp 65001 > nul
title AnbarMeh Enterprise - Windows Tauri Exe Builder
echo ==============================================================================
echo    AnbarMeh Enterprise - Windows Desktop (.EXE / Setup) Builder (Tauri)
echo ==============================================================================
echo.

echo [1/4] Checking Node.js and npm environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! Please download and install from https://nodejs.org
    pause
    exit /b 1
)
node -v

echo [2/4] Checking Rust and Cargo environment for Tauri...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Rust/Cargo was not found in PATH!
    echo To compile Tauri Windows .exe, install Rust from: https://rustup.rs
    echo After installing Rust, restart this script.
    echo.
    echo Alternative: You can also use Electron or standard Web browser client.
    pause
    exit /b 1
)
cargo --version

echo [3/4] Installing project dependencies and building React frontend...
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo [4/4] Building Windows .EXE and Setup with Tauri...
call npx @tauri-apps/cli build
if %errorlevel% neq 0 (
    echo [ERROR] Tauri build encountered an issue.
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo [SUCCESS] Windows Setup and Standalone .EXE created successfully!
echo Output folder: src-tauri\target\release\bundle\
echo ==============================================================================
echo.
pause
