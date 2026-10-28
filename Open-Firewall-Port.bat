@echo off
chcp 65001 >nul
title Open AnbarMeh LAN Port in Windows Firewall
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "if ('%*') { Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs } else { Start-Process -FilePath '%~f0' -Verb RunAs }"
  exit /b
)
cd /d "%~dp0"
echo ======================================================================
echo  AnbarMeh Enterprise - Open Windows Firewall TCP Port
echo ======================================================================
set TARGET_PORT=%1
if "%TARGET_PORT%"=="" set TARGET_PORT=1515
echo Adding firewall rule for port %TARGET_PORT% (all network profiles)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-NetFirewallRule -DisplayName 'AnbarMeh-TCP-%TARGET_PORT%' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'AnbarMeh-TCP-%TARGET_PORT%' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %TARGET_PORT% -Profile Any -Enabled True" >nul 2>nul
netsh advfirewall firewall delete rule name=AnbarMeh-TCP-%TARGET_PORT% >nul 2>nul
netsh advfirewall firewall add rule name=AnbarMeh-TCP-%TARGET_PORT% dir=in action=allow protocol=TCP localport=%TARGET_PORT% profile=any >nul 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-NetFirewallRule -DisplayName 'AnbarMeh-TCP-3000' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'AnbarMeh-TCP-3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -Enabled True" >nul 2>nul
netsh advfirewall firewall delete rule name=AnbarMeh-TCP-3000 >nul 2>nul
netsh advfirewall firewall add rule name=AnbarMeh-TCP-3000 dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>nul
netsh advfirewall firewall add rule name=AnbarMeh-Node dir=in action=allow program="node.exe" profile=any >nul 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue" >nul 2>nul
echo.
echo SUCCESS: Windows Firewall now allows all LAN computers and phones on port %TARGET_PORT% and 3000!
echo ======================================================================
timeout /t 5 >nul