@echo off
chcp 65001 >nul
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs"
cd /d "%~dp0.."
set PORT=5050
set NODE_ENV=production
:supervise_loop
netstat -ano | findstr ":5050 " | findstr "LISTENING" >nul 2>nul
if %errorlevel% neq 0 (
  if exist "dist\server.cjs" (
    node "dist\server.cjs"
  ) else if exist "..\..\..\dist\server.cjs" (
    pushd "..\..\.."
    node "dist\server.cjs"
    popd
  ) else if exist "_up_\dist\server.cjs" (
    node "_up_\dist\server.cjs"
  )
)
timeout /t 3 >nul
goto supervise_loop