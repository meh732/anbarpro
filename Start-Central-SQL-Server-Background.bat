@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "dist\server.cjs" (
  if exist "AnbarMeh-Windows-Setup" xcopy /E /I /Y "dist" "AnbarMeh-Windows-Setup\dist" >nul 2>nul
  if exist "src-tauri\target\release\_up_" xcopy /E /I /Y "dist" "src-tauri\target\release\_up_\dist" >nul 2>nul
  if exist "src-tauri\target\release" xcopy /E /I /Y "dist" "src-tauri\target\release\dist" >nul 2>nul
)
wmic process where "name='node.exe' and commandline like '%%server.cjs%%'" call terminate >nul 2>nul
wscript.exe "%~dp0data\anbarmeh_background_daemon.vbs"
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "AnbarMehCentralSQLServer" /t REG_SZ /d "wscript.exe \"%~dp0data\anbarmeh_background_daemon.vbs\"" /f >nul 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~dp0Open-Firewall-Port.bat' -ArgumentList '5050' -Verb RunAs" >nul 2>nul