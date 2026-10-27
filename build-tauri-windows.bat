@echo off
chcp 65001 >nul
title AnbarMeh Enterprise - Windows Tauri Installer Builder (Server & Client Edition)
color 0B

echo ===============================================================================
echo    AnbarMeh Enterprise ERP v2.5 - Windows Tauri Desktop Builder
echo    نسخه دسکتاپ ویندوز (پشتیبانی از حالت سرور مرکزی با قفل سخت‌افزاری + کلاینت شبکه)
echo ===============================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js یافت نشد! لطفاً ابتدا Node.js LTS را از سایت nodejs.org نصب کنید.
    pause
    exit /b 1
)

:: 2. Clean Linux-specific lockfile or @tailwindcss/oxide-linux-x64-gnu
echo [1/5] در حال آماده‌سازی package.json برای ویندوز...
node -e "const fs=require('fs'); if(fs.existsSync('package.json')){const p=JSON.parse(fs.readFileSync('package.json','utf8')); if(p.devDependencies&&p.devDependencies['@tailwindcss/oxide-linux-x64-gnu']){delete p.devDependencies['@tailwindcss/oxide-linux-x64-gnu']; fs.writeFileSync('package.json',JSON.stringify(p,null,2));}} if(fs.existsSync('package-lock.json')){fs.unlinkSync('package-lock.json');}"

echo.
echo [2/5] در حال نصب پکیج‌ها (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] خطا در نصب پکیج‌های npm.
    pause
    exit /b 1
)

echo.
echo [3/5] در حال تولید آیکون‌های استاندارد ویندوز (src-tauri\icons\icon.ico)...
if exist "scripts\generate-tauri-icons.cjs" (
    node scripts\generate-tauri-icons.cjs
)

echo.
echo [4/5] در حال کامپایل فرانت‌اند و باندل کردن سرور مرکزی (npm run build)...
call npm run build

echo.
echo [5/5] در حال ساخت فایل اجرایی ویندوز (.exe) با موتور Tauri...
call npx --yes @tauri-apps/cli@1.5 build --bundles nsis

:: Check if the main executable was compiled successfully (even if GitHub WiX/NSIS download was blocked by TLS)
if exist "src-tauri\target\release\anbarmeh-enterprise.exe" (
    echo.
    color 0A
    echo ===============================================================================
    echo [SUCCESS] فایل اجرایی اصلی ویندوز با موفقیت کامپایل و ساخته شد!
    echo ===============================================================================
    if not exist "AnbarMeh-Windows-Setup" mkdir "AnbarMeh-Windows-Setup"
    if not exist "AnbarMeh-Windows-Setup\dist" mkdir "AnbarMeh-Windows-Setup\dist"
    copy /Y "src-tauri\target\release\anbarmeh-enterprise.exe" "AnbarMeh-Windows-Setup\AnbarMeh-Enterprise.exe" >nul
    if exist "dist\server.cjs" copy /Y "dist\server.cjs" "AnbarMeh-Windows-Setup\dist\server.cjs" >nul
    echo.
    echo   1) مسیر فایل اجرایی مستقیم:
    echo      src-tauri\target\release\anbarmeh-enterprise.exe
    echo   2) پوشه آماده نصب روی هر ویندوز (همراه با سرور مرکزی):
    echo      AnbarMeh-Windows-Setup\AnbarMeh-Enterprise.exe
    echo ===============================================================================
    explorer "AnbarMeh-Windows-Setup"
) else (
    color 0C
    echo [ERROR] خطا در کامپایل فایل اجرایی.
)
pause
