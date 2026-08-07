@echo off
chcp 65001 > nul
title AnbarMeh Windows Installer & Backup Tool
cls
echo ================================================================
echo    AnbarMeh Windows Enterprise Installer & Backup Manager
echo ================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0installer.ps1"
pause
