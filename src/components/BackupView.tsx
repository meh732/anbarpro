import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Database, Download, Upload, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, History, HardDrive, Settings, RefreshCw, FileText, Users,
  Terminal, Server, Globe, Cpu, Laptop, ExternalLink, Play, Trash2,
  Sparkles, AlertTriangle, RotateCcw, ShieldAlert, Check, Layers, Package,
  Copy, Monitor, Wifi, Network, ArrowRight, Shield, Bot, Send
} from 'lucide-react';
import { UserManagementView } from './UserManagementView';
import { MessengerBackupSettings } from './MessengerBackupSettings';

export const BackupView: React.FC = () => {
  const { 
    exportDatabaseJSON, importDatabaseJSON, 
    autoBackupIntervalHours, setAutoBackupIntervalHours, 
    lastBackupTimestamp, backupHistory, t, language,
    serverSyncStatus, lastSyncTime, serverVersion, serverInfo, forceSyncWithServer,
    serverUrl, setServerUrl, testServerConnection,
    resetToEmptyDatabase, loadDemoData, resetToSetupWizard,
    items, warehouses, projects, boms, currentUser
  } = useApp();
  const isFa = language === 'fa';

  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'raw_reset' | 'server' | 'messenger_bot'>('backup');
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  // Server Endpoint Config State
  const [customUrlInput, setCustomUrlInput] = useState<string>(serverUrl || '');
  const [isTestingUrl, setIsTestingUrl] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; message?: string; serverInfo?: any } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'empty_db' | 'demo_db' | 'factory_reset';
    title: string;
    description: string;
    buttonText: string;
    isDangerous: boolean;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const [includeChats, setIncludeChats] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestConnection = async () => {
    setIsTestingUrl(true);
    setTestResult(null);
    try {
      const res = await testServerConnection(customUrlInput);
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleSaveServerUrl = () => {
    setServerUrl(customUrlInput);
    setActionAlert({
      type: 'success',
      text: customUrlInput 
        ? `آدرس سرور مرکزی با موفقیت روی «${customUrlInput}» ذخیره شد.` 
        : 'آدرس سرور روی حالت پیش‌فرض محلی (Localhost) تنظیم شد.'
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadWindowsBat = () => {
    const batContent = `@echo off
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
echo Output folder: src-tauri\\target\\release\\bundle\\
echo ==============================================================================
echo.
pause
`;
    downloadFile(batContent, 'build-windows-exe.bat', 'application/x-bat');
  };

  const downloadWindowsPs1 = () => {
    const ps1Content = `# AnbarMeh Enterprise - Windows Tauri Desktop App Builder (.EXE / MSI Setup)
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
    Write-Host "Output Directory: .\\src-tauri\\target\\release\\bundle\\" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Tauri compilation failed. Check above errors." -ForegroundColor Red
}
`;
    downloadFile(ps1Content, 'build-windows-exe.ps1', 'application/x-powershell');
  };

  const downloadLinuxInstaller = () => {
    const shContent = `#!/bin/bash
# ==============================================================================
#  AnbarMeh Enterprise - Linux Server Auto-Installer & Service Manager
#  Default Port: 3000 (0.0.0.0) | Multi-User Real-time Sync Hub
# ==============================================================================
set -e

APP_DIR="/opt/anbarmeh-server"
SERVICE_NAME="anbarmeh.service"
PORT=3000

if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] Please run this script as root or with sudo."
    exit 1
fi

LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then LOCAL_IP="127.0.0.1"; fi

echo "Installing prerequisites..."
if [ -f /etc/debian_version ]; then
    apt-get update -y && apt-get install -y curl git ufw build-essential
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
elif [ -f /etc/redhat-release ]; then
    yum update -y && yum install -y curl git firewalld gcc-c++ make
    if ! command -v node &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs
    fi
fi

mkdir -p "$APP_DIR" "$APP_DIR/data"
if [ -f "server.ts" ] && [ -f "package.json" ]; then
    cp -r . "$APP_DIR/"
fi

cd "$APP_DIR"
npm install
npm run build

if command -v ufw &> /dev/null; then ufw allow \${PORT}/tcp || true; fi
if command -v firewall-cmd &> /dev/null; then firewall-cmd --permanent --add-port=\${PORT}/tcp || true; firewall-cmd --reload || true; fi

cat <<EOF > /etc/systemd/system/\${SERVICE_NAME}
[Unit]
Description=AnbarMeh Enterprise Central Linux Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=\${APP_DIR}
ExecStart=$(which node) \${APP_DIR}/dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=\${PORT}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable \${SERVICE_NAME}
systemctl restart \${SERVICE_NAME}

echo "Installation complete! Access at http://\${LOCAL_IP}:\${PORT}"
`;
    downloadFile(shContent, 'install-linux-server.sh', 'application/x-sh');
  };

  const downloadFix502Script = () => {
    const fixContent = `#!/bin/bash
# AnbarMeh Enterprise - Multi-App & SSL-Safe 502 Bad Gateway Fixer
set -e

DOMAIN="anbar.templatetesti.shop"
APP_DIR="/opt/anbarmeh-server"
SERVICE_NAME="anbarmeh"
PORT=3000

if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] Please run with sudo: sudo bash scripts/fix-502-bad-gateway.sh"
    exit 1
fi

echo "[1/6] Installing/Checking Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs build-essential
fi

echo "[2/6] Building application in \${APP_DIR}..."
mkdir -p "$APP_DIR" "$APP_DIR/data" "$APP_DIR/dist"
cd "$APP_DIR"
npm install --legacy-peer-deps
npx vite build
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
chmod -R 777 "$APP_DIR/data" 2>/dev/null || true

echo "[3/6] Cleaning up port \${PORT}..."
systemctl stop \${SERVICE_NAME}.service 2>/dev/null || true
fuser -k \${PORT}/tcp 2>/dev/null || true
sleep 1

echo "[4/6] Creating & Launching Systemd Service..."
cat <<EOF > /etc/systemd/system/\${SERVICE_NAME}.service
[Unit]
Description=AnbarMeh Enterprise Inventory Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=\${APP_DIR}
ExecStart=\$(which node) \${APP_DIR}/dist/server.cjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=\${PORT}
Environment=DATA_DIR=\${APP_DIR}/data

LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable \${SERVICE_NAME}.service
systemctl restart \${SERVICE_NAME}.service

echo "[5/6] Verifying Node Backend Health..."
sleep 2
curl -s "http://127.0.0.1:\${PORT}/api/health" || true

echo "[6/6] Configuring Nginx with SSL detection..."
SSL_CERT=""
SSL_KEY=""
if [ -f "/etc/letsencrypt/live/\${DOMAIN}/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/\${DOMAIN}/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/\${DOMAIN}/privkey.pem"
elif [ -f "/etc/letsencrypt/live/templatetesti.shop/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/templatetesti.shop/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/templatetesti.shop/privkey.pem"
fi

NGINX_CONF="/etc/nginx/sites-available/\${DOMAIN}"

if [ -n "\$SSL_CERT" ] && [ -f "\$SSL_CERT" ]; then
    cat <<EOF > "\$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name \${DOMAIN} www.\${DOMAIN};
    client_max_body_size 100M;
    location / {
        return 301 https://\\$host\\$request_uri;
    }
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name \${DOMAIN} www.\${DOMAIN};

    ssl_certificate \${SSL_CERT};
    ssl_certificate_key \${SSL_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:\${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF
else
    cat <<EOF > "\$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name \${DOMAIN} www.\${DOMAIN};
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:\${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF
fi

ln -sf "\$NGINX_CONF" "/etc/nginx/sites-enabled/\${DOMAIN}"
nginx -t && systemctl reload nginx

echo "SUCCESS! Service is LIVE at http://\${DOMAIN} or https://\${DOMAIN}"
`;
    downloadFile(fixContent, 'fix-502-bad-gateway.sh', 'application/x-sh');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setUploadStatus({
            type: 'success',
            message: t('restoreSuccessMsg', 'داده‌های سیستم با موفقیت بازیابی و اعمال شدند.')
          });
        } else {
          setUploadStatus({
            type: 'error',
            message: t('restoreErrorMsg', 'فایل انتخاب‌شده ساختار معتبر JSON داده‌های سامانه را ندارد.')
          });
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteModalAction = async () => {
    if (!confirmModal) return;
    setIsProcessingAction(true);
    setActionAlert(null);

    try {
      if (confirmModal.type === 'empty_db') {
        const ok = await resetToEmptyDatabase();
        if (ok) {
          setActionAlert({
            type: 'success',
            text: 'پایگاه داده با موفقیت کاملاً تخلیه و به حالت خام (صفر) تبدیل شد. اکنون می‌توانید اطلاعات واقعی شرکت را وارد کنید.'
          });
        } else {
          setActionAlert({
            type: 'error',
            text: 'خطا در تخلیه دیتابیس. لطفاً مجدداً تلاش کنید.'
          });
        }
      } else if (confirmModal.type === 'demo_db') {
        const ok = await loadDemoData();
        if (ok) {
          setActionAlert({
            type: 'success',
            text: 'داده‌های نمونه و سناریوهای تستی تولید و انبار با موفقیت بارگذاری شدند.'
          });
        } else {
          setActionAlert({
            type: 'error',
            text: 'خطا در بارگذاری داده‌های نمونه.'
          });
        }
      } else if (confirmModal.type === 'factory_reset') {
        await resetToSetupWizard();
      }
    } catch {
      setActionAlert({
        type: 'error',
        text: 'خطای غیرمنتظره در اجرای عملیات.'
      });
    } finally {
      setIsProcessingAction(false);
      setConfirmModal(null);
    }
  };

  const intervalOptions = [
    { value: 0, label: t('disabled', 'غیرفعال (فقط پشتیبان‌گیری دستی)') },
    { value: 1, label: t('every1Hour', 'هر ۱ ساعت') },
    { value: 3, label: t('every3Hours', 'هر ۳ ساعت') },
    { value: 6, label: t('every6Hours', 'هر ۶ ساعت') },
    { value: 12, label: t('every12Hours', 'هر ۱۲ ساعت') },
    { value: 24, label: t('every24Hours', 'هر ۲۴ ساعت (روزانه)') },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            {t('backupTitle', 'مدیریت کاربران، پشتیبان‌گیری و خام‌سازی دیتابیس')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('backupSubtitle', 'تهیه فایل پشتیبان، مدیریت کاربران، تخلیه داده‌های تستی و تنظیمات پایگاه داده سرور')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            CENTRAL_DATABASE_ENGINE
          </span>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fadeIn ${
          actionAlert.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionAlert.text}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            بستن
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          {isFa ? 'پشتیبان‌گیری و بازیابی فایل' : 'Backup & Restore'}
        </button>

        <button
          onClick={() => setActiveTab('messenger_bot')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'messenger_bot'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
          }`}
        >
          <Bot className="w-4 h-4 text-sky-600" />
          {isFa ? 'ربات تلگرام و بله (بکاپ خودکار)' : 'Telegram & Bale Bot Backups'}
        </button>

        <button
          onClick={() => setActiveTab('raw_reset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'raw_reset'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {isFa ? 'خام‌سازی و صفر کردن دیتابیس' : 'Wipe & Raw Database'}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          {isFa ? 'مدیریت کاربران و سطح دسترسی‌ها' : 'User Accounts & Access Control'}
        </button>

        <button
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'server'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          {isFa ? 'سرور لینوکس و همگام‌سازی شبکه' : 'Linux Server & Network Sync'}
        </button>
      </div>

      {activeTab === 'users' ? (
        <UserManagementView />
      ) : activeTab === 'messenger_bot' ? (
        <MessengerBackupSettings />
      ) : activeTab === 'raw_reset' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Current State Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">خام‌سازی و مدیریت وضعیت پایگاه داده</h3>
                  <p className="text-xs text-slate-500">تخلیه تمام اطلاعات تستی جهت شروع به کار واقعی، یا بارگذاری مجدد اطلاعات نمونه</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">رکوردهای فعلی:</span>
                <span className="font-bold text-slate-800">{items.length} کالا</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-800">{projects.length} پروژه</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-800">{warehouses.length} انبار</span>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
              {/* Option 1: Clean Raw Reset */}
              <div className="bg-gradient-to-b from-rose-50/50 to-white border-2 border-rose-200 hover:border-rose-400 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">تخلیه کامل و تبدیل به دیتابیس خام</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                      مخصوص شروع به کار واقعی کارخانه
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    تمامی کالاها، انبارها، فرمول‌های ساخت (BOM)، پروژه‌ها، اسناد انبارداری و لاگ‌های آزمایشی را پاک می‌کند. 
                    <strong className="block text-slate-900 mt-1 font-bold">نام شرکت و حساب کاربری ادمین حفظ خواهد شد.</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    type: 'empty_db',
                    title: 'تخلیه کامل و تبدیل به دیتابیس خام',
                    description: 'آیا اطمینان دارید که می‌خواهید تمام رکوردهای کالا، انبار، پروژه و اسناد را کاملاً حذف کنید؟ با این کار پایگاه داده ۱۰۰٪ خام و آماده ورود اطلاعات واقعی سازمان خواهد شد.',
                    buttonText: 'بله، همه داده‌ها پاک و دیتابیس خام شود',
                    isDangerous: true
                  })}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تخلیه و صفر کردن دیتابیس</span>
                </button>
              </div>

              {/* Option 2: Load Demo Data */}
              <div className="bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-200 hover:border-indigo-400 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">بارگذاری داده‌های نمونه و تستی</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                      مخصوص تست، ارزیابی و آموزش
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    مجموعه‌ای جامع از کالاها (الکتروموتور، بلبرینگ، سیم‌پیچ و...)، ساختارهای BOM چندسطحی، پروژه‌ها و گردش کار انبار را جهت تست و دمو بارگذاری می‌کند.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    type: 'demo_db',
                    title: 'بارگذاری داده‌های نمونه و تستی (Demo Data)',
                    description: 'با این عملیات، داده‌های تستی شامل کالاهای پیش‌فرض، درخت BOM و پروژه‌های نمونه بارگذاری خواهند شد.',
                    buttonText: 'بارگذاری اطلاعات تستی و دمو',
                    isDangerous: false
                  })}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>بارگذاری داده‌های نمونه (Demo)</span>
                </button>
              </div>

              {/* Option 3: Reset Setup Wizard */}
              <div className="bg-gradient-to-b from-slate-50/50 to-white border border-slate-200 hover:border-slate-400 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">بازنشانی کارخانه‌ای و ویزارد نصب</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-md">
                      شروع مجدد مراحل نصب اولیه
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    نرم‌افزار را کاملاً به حالت اولین ثانیه نصب برمی‌گرداند و صفحه راه‌اندازی و تعریف مجدد نام شرکت و ادمین ارشد را نمایش می‌دهد.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    type: 'factory_reset',
                    title: 'بازنشانی کامل به روز اول نصب (Factory Reset)',
                    description: 'آیا می‌خواهید سیستم کاملاً ریست شده و صفحه راه‌اندازی اولیه (Setup Wizard) مجدداً اجرا شود؟ تمام اطلاعات و کاربران ریست خواهند شد.',
                    buttonText: 'ریست کارخانه‌ای و شروع مجدد نصب',
                    isDangerous: true
                  })}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بازگشت به ویزارد نصب اولیه</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'server' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Server Status Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">وضعیت سرور مرکزی و همگام‌سازی کلاینت‌ها</h3>
                  <p className="text-xs text-slate-500">پایگاه داده یکپارچه روی سرور لینوکس جهت دسترسی همزمان چند کامپیوتر در شبکه</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsSyncing(true);
                    setServerMsg(null);
                    const ok = await forceSyncWithServer();
                    setIsSyncing(false);
                    if (ok) {
                      setServerMsg('همگام‌سازی با موفقیت انجام شد و آخرین اطلاعات از سرور دریافت گردید.');
                      setTimeout(() => setServerMsg(null), 4000);
                    } else {
                      setServerMsg('خطا در همگام‌سازی با سرور لینوکس.');
                      setTimeout(() => setServerMsg(null), 4000);
                    }
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی فوری با سرور'}</span>
                </button>
              </div>
            </div>

            {serverMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{serverMsg}</span>
              </div>
            )}

            {/* Diagnostics Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${serverSyncStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  وضعیت اتصال به سرور:
                </div>
                <div className="text-sm font-black text-slate-900">
                  {serverSyncStatus === 'connected' ? 'آنلاین و فعال' : 'قطع ارتباط'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  آخرین سینک: {lastSyncTime || 'هم‌اکنون'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-500" />
                  نسخه پایگاه داده سرور:
                </div>
                <div className="text-sm font-black text-slate-900">
                  نسخه {serverVersion || 1}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  تغییرات به طور خودکار به بقیه اعمال می‌شود
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-500" />
                  مسیر فایل پایگاه داده:
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dir-ltr text-right truncate">
                  {serverInfo?.dataFile || '/data/server_database.json'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  حجم دیتابیس: {serverInfo?.dataSizeKb || 12} KB
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  پورت شبکه سرویس:
                </div>
                <div className="text-sm font-black text-slate-900">
                  Port 3000 (0.0.0.0)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  قابل دسترسی از تمام رایانه‌ها
                </div>
              </div>
            </div>
          </div>

          {/* Client Server Endpoint Configuration Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700">
                  <Network className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">تنظیم آدرس سرور مرکزی جهت اتصال کلاینت‌ها (کلاینت ویندوز / مرورگر)</h4>
                  <p className="text-xs text-slate-500">اگر اپلیکیشن اگزه ویندوز یا مرورگر را روی کامپیوتر دیگری در شبکه باز کرده‌اید، آدرس سرور لینوکس را در کادر زیر وارد و تست کنید.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                آدرس سرور مرکزی در شبکه محلی (LAN Server URL):
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="مثال: http://192.168.1.100:3000 (یا خالی برای سرور محلی)"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-left text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  {customUrlInput && (
                    <button
                      type="button"
                      onClick={() => setCustomUrlInput('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingUrl}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {isTestingUrl ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                  <span>{isTestingUrl ? 'در حال تست...' : 'تست اتصال (Ping)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveServerUrl}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره و اتصال</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold">{testResult.message}</span>
                    {testResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-white/80 rounded-md border">
                        تاخیر (Latency): {testResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {testResult.serverInfo && (
                    <span className="font-mono text-[10px] text-slate-500 hidden md:inline">
                      {testResult.serverInfo.platform || 'Linux'} - v{testResult.serverInfo.version || 1}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Windows Tauri Desktop (.EXE & Setup) Card */}
          <div className="bg-gradient-to-b from-indigo-50/40 via-white to-white border-2 border-indigo-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-slate-900">خروجی ستاپ اگزه ویندوز (Tauri Desktop App)</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                      Tauri v2 + Rust
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    تبدیل و بسته‌بندی نرم‌افزار انبار به فایل ستاپ ویندوز (<span className="font-mono font-bold text-indigo-700">.exe / .msi</span>) با کمترین مصرف رم و حداکثر سرعت
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadWindowsBat}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود اسکریپت ساخت ویندوز (BAT)</span>
                </button>

                <button
                  type="button"
                  onClick={downloadWindowsPs1}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <span>اسکریپت PowerShell</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Tauri Windows Build Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>پیش‌نیازها در ویندوز</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  نصب بودن <strong>Node.js 18+</strong> و ابزار کامپایلر <strong>Rust</strong> (از سایت <span className="font-mono text-indigo-600">rustup.rs</span>).
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">2</span>
                  <span>اجرای اسکریپت بیلد ۱-کلیک</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  فایل <code className="font-mono text-indigo-700 bg-white px-1 rounded">build-windows-exe.bat</code> را در پوشه پروژه اجرا کنید یا دستور زیر را در ترمینال بزنید:
                </p>
                <div className="relative">
                  <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg dir-ltr text-left">
                    npm run tauri:build
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('npm run tauri:build', 'tauri_build')}
                    className="absolute right-1.5 top-1.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'tauri_build' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">3</span>
                  <span>دریافت فایل نصبی Setup.exe</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  فایل نهایی ستاپ و اگزه در مسیر زیر تولید می‌شود و آماده نصب روی کامپیوترهای کارخانه و انبار است:
                </p>
                <div className="p-2 bg-slate-100 text-slate-800 font-mono text-[10px] rounded-lg dir-ltr text-left truncate">
                  src-tauri/target/release/bundle/nsis/
                </div>
              </div>
            </div>
          </div>

          {/* 502 Bad Gateway Fixer Card (Specific for anbar.templatetesti.shop and Ubuntu Nginx) */}
          <div className="bg-rose-50/70 border-2 border-rose-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-rose-950">حل قطعی و فوری خطای 502 Bad Gateway سرور (پشتیبانی کامل از پورت دلخواه)</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-800 border border-rose-300 animate-pulse">
                      رفع قطعی ۵۰۲ با هر پورتی
                    </span>
                  </div>
                  <p className="text-xs text-rose-800/90 mt-0.5">
                    خطای ۵۰۲ زمانی رخ می‌دهد که Nginx فعال است اما پروسه بک‌اند روی پورت مورد نظر (پیش‌فرض یا پورت اختصاصی شما مثل 3001, 8080, 5000) خاموش شده است.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadFix502Script}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>دانلود اسکریپت رفع ۵۰۲ (SH)</span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-rose-950">
                ⚡ دستور اجرا در سرور با پورت دلخواه شما (مثال: پورت دلخواه را بعد از دستور بنویسید یا خالی بگذارید تا خودکار تشخیص دهد):
              </label>
              <div className="relative">
                <div className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl font-mono dir-ltr text-left text-xs overflow-x-auto selection:bg-rose-500 selection:text-white">
                  sudo bash scripts/fix-502-bad-gateway.sh [PORT_دلخواه]
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('sudo bash scripts/fix-502-bad-gateway.sh', 'cmd_502')}
                  className="absolute right-2 top-2 p-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedKey === 'cmd_502' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'cmd_502' ? 'کپی شد!' : 'کپی دستور'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-700">
              <div className="p-3 bg-white/80 rounded-xl border border-rose-200/70">
                <strong className="text-rose-900 block mb-1">۱. ری‌استارت سرویس پشتیبان:</strong>
                اجرای دائمی پروسه با <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">systemd</code> تا با ریبوت سرور هم قطع نشود.
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-rose-200/70">
                <strong className="text-rose-900 block mb-1">۲. اتصال Nginx به 127.0.0.1:3000:</strong>
                پیکربندی خودکار <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">proxy_pass</code> همراه با وب‌سوکت و پورت دامنه.
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-rose-200/70">
                <strong className="text-rose-900 block mb-1">۳. باز کردن پورت‌ها در UFW:</strong>
                اطمینان از عبور ترافیک پورت‌های ۸۰، ۴۴۳ و ۳۰۰۰ بدون تداخل فایروال.
              </div>
            </div>
          </div>

          {/* Linux Server Installation Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">اسکریپت نصب و مدیریت سرور لینوکس (Linux Auto-Installer)</h4>
                  <p className="text-xs text-slate-500">راه‌اندازی سرویس دائم Systemd روی سرور (Ubuntu, Debian, CentOS, AlmaLinux) با باز کردن فایروال پورت 3000</p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadLinuxInstaller}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>دانلود اسکریپت نصب لینوکس (SH)</span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                دستور اجرای مستقیم اسکریپت نصب روی سرور لینوکس:
              </label>
              <div className="relative">
                <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono dir-ltr text-left text-xs">
                  sudo bash scripts/install-linux-server.sh --install
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('sudo bash scripts/install-linux-server.sh --install', 'linux_cmd')}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'linux_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>کپی دستور</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <span className="text-slate-500 block mb-1 font-bold">بررسی وضعیت سرویس:</span>
                <code className="font-mono text-slate-800 text-[11px] dir-ltr block">systemctl status anbarmeh</code>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <span className="text-slate-500 block mb-1 font-bold">ری‌استارت سرویس سرور:</span>
                <code className="font-mono text-slate-800 text-[11px] dir-ltr block">systemctl restart anbarmeh</code>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <span className="text-slate-500 block mb-1 font-bold">مشاهده لاگ‌های زنده:</span>
                <code className="font-mono text-slate-800 text-[11px] dir-ltr block">journalctl -u anbarmeh -f</code>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <span className="text-slate-500 block mb-1 font-bold">تنظیم فایروال UFW:</span>
                <code className="font-mono text-slate-800 text-[11px] dir-ltr block">sudo ufw allow 3000/tcp</code>
              </div>
            </div>
          </div>

          {/* Network instructions card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              راهنمای اتصال همزمان تمام کاربران شبکه (وب + نرم‌افزار دسکتاپ ویندوز)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h5 className="font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  روش اول: اتصال از طریق مرورگر وب (Web Browser)
                </h5>
                <p>
                  پرسنل و مدیران می‌توانند بدون نصب هیچ برنامه‌ای، در هر کامپیوتر یا تبلت در شبکه محلی، مرورگر (Chrome / Edge / Firefox) را باز کرده و آدرس زیر را وارد کنند:
                </p>
                <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono dir-ltr text-left text-xs">
                  http://[IP_سرور_لینوکس]:3000
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h5 className="font-black text-slate-900 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  روش دوم: اتصال از طریق فایل ستاپ اگزه ویندوز (Tauri Desktop App)
                </h5>
                <p>
                  فایل نصبی <span className="font-mono font-bold text-slate-800">Setup.exe</span> را روی سیستم‌های انبار و کارخانه نصب کنید. پس از باز شدن، در صورت نیاز آدرس سرور را در بخش تنظیمات سرور وارد نمایید تا کلیه داده‌ها در لحظه همگام‌سازی شوند.
                </p>
                <div className="p-2.5 bg-slate-900 text-indigo-300 rounded-xl font-mono dir-ltr text-left text-xs">
                  http://[IP_سرور_لینوکس]:3000
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              * تمام تغییرات، درخواست‌های تحویل انبار، اسناد ورود و خروج، تاییدیه‌های دو مرحله‌ای و چت‌های سازمانی بلافاصله و بدون نیاز به رفرش صفحه بین کلاینت‌های وب و کلاینت‌های دسکتاپ ویندوز رد و بدل می‌شوند.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Raw Mode Banner Inside Backup Tab */}
          <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">آیا می‌خواهید با دیتابیس کاملاً خام (خالی) شروع کنید؟</h4>
                <p className="text-[11px] text-slate-500">تخلیه تمام کالاها و پروژه‌های آزمایشی با ۱ کلیک بدون از دست رفتن حساب مدیر ارشد</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal({
                  type: 'empty_db',
                  title: 'تخلیه کامل و تبدیل به دیتابیس خام',
                  description: 'آیا اطمینان دارید که می‌خواهید تمام رکوردهای کالا، انبار، پروژه و اسناد را کاملاً حذف کنید؟ پایگاه داده ۱۰۰٪ خام خواهد شد.',
                  buttonText: 'تخلیه کامل اطلاعات و شروع با دیتابیس خام',
                  isDangerous: true
                })}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>تخلیه و صفر کردن دیتابیس</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('raw_reset')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                گزینه‌های بیشتر...
              </button>
            </div>
          </div>

          {/* Main Grid Actions: Manual Backup & Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manual Download Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('manualBackup', 'پشتیبان‌گیری دستی')}</h3>
                  <p className="text-xs text-slate-500">استخراج فوری تمام اطلاعات سامانه، کالاها، پروژه‌ها و مستندات در قالب یک فایل JSON جامع</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>{t('lastBackupAt', 'آخرین پشتیبان‌گیری انجام‌شده:')}</span>
                  <strong className="font-mono text-slate-900">{lastBackupTimestamp || t('never', 'تاکنون انجام نشده')}</strong>
                </div>
              </div>

              {/* Chat and Attachments Backup Filters */}
              <div className="border-t border-slate-100 pt-3.5 space-y-3 bg-indigo-50/20 -mx-5 px-5 py-3 border-b">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <span className="text-indigo-600">⚙️</span>
                  <span>فیلترهای حریم‌خصوصی و محتوای چت:</span>
                </div>
                
                {/* Checkbox 1: Include Chats */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeChats}
                    onChange={(e) => {
                      setIncludeChats(e.target.checked);
                      if (!e.target.checked) {
                        setIncludeAttachments(false);
                      }
                    }}
                    className="mt-1 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                  <div className="space-y-0.5 select-none">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      شامل تاریخچه پیام‌ها و گفتگوها (Chats)
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      اگر مایلید گفتگوهای کانال‌ها و پیام‌های پیام‌رسان داخلی نیز در فایل ذخیره شود، این گزینه را فعال کنید.
                    </p>
                  </div>
                </label>

                {/* Checkbox 2: Include Attachments */}
                <label className={`flex items-start gap-3 cursor-pointer group transition-all ${!includeChats ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    checked={includeAttachments}
                    disabled={!includeChats}
                    onChange={(e) => setIncludeAttachments(e.target.checked)}
                    className="mt-1 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                  <div className="space-y-0.5 select-none">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      شامل فایل‌ها و پیوست‌های داخل گفتگو (Attachments)
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      شامل ارجاعات، فایل‌ها و پیوست‌های سیستمی رد و بدل شده در چت‌ها.
                    </p>
                  </div>
                </label>
              </div>

              <button
                onClick={() => exportDatabaseJSON('Manual', { includeChats, includeAttachments })}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {t('downloadBackup', 'دانلود فایل پشتیبان (JSON)')}
              </button>
            </div>

            {/* Restore Backup Upload Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('restoreBackup', 'بازیابی داده‌های پایگاه داده')}</h3>
                  <p className="text-xs text-slate-500">بارگذاری فایل پشتیبان JSON و جایگزینی کامل اطلاعات سیستم</p>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {t('uploadBackupFile', 'بارگذاری و بازیابی فایل JSON')}
              </button>

              {uploadStatus.type && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  uploadStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{uploadStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Automated Backup Scheduler Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('autoBackupSettings', 'تنظیمات پشتیبان‌گیری خودکار')}</h3>
                <p className="text-xs text-slate-500">تعیین فواصل زمانی منظم جهت تهیه و دانلود خودکار نسخه پشتیبان</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('autoBackupInterval', 'فواصل زمانی پشتیبان‌گیری خودکار')}:
                </label>
                <select
                  value={autoBackupIntervalHours}
                  onChange={(e) => setAutoBackupIntervalHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                  {intervalOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs flex flex-col justify-center">
                <span className="text-slate-500 text-[11px] mb-1">وضعیت سرویس پشتیبان خودکار:</span>
                {autoBackupIntervalHours > 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    فعال - هر {autoBackupIntervalHours} ساعت یک بار دانلود خودکار انجام می‌شود.
                  </span>
                ) : (
                  <span className="text-slate-500 font-semibold">
                    غیرفعال (تنظیم نشده)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Messenger Backup Callout */}
          <div className="bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-indigo-500/10 border border-sky-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  ارسال خودکار فایل پشتیبان به تلگرام و بله (Messenger Offsite Backup)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ارسال مستقیم نسخه کامل دیتابیس JSON به اکانت ادمین در تلگرام و بازوبند بله جهت جلوگیری از هرگونه فقدان اطلاعات.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('messenger_bot')}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-4 h-4" />
              <span>پیکربندی ربات‌های تلگرام و بله</span>
            </button>
          </div>

          {/* Backup History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              {t('backupHistory', 'تاریخچه نسخه‌های پشتیبان')}
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="whitespace-nowrap p-3">تاریخ و زمان</th>
                    <th className="whitespace-nowrap p-3">نام فایل</th>
                    <th className="whitespace-nowrap p-3">نوع پشتیبان‌گیری</th>
                    <th className="whitespace-nowrap p-3">حجم فایل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backupHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        تاکنون هیچ پشتیبان‌گیری ثبتی انجام نشده است.
                      </td>
                    </tr>
                  ) : (
                    backupHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="whitespace-nowrap p-3 font-mono text-slate-600">{item.timestamp}</td>
                        <td className="whitespace-nowrap p-3 font-mono text-indigo-600 font-medium">{item.fileName}</td>
                        <td className="whitespace-nowrap p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.type === 'Auto' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {item.type === 'Auto' ? 'خودکار' : 'دستی'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3 font-mono text-slate-700">{item.sizeKb} KB</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModal.isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {confirmModal.isDangerous ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">تایید اجرای عملیات روی پایگاه داده</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleExecuteModalAction}
                disabled={isProcessingAction}
                className={`px-4 py-2.5 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-50 ${
                  confirmModal.isDangerous 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isProcessingAction && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{confirmModal.buttonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
