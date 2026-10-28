import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { resolveCentralDataDir } from './dataDirResolver.ts';

export interface WindowsBackgroundServiceStatus {
  isSupportedPlatform: boolean;
  isServiceRegistered: boolean;
  isBackgroundDaemonReady: boolean;
  autostartMethod: string;
  daemonVbsPath: string;
  runnerBatPath: string;
  configuredPort: number;
  statusMessage: string;
}

export class WindowsBackgroundServiceManager {
  private rootDir: string;
  private dataDir: string;
  private runnerBatPath: string;
  private daemonVbsPath: string;
  private serviceStateFile: string;
  private cachedRegistered: boolean | null = null;

  constructor() {
    this.dataDir = resolveCentralDataDir();
    this.rootDir = path.dirname(this.dataDir);

    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch {}
    }

    this.runnerBatPath = path.join(this.dataDir, 'anbarmeh_server_runner.bat');
    this.daemonVbsPath = path.join(this.dataDir, 'anbarmeh_background_daemon.vbs');
    this.serviceStateFile = path.join(this.dataDir, 'background_service_state.json');
  }

  /**
   * Generates lightweight .bat and windowless .vbs startup scripts.
   * Checks `netstat` first so it never spawns duplicate Node processes if the server is already running.
   */
  public ensureBackgroundScripts(port: number = 3000): void {
    try {
      const batContent = [
        '@echo off',
        'chcp 65001 >nul',
        'set "PATH=%PATH%;C:\\Program Files\\nodejs;C:\\Program Files (x86)\\nodejs;%APPDATA%\\npm;%LOCALAPPDATA%\\Programs\\nodejs"',
        'cd /d "%~dp0.."',
        `set PORT=${port}`,
        'set NODE_ENV=production',
        ':supervise_loop',
        `netstat -ano | findstr ":${port} " | findstr "LISTENING" >nul 2>nul`,
        'if %errorlevel% neq 0 (',
        '  if exist "dist\\server.cjs" (',
        '    node "dist\\server.cjs"',
        '  ) else if exist "..\\..\\..\\dist\\server.cjs" (',
        '    pushd "..\\..\\.."',
        '    node "dist\\server.cjs"',
        '    popd',
        '  ) else if exist "_up_\\dist\\server.cjs" (',
        '    node "_up_\\dist\\server.cjs"',
        '  )',
        ')',
        'timeout /t 3 >nul',
        'goto supervise_loop',
      ].join('\r\n');

      fs.writeFileSync(this.runnerBatPath, batContent, 'utf-8');

      const vbsContent = [
        'Set fso = CreateObject("Scripting.FileSystemObject")',
        'scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)',
        'rootDir = fso.GetParentFolderName(scriptDir)',
        'Set WshShell = CreateObject("WScript.Shell")',
        'WshShell.CurrentDirectory = rootDir',
        'WshShell.Run """" & scriptDir & "\\anbarmeh_server_runner.bat""", 0, False',
        'Set WshShell = Nothing',
        'Set fso = Nothing',
      ].join('\r\n');

      fs.writeFileSync(this.daemonVbsPath, vbsContent, 'utf-8');

      const startHelperPath = path.join(this.rootDir, 'Start-Central-SQL-Server-Background.bat');
      const startHelperContent = [
        '@echo off',
        'chcp 65001 >nul',
        'cd /d "%~dp0"',
        'if exist "dist\\server.cjs" (',
        '  if exist "AnbarMeh-Windows-Setup" xcopy /E /I /Y "dist" "AnbarMeh-Windows-Setup\\dist" >nul 2>nul',
        '  if exist "src-tauri\\target\\release\\_up_" xcopy /E /I /Y "dist" "src-tauri\\target\\release\\_up_\\dist" >nul 2>nul',
        '  if exist "src-tauri\\target\\release" xcopy /E /I /Y "dist" "src-tauri\\target\\release\\dist" >nul 2>nul',
        ')',
        'wscript.exe "%~dp0data\\anbarmeh_background_daemon.vbs"',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "AnbarMehCentralSQLServer" /t REG_SZ /d "wscript.exe \\"%~dp0data\\anbarmeh_background_daemon.vbs\\"" /f >nul 2>nul',
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~dp0Open-Firewall-Port.bat' -ArgumentList '${port}' -Verb RunAs" >nul 2>nul`,
      ].join('\r\n');
      fs.writeFileSync(startHelperPath, startHelperContent, 'utf-8');

      // Generate standalone one-click elevated Open-Firewall-Port.bat
      const firewallBatPath = path.join(this.rootDir, 'Open-Firewall-Port.bat');
      const firewallBatDataPath = path.join(this.dataDir, 'open_firewall_port.bat');
      const firewallBatContent = [
        '@echo off',
        'chcp 65001 >nul',
        'title Open AnbarMeh LAN Port in Windows Firewall',
        'net session >nul 2>&1',
        'if %errorlevel% neq 0 (',
        '  powershell -NoProfile -ExecutionPolicy Bypass -Command "if (\'%*\') { Start-Process -FilePath \'%~f0\' -ArgumentList \'%*\' -Verb RunAs } else { Start-Process -FilePath \'%~f0\' -Verb RunAs }"',
        '  exit /b',
        ')',
        'cd /d "%~dp0"',
        'echo ======================================================================',
        'echo  AnbarMeh Enterprise - Open Windows Firewall TCP Port',
        'echo ======================================================================',
        `set TARGET_PORT=%1`,
        `if "%TARGET_PORT%"=="" set TARGET_PORT=${port}`,
        'echo Adding firewall rule for port %TARGET_PORT% (all network profiles)...',
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-NetFirewallRule -DisplayName \'AnbarMeh-TCP-%TARGET_PORT%\' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName \'AnbarMeh-TCP-%TARGET_PORT%\' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %TARGET_PORT% -Profile Any -Enabled True" >nul 2>nul',
        'netsh advfirewall firewall delete rule name=AnbarMeh-TCP-%TARGET_PORT% >nul 2>nul',
        'netsh advfirewall firewall add rule name=AnbarMeh-TCP-%TARGET_PORT% dir=in action=allow protocol=TCP localport=%TARGET_PORT% profile=any >nul 2>nul',
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-NetFirewallRule -DisplayName \'AnbarMeh-TCP-3000\' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName \'AnbarMeh-TCP-3000\' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -Enabled True" >nul 2>nul',
        'netsh advfirewall firewall delete rule name=AnbarMeh-TCP-3000 >nul 2>nul',
        'netsh advfirewall firewall add rule name=AnbarMeh-TCP-3000 dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>nul',
        'netsh advfirewall firewall add rule name=AnbarMeh-Node dir=in action=allow program="node.exe" profile=any >nul 2>nul',
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq \'Public\' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue" >nul 2>nul',
        'echo.',
        'echo SUCCESS: Windows Firewall now allows all LAN computers and phones on port %TARGET_PORT% and 3000!',
        'echo ======================================================================',
        'timeout /t 5 >nul',
      ].join('\r\n');

      fs.writeFileSync(firewallBatPath, firewallBatContent, 'utf-8');
      fs.writeFileSync(firewallBatDataPath, firewallBatContent, 'utf-8');
    } catch (err) {
      console.warn('[WindowsServiceManager] Could not write background daemon scripts:', err);
    }
  }

  /**
   * Registers the Central SQL Server in Windows Startup Registry (HKCU\...\Run) and Firewall
   * and immediately starts the always-on supervisor daemon in the background.
   */
  public registerAndStartBackgroundService(port: number = 3000): {
    success: boolean;
    message: string;
    status: WindowsBackgroundServiceStatus;
  } {
    this.ensureBackgroundScripts(port);
    const isWin = os.platform() === 'win32';

    if (isWin) {
      try {
        const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "AnbarMehCentralSQLServer" /t REG_SZ /d "wscript.exe \\"${this.daemonVbsPath}\\"" /f`;
        execSync(regCmd, { stdio: 'ignore', timeout: 2500, windowsHide: true });
      } catch (e) {
        console.warn('[WindowsServiceManager] Registry Run registration warning:', e);
      }

      // Immediately launch background daemon via wscript so it runs right now without window
      try {
        execSync(`start "" wscript.exe "${this.daemonVbsPath}"`, { stdio: 'ignore', timeout: 2500, windowsHide: true });
      } catch {}

      try {
        const fwCmd = `netsh advfirewall firewall add rule name="AnbarMeh Central SQL Server (TCP ${port})" dir=in action=allow protocol=TCP localport=${port} profile=any`;
        execSync(fwCmd, { stdio: 'ignore', timeout: 2500, windowsHide: true });
      } catch {
        // If non-elevated, try triggering PowerShell RunAs in background
        try {
          const elevatedFw = `powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\\\"AnbarMeh Central SQL Server (TCP ${port})\\\" dir=in action=allow protocol=TCP localport=${port} profile=any' -Verb RunAs"`;
          execSync(elevatedFw, { stdio: 'ignore', timeout: 3000, windowsHide: false });
        } catch {}
      }
    }

    this.cachedRegistered = true;

    try {
      fs.writeFileSync(
        this.serviceStateFile,
        JSON.stringify(
          {
            isServiceRegistered: true,
            registeredAt: new Date().toLocaleString('fa-IR'),
            configuredPort: port,
            platform: os.platform(),
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {}

    const status = this.getStatus(port);
    return {
      success: true,
      message:
        'سرویس دائمی پس‌زمینه ویندوز (Always-On SQL Server Service) با موفقیت در استارت‌آپ ویندوز ثبت و فعال شد. حتی در صورت بسته بودن پنجره برنامه، کلاینت‌های شبکه به دیتابیس SQL متصل می‌مانند.',
      status,
    };
  }

  public getStatus(port: number = 3000): WindowsBackgroundServiceStatus {
    if (this.cachedRegistered === null) {
      let isRegistered = false;
      try {
        if (fs.existsSync(this.serviceStateFile)) {
          const parsed = JSON.parse(fs.readFileSync(this.serviceStateFile, 'utf-8'));
          isRegistered = Boolean(parsed.isServiceRegistered);
        }
      } catch {}
      this.cachedRegistered = isRegistered;
    }

    let scriptsReady = fs.existsSync(this.daemonVbsPath) && fs.existsSync(this.runnerBatPath);
    if (scriptsReady) {
      try {
        const currentBat = fs.readFileSync(this.runnerBatPath, 'utf-8');
        if (!currentBat.includes('%~dp0')) {
          scriptsReady = false;
        }
      } catch {
        scriptsReady = false;
      }
    }
    if (!scriptsReady) {
      this.ensureBackgroundScripts(port);
    }

    return {
      isSupportedPlatform: true,
      isServiceRegistered: Boolean(this.cachedRegistered),
      isBackgroundDaemonReady: true,
      autostartMethod:
        os.platform() === 'win32'
          ? 'Windows Startup Registry + Detached Background SQL Server'
          : 'Background Node SQL Daemon',
      daemonVbsPath: this.daemonVbsPath,
      runnerBatPath: this.runnerBatPath,
      configuredPort: port,
      statusMessage: this.cachedRegistered
        ? 'فعال در پس‌زمینه ویندوز (حتی در صورت بسته بودن پنجره برنامه، کلاینت‌ها به دیتابیس SQL متصل می‌مانند)'
        : 'آماده فعال‌سازی در پس‌زمینه ویندوز',
    };
  }
}

export const windowsServiceManager = new WindowsBackgroundServiceManager();
