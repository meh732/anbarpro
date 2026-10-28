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
echo [4/5] در حال کامپایل فرانت‌اند و باندل کردن سرور مرکزی مستقل (npm run build)...
call npm run build

:: Pre-sync standalone dist (index.html + assets + self-contained server.cjs) to existing release folders
if exist "AnbarMeh-Windows-Setup" (
    xcopy /E /I /Y "dist" "AnbarMeh-Windows-Setup\dist" >nul 2>nul
)
if exist "src-tauri\target\release\_up_" (
    xcopy /E /I /Y "dist" "src-tauri\target\release\_up_\dist" >nul 2>nul
)

echo.
echo [5/5] در حال ساخت فایل اجرایی ویندوز (.exe) با موتور Tauri...
call npx --yes @tauri-apps/cli@1.5 build --bundles nsis

:: Check if the main executable was compiled successfully (even if GitHub WiX/NSIS download was blocked by TLS)
if exist "src-tauri\target\release\anbarmeh-enterprise.exe" (
    echo.
    color 0A
    echo ===============================================================================
    echo [SUCCESS] فایل اجرایی اصلی ویندوز و سرور مرکزی مستقل با موفقیت ساخته شدند!
    echo ===============================================================================
    if not exist "AnbarMeh-Windows-Setup" mkdir "AnbarMeh-Windows-Setup"
    if not exist "AnbarMeh-Windows-Setup\dist" mkdir "AnbarMeh-Windows-Setup\dist"
    if not exist "AnbarMeh-Windows-Setup\data" mkdir "AnbarMeh-Windows-Setup\data"
    copy /Y "src-tauri\target\release\anbarmeh-enterprise.exe" "AnbarMeh-Windows-Setup\AnbarMeh-Enterprise.exe" >nul
    xcopy /E /I /Y "dist" "AnbarMeh-Windows-Setup\dist" >nul
    xcopy /E /I /Y "dist" "src-tauri\target\release\dist" >nul 2>nul
    xcopy /E /I /Y "dist" "src-tauri\target\release\_up_\dist" >nul 2>nul
    if exist "Open-Firewall-Port.bat" copy /Y "Open-Firewall-Port.bat" "AnbarMeh-Windows-Setup\Open-Firewall-Port.bat" >nul
    if exist "Start-Central-SQL-Server-Background.bat" copy /Y "Start-Central-SQL-Server-Background.bat" "AnbarMeh-Windows-Setup\Start-Central-SQL-Server-Background.bat" >nul
    if exist "data\anbarmeh_background_daemon.vbs" copy /Y "data\anbarmeh_background_daemon.vbs" "AnbarMeh-Windows-Setup\data\anbarmeh_background_daemon.vbs" >nul
    if exist "data\anbarmeh_server_runner.bat" copy /Y "data\anbarmeh_server_runner.bat" "AnbarMeh-Windows-Setup\data\anbarmeh_server_runner.bat" >nul
    echo.
    echo   1) مسیر فایل اجرایی مستقیم:
    echo      src-tauri\target\release\anbarmeh-enterprise.exe
    echo   2) پوشه کامل و مستقل آماده نصب روی هر ویندوز (همراه با سرور مرکزی و رابط وب موبایل):
    echo      AnbarMeh-Windows-Setup\AnbarMeh-Enterprise.exe
    echo ===============================================================================
    explorer "AnbarMeh-Windows-Setup"
) else (
    color 0C
    echo [ERROR] خطا در کامپایل فایل اجرایی.
)
pause
