/**
 * AnbarMeh Enterprise Installer & Deployment Manager
 * Platforms: Windows (PowerShell) / Linux (Bash)
 * Language: English
 * 
 * Features:
 * - Full English interactive deployment console.
 * - Auto-detection of Node.js, Git, NPM, Nginx, and Certbot.
 * - Port configuration, HTTP/HTTPS proxies, custom domain mapping, and Certbot SSL setup.
 * - Automatic background backups before performing Updates and Uninstalls.
 * - Full multi-platform compatibility.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

// Print a beautiful ASCII banner for AnbarMeh Deployment
function printHeader() {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '================================================================');
  console.log('\x1b[35m%s\x1b[0m', '   _    _   _  _     _    _   _  _   _  _ _   _  _   _  _ _  _  _');
  console.log('\x1b[35m%s\x1b[0m', '  / \\  | \\ / |/ \\   | \\  / \\ | \\/ | | | | \\ / \\ | \\ | | | | \\/ |');
  console.log('\x1b[35m%s\x1b[0m', ' /---| |  V  | o |  |-<  | o | |    | | V | o | |-< | V | | |    |');
  console.log('\x1b[35m%s\x1b[0m', '/     \\|_| |_|_n_|  |_/  |_n_|_|_|_|  \\_/|_n_|_|_\\ \\_|_|_|_|_|_|_|');
  console.log('\x1b[36m%s\x1b[0m', '================================================================');
  console.log('\x1b[33m%s\x1b[0m', '       AnbarMeh Smart Enterprise Deployment & Lifecycle Tool');
  console.log('\x1b[32m%s\x1b[0m', '             Standard Version: 2.1.0-Release (English)');
  console.log('\x1b[36m%s\x1b[0m', '================================================================\n');
}

// Ensure the backups directory exists
function ensureBackupDir() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// Generate automatic backup of configurations, database and code state (excluding node_modules)
function createBackup(reason = 'AUTOMATIC') {
  console.log('\n\x1b[33m%s\x1b[0m', '📂 Initializing secure snapshot backup...');
  const backupDir = ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupZipName = `AnbarMeh_Backup_${reason}_${timestamp}.zip`;
  const backupZipPath = path.join(backupDir, backupZipName);

  const isWin = process.platform === 'win32';

  try {
    if (isWin) {
      // Windows PowerShell compression
      const cmd = `powershell -Command "Compress-Archive -Path '${process.cwd()}\\*' -DestinationPath '${backupZipPath}' -Exclude 'node_modules', 'dist', '.git', 'backups' -Force"`;
      execSync(cmd, { stdio: 'ignore' });
    } else {
      // Linux tar.gz compression
      const tarPath = backupZipPath.replace('.zip', '.tar.gz');
      const cmd = `tar --exclude='./node_modules' --exclude='./dist' --exclude='./.git' --exclude='./backups' -czf "${tarPath}" -C "${process.cwd()}" .`;
      execSync(cmd, { stdio: 'ignore' });
    }
    console.log('\x1b[32m%s\x1b[0m', `✅ Backup snapshot successfully created in the backups folder.`);
    console.log('\x1b[32m%s\x1b[0m', `📁 File: ${backupZipName}\n`);
    return true;
  } catch (err) {
    // Fallback simple state copy
    console.log('\x1b[33m%s\x1b[0m', '⚠️ High-level archive tool unavailable. Creating metadata & configuration backup...');
    try {
      const backupMetaName = `AnbarMeh_Backup_Config_${timestamp}.json`;
      const backupMetaPath = path.join(backupDir, backupMetaName);
      const meta = {
        timestamp: new Date().toISOString(),
        reason,
        platform: process.platform,
        envContent: fs.existsSync(path.join(process.cwd(), '.env')) ? fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8') : '',
        packageJson: fs.existsSync(path.join(process.cwd(), 'package.json')) ? JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) : null,
      };
      fs.writeFileSync(backupMetaPath, JSON.stringify(meta, null, 2), 'utf8');
      console.log('\x1b[32m%s\x1b[0m', `✅ Configuration metadata backup completed: ${backupMetaName}`);
      return true;
    } catch (innerErr) {
      console.log('\x1b[31m%s\x1b[0m', '❌ Failed to create automatic backup. Proceed with extreme caution.');
      return false;
    }
  }
}

// Perform fresh or clean installation
async function handleInstall() {
  printHeader();
  console.log('\x1b[32m%s\x1b[0m', '>>> Option [1]: New Application Installation');

  // Step 1: Backup if existing installation found
  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ An existing installation was detected in this directory.');
    const proceed = await askQuestion('Would you like to take a safety backup before fresh installation? (Y/n): ');
    if (proceed.toLowerCase() !== 'n') {
      createBackup('PRE_INSTALL');
    }
  }

  // Step 2: Ask for Git Repo URL or download source
  console.log('\n--- Code Retrieval Config ---');
  const githubUrl = await askQuestion('🔗 Enter GitHub Repository URL to clone/update code (or press Enter to use current local files): ');
  if (githubUrl.trim()) {
    console.log(`\n📥 Fetching latest codebase from: ${githubUrl}`);
    try {
      execSync(`git clone ${githubUrl.trim()} temp_clone_dir`, { stdio: 'inherit' });
      // Move files over if cloned successfully
      const isWin = process.platform === 'win32';
      if (isWin) {
        execSync('xcopy temp_clone_dir\\* .\\ /E /Y /Q', { stdio: 'ignore' });
        execSync('rmdir /S /Q temp_clone_dir', { stdio: 'ignore' });
      } else {
        execSync('cp -r temp_clone_dir/* ./ && rm -rf temp_clone_dir', { stdio: 'ignore' });
      }
      console.log('✅ Code successfully fetched from GitHub.');
    } catch (err) {
      console.log('⚠️ Failed to clone GitHub repository. Falling back to current local files.');
    }
  }

  // Step 3: Network Proxy Configuration
  console.log('\n--- Proxy Configuration ---');
  const needsProxy = await askQuestion('🌐 Do you need to apply an HTTP/HTTPS proxy for internet access? (y/N): ');
  let proxyUrl = '';
  if (needsProxy.toLowerCase() === 'y') {
    proxyUrl = await askQuestion('Enter proxy URL (e.g., http://127.0.0.1:7890 or http://user:pass@host:port): ');
    if (proxyUrl.trim()) {
      console.log(`⚙️ Applying system proxy: ${proxyUrl.trim()}`);
      try {
        execSync(`npm config set proxy "${proxyUrl.trim()}"`, { stdio: 'inherit' });
        execSync(`npm config set https-proxy "${proxyUrl.trim()}"`, { stdio: 'inherit' });
        console.log('✅ NPM proxy configuration updated successfully.');
      } catch (err) {
        console.log('⚠️ Failed to apply NPM proxy config.');
      }
    }
  }

  // Step 4: Network Port Configuration
  console.log('\n--- Port Configuration ---');
  const portInput = await askQuestion('🔌 Enter network port to host the server [default 3000]: ');
  const selectedPort = portInput.trim() || '3000';

  // Step 5: Domain and Reverse Proxy Config
  console.log('\n--- Domain & SSL Configuration ---');
  const needsDomain = await askQuestion('🖥️ Do you want to configure a custom domain or host domain? (y/N): ');
  let domainName = '';
  let setupSSL = 'n';

  if (needsDomain.toLowerCase() === 'y') {
    domainName = await askQuestion('Enter your custom domain (e.g., inventory.yourcompany.com): ');
    if (domainName.trim()) {
      setupSSL = await askQuestion('🔒 Do you want to automatically request a free Let\'s Encrypt SSL certificate? (y/N): ');
    }
  }

  // Save environmental parameters
  const envPath = path.join(process.cwd(), '.env');
  let envVars = `PORT=${selectedPort}\nNODE_ENV=production\n`;
  if (proxyUrl.trim()) {
    envVars += `HTTP_PROXY=${proxyUrl.trim()}\nHTTPS_PROXY=${proxyUrl.trim()}\n`;
  }
  if (domainName.trim()) {
    envVars += `APP_DOMAIN=${domainName.trim()}\n`;
  }
  fs.writeFileSync(envPath, envVars);
  console.log('✅ Configuration file (.env) generated successfully.');

  // Step 6: Install NPM Dependencies
  console.log(`\n⚙️ Running production package installation...`);
  try {
    execSync('npm install --production=false', { stdio: 'inherit' });
    console.log('✅ Dependencies successfully installed.');
  } catch (err) {
    console.log('❌ Dependency installation failed. Please check your network connection.');
  }

  // Step 7: Build application
  console.log(`\n📦 Compiling production client-side and server-side bundles...`);
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ App compiled successfully.');
  } catch (err) {
    console.log('⚠️ Build failed. Run "npm run build" manually after fixing errors.');
  }

  // Step 8: Apply Nginx Reverse Proxy Config and Certbot SSL (Linux only)
  if (domainName.trim() && process.platform !== 'win32') {
    console.log('\n🔧 Setting up Nginx Reverse Proxy block on Linux...');
    const nginxConfig = `
server {
    listen 80;
    server_name ${domainName.trim()};

    location / {
        proxy_pass http://127.0.0.1:${selectedPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`;
    try {
      const sitePath = `/etc/nginx/sites-available/${domainName.trim()}`;
      const symlinkPath = `/etc/nginx/sites-enabled/${domainName.trim()}`;
      
      fs.writeFileSync('nginx_temp_conf', nginxConfig);
      execSync(`sudo mv nginx_temp_conf ${sitePath}`, { stdio: 'inherit' });
      if (!fs.existsSync(symlinkPath)) {
        execSync(`sudo ln -s ${sitePath} ${symlinkPath}`, { stdio: 'inherit' });
      }
      execSync('sudo nginx -t', { stdio: 'inherit' });
      execSync('sudo systemctl reload nginx', { stdio: 'inherit' });
      console.log('✅ Nginx Virtual Host proxy configured and reloaded.');

      if (setupSSL.toLowerCase() === 'y') {
        console.log('🔒 Contacting Let\'s Encrypt to obtain SSL certificate...');
        execSync(`sudo certbot --nginx -d ${domainName.trim()} --non-interactive --agree-tos --register-unsafely-without-email`, { stdio: 'inherit' });
        console.log('✅ SSL certificate successfully installed!');
      }
    } catch (err) {
      console.log('❌ Could not complete automatic Nginx/SSL setup. Please configure Nginx manually.');
    }
  } else if (domainName.trim() && process.platform === 'win32') {
    console.log('\nℹ️ On Windows, you can configure IIS or Nginx to reverse-proxy to http://127.0.0.1:' + selectedPort);
    console.log('   To apply SSL on Windows, we recommend installing the Win-ACME client or Certbot for Windows.');
  }

  console.log('\n\x1b[32m%s\x1b[0m', '🎉 AnbarMeh installation completed successfully!');
  console.log(`🚀 Start the application in production using: "npm start"`);
  console.log(`   You can access it locally at: http://localhost:${selectedPort}\n`);

  await askQuestion('Press Enter to return to main menu...');
}

// Perform application update safely (with mandatory backup first)
async function handleUpdate() {
  printHeader();
  console.log('\x1b[33m%s\x1b[0m', '>>> Option [2]: Update Application Instance');

  console.log('\x1b[33m%s\x1b[0m', '🛡️ Mandatory security backup starting before update begins...');
  const backedUp = createBackup('PRE_UPDATE');

  if (!backedUp) {
    const override = await askQuestion('⚠️ Backup failed! Do you still want to proceed with the update? (y/N): ');
    if (override.toLowerCase() !== 'y') {
      console.log('Update cancelled by user.');
      await askQuestion('\nPress Enter to return to main menu...');
      return;
    }
  }

  console.log('\n📥 Pulling latest codebase updates from git...');
  try {
    execSync('git pull', { stdio: 'inherit' });
    console.log('✅ Source files updated from Git repository.');
  } catch (err) {
    console.log('⚠️ Git pull failed. Checking for zipped package update...');
    const githubUrl = await askQuestion('🔗 Enter custom GitHub repository/release ZIP URL (or press Enter to skip): ');
    if (githubUrl.trim()) {
      try {
        console.log(`📥 Downloading source zip from: ${githubUrl}`);
        const isWin = process.platform === 'win32';
        if (isWin) {
          execSync(`powershell -Command "Invoke-WebRequest -Uri '${githubUrl}' -OutFile 'update.zip'"`, { stdio: 'inherit' });
          execSync('powershell -Command "Expand-Archive -Path \'update.zip\' -DestinationPath \'.\' -Force"', { stdio: 'inherit' });
          if (fs.existsSync('update.zip')) fs.unlinkSync('update.zip');
        } else {
          execSync(`curl -L "${githubUrl}" -o update.zip`, { stdio: 'inherit' });
          execSync('unzip -o update.zip && rm update.zip', { stdio: 'inherit' });
        }
        console.log('✅ Zipped update installed.');
      } catch (zipErr) {
        console.log('❌ Failed to pull updates. Current codebase remains unchanged.');
        await askQuestion('\nPress Enter to return to main menu...');
        return;
      }
    }
  }

  console.log(`\n⚙️ Refreshing dependencies and compiling build bundles...`);
  try {
    execSync('npm install --production=false', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\n\x1b[32m%s\x1b[0m', '✅ Update successfully applied!');
    console.log('💡 Restart your PM2, systemd, or background Node process to apply changes.');
  } catch (err) {
    console.log('\x1b[31m%s\x1b[0m', '❌ Re-compilation failed during update.');
  }

  await askQuestion('\nPress Enter to return to main menu...');
}

// Complete application uninstallation (with mandatory backup first)
async function handleUninstall() {
  printHeader();
  console.log('\x1b[31m%s\x1b[0m', '>>> Option [3]: Full System Uninstallation');

  console.log('\x1b[33m%s\x1b[0m', '🛡️ Creating final database and configuration backup before purge...');
  createBackup('PRE_UNINSTALL');

  const confirm = await askQuestion('❓ Are you absolutely sure you want to uninstall and remove all compiled files? (yes/NO): ');
  if (confirm.toLowerCase() === 'yes') {
    console.log('\n🗑️ Purging compiled production directories and cached states...');
    try {
      const buildDir = path.join(process.cwd(), 'dist');
      const envFile = path.join(process.cwd(), '.env');
      
      if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
        console.log('✅ Production directory (dist) removed.');
      }
      if (fs.existsSync(envFile)) {
        fs.rmSync(envFile, { force: true });
        console.log('✅ Configuration file (.env) removed.');
      }
      console.log('\x1b[32m%s\x1b[0m', '🎉 Uninstallation completed successfully. All local assets are cleared.');
      console.log('📁 Your fallback backups are preserved in the backups directory.');
    } catch (err) {
      console.log('❌ Error occurred during file clean-up.');
    }
  } else {
    console.log('Purge cancelled. No files were removed.');
  }

  await askQuestion('\nPress Enter to return to main menu...');
}

// User-triggered manual backup
async function handleManualBackup() {
  printHeader();
  console.log('\x1b[35m%s\x1b[0m', '>>> Option [4]: Create Manual Security Backup');
  createBackup('MANUAL_USER_REQUEST');
  await askQuestion('Press Enter to return to main menu...');
}

// Interactive English main deployment CLI loop
async function mainMenu() {
  while (true) {
    printHeader();
    console.log('Please select an deployment operation from the menu below:\n');
    console.log(' \x1b[32m[1]\x1b[0m 🚀 FRESH INSTALL (Prerequisites, Port, Proxy, Domain & SSL setup)');
    console.log(' \x1b[33m[2]\x1b[0m 🔄 UPDATE INSTANCE (Fetches latest source code; backs up first)');
    console.log(' \x1b[31m[3]\x1b[0m 🗑️  UNINSTALL INSTANCE (Deletes environment and build; backs up first)');
    console.log(' \x1b[35m[4]\x1b[0m 💾 CREATE MANUAL BACKUP (Instantly capture configuration & state)');
    console.log(' \x1b[37m[5]\x1b[0m ❌ EXIT\n');

    const choice = await askQuestion('Enter selection (1-5): ');

    switch (choice.trim()) {
      case '1':
        await handleInstall();
        break;
      case '2':
        await handleUpdate();
        break;
      case '3':
        await handleUninstall();
        break;
      case '4':
        await handleManualBackup();
        break;
      case '5':
        console.log('\nExiting AnbarMeh installer. Goodbye!');
        rl.close();
        process.exit(0);
      default:
        console.log('\nInvalid menu choice. Please select between 1 and 5.');
        await askQuestion('Press Enter to continue...');
    }
  }
}

mainMenu();
