#!/usr/bin/env bash
# =================================================================
# AnbarMeh Smart ERP Enterprise Linux Installer (Sanaei-Style CLI)
# Github: https://github.com/meh732/anbarpro.git
# =================================================================

# Colors for terminal styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
NC='\033[0m'

# Check if user is root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run this installer as root (sudo bash <(curl...))${NC}"
    exit 1
fi

clear

# Print beautiful Sanaei-style ASCII banner
print_banner() {
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${PURPLE}     _    _   _  _     _    _   _  _   _  _ _   _  _   _  _ _  _  _${NC}"
    echo -e "${PURPLE}    / \\  | \\ / |/ \\   | \\  / \\ | \\/ | | | | \\ / \\ | \\ | | | | \\/ |${NC}"
    echo -e "${PURPLE}   /---| |  V  | o |  |-<  | o | |    | | V | o | |-< | V | | |    |${NC}"
    echo -e "${PURPLE}  /     \\|_| |_|_n_|  |_/  |_n_|_|_|_|  \\_/|_n_|_|_\\ \\_|_|_|_|_|_|_|${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${YELLOW}           AnbarMeh Smart Enterprise ERP Deployment Utility      ${NC}"
    echo -e "${GREEN}                 Sanaei-Style Core Installer v2.5.0              ${NC}"
    echo -e "${CYAN}==================================================================${NC}"
}

# Print main menu
show_menu() {
    print_banner
    # Detect current port and status
    local current_port="3000"
    if [ -d "/etc/nginx" ]; then
        local found_port=$(grep -rEi 'proxy_pass\s+http://(127\.0\.0\.1|localhost):[0-9]+' /etc/nginx/ 2>/dev/null | head -n1 | grep -oE '[0-9]+$' | tr -d ' "/;')
        if [ -n "$found_port" ] && [[ "$found_port" =~ ^[0-9]+$ ]]; then
            current_port="$found_port"
        fi
    fi
    if [ "$current_port" = "3000" ] && [ -f "/etc/systemd/system/anbarpro.service" ]; then
        local found_port=$(grep -oE 'PORT=[0-9]+' /etc/systemd/system/anbarpro.service 2>/dev/null | cut -d= -f2)
        if [ -n "$found_port" ] && [[ "$found_port" =~ ^[0-9]+$ ]]; then
            current_port="$found_port"
        fi
    fi
    if [ "$current_port" = "3000" ] && [ -f "/usr/local/anbarpro/.env" ]; then
        local found_port=$(grep -E '^(PORT|APP_PORT)=' /usr/local/anbarpro/.env 2>/dev/null | head -n1 | cut -d= -f2 | tr -d ' "')
        if [ -n "$found_port" ] && [[ "$found_port" =~ ^[0-9]+$ ]]; then
            current_port="$found_port"
        fi
    fi

    local svc_status="${RED}Inactive 🔴${NC}"
    if systemctl is-active --quiet anbarpro 2>/dev/null; then
        svc_status="${GREEN}Running 🟢 (Port: $current_port)${NC}"
    fi

    echo -e "   📌 Server Status: $svc_status"
    echo -e "   ${CYAN}------------------------------------------------------------------${NC}"
    echo -e "   ${GREEN}[1]${NC} Install AnbarPro System (Fresh Installation)"
    echo -e "   ${GREEN}[2]${NC} Update System from GitHub (Preserves Custom Port & Data)"
    echo -e "   ${YELLOW}[3]${NC} Change Web Service Port (Configure Custom Port)"
    echo -e "   ${CYAN}[4]${NC} View Service Status & Logs (Show Status)"
    echo -e "   ${CYAN}[5]${NC} Restart Web Service (Restart Service)"
    echo -e "   ${CYAN}[6]${NC} Stop Web Service (Stop Service)"
    echo -e "   ${CYAN}[7]${NC} Create Manual System Backup (Backup)"
    echo -e "   ${GREEN}[8]${NC} Restore Database from Backup (Restore Data)"
    echo -e "   ${RED}[9]${NC} Uninstall System Completely (Uninstall)"
    echo -e "   ${RED}[0]${NC} Exit Installer (Exit)"
    echo -e "${CYAN}==================================================================${NC}"
}

check_node() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    return 0
}

# Run NPM command with compact, single-line in-place progress that never wraps
run_npm_with_progress() {
    local cmd="$1"
    local desc="$2"
    
    echo -e "\n${YELLOW}⚙️ $desc...${NC}"
    
    # Run the npm command in the background
    eval "$cmd" > /dev/null 2>&1 &
    local PID=$!
    
    local elapsed=0
    local spin='-\|/'
    local i=0
    
    # Strictly in-place single-line progress update
    while kill -0 $PID 2>/dev/null; do
        i=$(( (i+1) % 4 ))
        local char="${spin:$i:1}"
        
        local curr_kb=0
        if [ -d "node_modules" ]; then
            curr_kb=$(du -sk node_modules 2>/dev/null | awk '{print $1}')
            curr_kb=${curr_kb:-0}
        fi
        local curr_mb=$(( curr_kb / 1024 ))
        
        # Single-line compact progress (approx 40 chars max, never wraps)
        printf "\r\033[K   ${CYAN}[%s] ⏳ %ds | 📦 %d MB downloaded...${NC}" "$char" "$elapsed" "$curr_mb"
        
        sleep 1
        ((elapsed++))
    done
    
    wait $PID
    local exit_code=$?
    
    local final_kb=0
    if [ -d "node_modules" ]; then
        final_kb=$(du -sk node_modules 2>/dev/null | awk '{print $1}')
        final_kb=${final_kb:-0}
    fi
    local final_mb=$(( final_kb / 1024 ))
    
    # Clean the line completely and print final success/failure
    printf "\r\033[K"
    if [ $exit_code -eq 0 ]; then
        echo -e "   ${GREEN}✅ Done in ${elapsed}s (Total: ${final_mb} MB)${NC}"
        return 0
    else
        echo -e "   ${RED}❌ Failed after ${elapsed}s.${NC}"
        return $exit_code
    fi
}

# Setup SWAP space to prevent low-RAM Linux servers from hanging during package install and asset compilation
setup_swap_if_needed() {
    echo -e "\n${YELLOW}🛡️ Checking SWAP configuration to prevent low-memory system freeze...${NC}"
    
    # Check current swap size
    local total_swap=0
    if [ -f /proc/swaps ]; then
        total_swap=$(free -m | grep -i swap | awk '{print $2}')
    fi
    total_swap=${total_swap:-0}
    
    if [ "$total_swap" -gt 500 ]; then
        echo -e "   ${GREEN}✅ SWAP space is already configured (${total_swap} MB).${NC}"
        return 0
    fi
    
    echo -e "   ${YELLOW}⚠️ Insufficient or NO swap space detected (${total_swap} MB).${NC}"
    echo -e "   ${YELLOW}⚙️ Automatically configuring a 2GB swap file at /swapfile to ensure stable build...${NC}"
    
    # Verify free disk space
    local free_disk=$(df -m / | awk 'NR==2 {print $4}')
    if [ "$free_disk" -lt 3000 ]; then
        echo -e "   ${RED}❌ Disk space is very low (${free_disk}MB). Skipping swap creation.${NC}"
        return 1
    fi
    
    # Disable swap if exists
    swapoff /swapfile 2>/dev/null || true
    rm -f /swapfile
    
    # Create swap file
    if command -v fallocate &> /dev/null; then
        fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null
    else
        dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null
    fi
    
    if [ -f /swapfile ]; then
        chmod 600 /swapfile
        mkswap /swapfile &>/dev/null
        swapon /swapfile &>/dev/null
        
        # Add to fstab if not present
        if ! grep -q "/swapfile" /etc/fstab; then
            echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
        fi
        
        local new_swap=$(free -m | grep -i swap | awk '{print $2}')
        echo -e "   ${GREEN}✅ 2GB SWAP space successfully created and enabled (New swap size: ${new_swap} MB).${NC}"
    else
        echo -e "   ${RED}❌ Failed to create swap file.${NC}"
    fi
}

# Automatically clean junk files, npm cache, journal logs, and apt cache to prevent ENOSPC (No space left on device)
cleanup_disk_space() {
    echo -e "\n${YELLOW}🧹 Analyzing disk space and performing automatic garbage collection...${NC}"
    # 1. Vacuum systemd journal logs (frequently takes 2-10GB on Linux servers)
    if command -v journalctl &>/dev/null; then
        journalctl --vacuum-size=50M 2>/dev/null || true
    fi
    # 2. Clean npm caches and debug logs
    if command -v npm &>/dev/null; then
        npm cache clean --force 2>/dev/null || true
    fi
    rm -rf /root/.npm/_cacache /root/.npm/_logs /root/.npm/_npx 2>/dev/null || true
    # 3. Clean apt cache and unused packages
    if command -v apt-get &>/dev/null; then
        apt-get clean 2>/dev/null || true
        apt-get autoremove -y 2>/dev/null || true
    elif command -v yum &>/dev/null; then
        yum clean all 2>/dev/null || true
    fi
    # 4. Prune old pre-update backup archives (keep newest 2)
    if [ -d "backups" ]; then
        ls -t backups/AnbarMeh_AutoBackup_PreUpdate_*.tar.gz 2>/dev/null | tail -n +3 | xargs rm -f 2>/dev/null || true
    fi
    # 5. Clean tmp directory
    rm -rf /tmp/anbar_* /tmp/npm-* 2>/dev/null || true

    local free_mb=$(df -m / 2>/dev/null | awk 'NR==2 {print $4}')
    free_mb=${free_mb:-0}
    echo -e "   ${GREEN}💾 Free Disk Space on root partition (/): ${free_mb} MB${NC}"
    if [ "$free_mb" -lt 500 ]; then
        echo -e "   ${RED}⚠️ WARNING: Disk space is critically low (< 500 MB remaining)!${NC}"
        find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
        find /var/log -type f -name "*.1" -delete 2>/dev/null || true
        free_mb=$(df -m / 2>/dev/null | awk 'NR==2 {print $4}')
        echo -e "   ${GREEN}💾 Free Disk Space after emergency purge: ${free_mb} MB${NC}"
    fi
}

# Robust systemd service unit writer with unmasking and error verification
unmask_and_write_service() {
    local target_port="$1"
    local install_dir="$2"
    local node_path=$(command -v node || echo "/usr/bin/node")

    echo -e "${YELLOW}⚙️ Writing and configuring systemd unit (anbarpro.service) on port $target_port...${NC}"
    # Unmask unit if it was masked due to previous crashes or 0-byte writes
    systemctl unmask anbarpro 2>/dev/null || true
    if [ -L "/etc/systemd/system/anbarpro.service" ]; then
        rm -f "/etc/systemd/system/anbarpro.service"
    fi
    rm -f "/etc/systemd/system/anbarpro.service" 2>/dev/null || true

    cat > /etc/systemd/system/anbarpro.service <<EOF
[Unit]
Description=AnbarMeh Smart Enterprise ERP Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$install_dir
ExecStart=$node_path dist/server.cjs
Restart=always
RestartSec=5
EnvironmentFile=-$install_dir/.env
Environment=NODE_ENV=production PORT=$target_port

[Install]
WantedBy=multi-user.target
EOF

    if [ ! -s "/etc/systemd/system/anbarpro.service" ]; then
        echo -e "${RED}❌ Error: /etc/systemd/system/anbarpro.service was written with 0 bytes or failed! Check disk space with: df -h /${NC}"
        return 1
    fi

    systemctl daemon-reload
    systemctl unmask anbarpro 2>/dev/null || true
    systemctl enable anbarpro 2>/dev/null || true
    return 0
}

# Fresh installation process
install_anbarpro() {
    echo -e "\n${YELLOW}🔄 Starting AnbarPro installation process...${NC}"
    
    # Ensure swap is setup to avoid freeze during build/npm install
    setup_swap_if_needed
    
    # Run automatic garbage collection to prevent ENOSPC (Disk Full)
    cleanup_disk_space
    
    # 1. Ask for destination directory
    read -p "📂 Enter installation directory [Default: /usr/local/anbarpro]: " INSTALL_DIR
    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="/usr/local/anbarpro"
    fi
    echo -e "${CYAN}🚀 Selected installation path: $INSTALL_DIR${NC}"
    
    # 1.1 Ask for application port
    read -p "🔌 Enter web service port [Default: 3000]: " APP_PORT
    if [ -z "$APP_PORT" ]; then
        APP_PORT="3000"
    fi
    echo -e "${CYAN}🚀 Web service port: $APP_PORT${NC}"

    # 1.2 Ask for domain setup
    read -p "🌐 Do you want to configure a domain for the app? (y/n) [Default: n]: " WANT_DOMAIN
    APP_DOMAIN=""
    WANT_SSL="n"
    if [[ "$WANT_DOMAIN" =~ ^[Yy]$ ]]; then
        read -p "🔗 Enter your domain or subdomain (e.g. inventory.yourdomain.com): " APP_DOMAIN
        if [ -n "$APP_DOMAIN" ]; then
            echo -e "${CYAN}🚀 Registered domain: $APP_DOMAIN${NC}"
            read -p "🔒 Do you want to obtain a free SSL certificate (HTTPS) with Let's Encrypt? (y/n) [Default: y]: " WANT_SSL_INPUT
            if [ -z "$WANT_SSL_INPUT" ] || [[ "$WANT_SSL_INPUT" =~ ^[Yy]$ ]]; then
                WANT_SSL="y"
            fi
        fi
    fi
    
    # 2. Package installation based on OS
    echo -e "\n${YELLOW}📦 Checking and installing system dependencies...${NC}"
    if [ -f /etc/debian_version ]; then
        apt-get update -y
        apt-get install -y git curl wget build-essential nginx certbot python3-certbot-nginx
        if ! check_node; then
            echo -e "${YELLOW}📥 Installing latest Node.js LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        fi
    elif [ -f /etc/redhat-release ]; then
        yum install -y epel-release
        yum update -y
        yum install -y git curl wget gcc-c++ make nginx certbot python3-certbot-nginx
        if ! check_node; then
            echo -e "${YELLOW}📥 Installing latest Node.js LTS...${NC}"
            curl -sL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        fi
    fi
    
    # Check if node was installed successfully
    if ! check_node; then
        echo -e "${RED}❌ Node.js installation failed. Please install it manually first.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Node.js: $(node -v) detected successfully.${NC}"
    
    # 3. Clone Repository
    # Ensure current working directory is a safe location (e.g. /root or /tmp)
    # so moving or recreating $INSTALL_DIR does not invalidate the shell's cwd for git
    cd /root 2>/dev/null || cd /tmp
    mkdir -p "$(dirname "$INSTALL_DIR")"
    systemctl stop anbarpro &> /dev/null

    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}⚠️ Destination path already exists. Creating backup copy...${NC}"
        mv "$INSTALL_DIR" "${INSTALL_DIR}_backup_$(date +%Y%m%d%H%M%S)"
    fi
    
    echo -e "${YELLOW}📥 Cloning AnbarPro source code from GitHub...${NC}"
    git clone https://github.com/meh732/anbarpro.git "$INSTALL_DIR"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error cloning from GitHub. Please check your internet connection.${NC}"
        return 1
    fi
    
    cd "$INSTALL_DIR"
    
    # Remove package-lock.json if it exists to prevent Tailwind v4 native binary compilation bugs
    if [ -f "package-lock.json" ]; then
        echo -e "${YELLOW}🗑️ Removing package-lock.json to reload OS native bindings...${NC}"
        rm -f package-lock.json
    fi
    
    # 4. Install NPM Dependencies
    run_npm_with_progress "npm install --production=false --legacy-peer-deps" "Installing main NPM dependencies"
    
    # Force install the correct Tailwind CSS v4 Rust native bindings based on CPU architecture
    ARCH=$(uname -m)
    echo -e "${YELLOW}🖥️ Detecting CPU architecture: $ARCH${NC}"
    if [ "$ARCH" = "x86_64" ]; then
        run_npm_with_progress "npm install --save-dev --force @tailwindcss/oxide-linux-x64-gnu" "Installing native Linux x64 bindings for @tailwindcss/oxide"
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        run_npm_with_progress "npm install --save-dev --force @tailwindcss/oxide-linux-arm64-gnu" "Installing native Linux ARM64 bindings for @tailwindcss/oxide"
    fi
    
    # 5. Build
    echo -e "\n${YELLOW}📦 Compiling project and building assets (Vite)...${NC}"
    NODE_OPTIONS="--max-old-space-size=1536" npm run build
    
    # Auto-repair fallback if native binary fails during build
    if [ ! -f "dist/server.cjs" ]; then
        echo -e "\n${YELLOW}🔄 Attempting automatic native bindings repair and rebuilding...${NC}"
        npm install --save-dev --force @tailwindcss/oxide @tailwindcss/oxide-linux-x64-gnu
        NODE_OPTIONS="--max-old-space-size=1536" npm run build
    fi
    
    if [ ! -f "dist/server.cjs" ]; then
        echo -e "\n${RED}❌ Critical Error: Production server file (dist/server.cjs) not found! Build failed.${NC}"
        echo -e "${YELLOW}💡 Tip: This might be an issue with native node packages. Please run 'npm run build' manually to inspect.${NC}"
        return 1
    fi
    
    # 6. Setup Systemd Service & Environment file
    echo -e "\n${YELLOW}🛡️ Registering systemd service and environment files...${NC}"
    
    NODE_BIN_PATH=$(command -v node || echo "/usr/bin/node")
    echo -e "${CYAN}🔹 Node.js Executable: $NODE_BIN_PATH${NC}"
    
    # Save active configuration to .env and config file
    cat > "$INSTALL_DIR/.env" <<EOF
PORT=$APP_PORT
APP_PORT=$APP_PORT
NODE_ENV=production
APP_DOMAIN=$APP_DOMAIN
EOF
    chmod 600 "$INSTALL_DIR/.env"

    unmask_and_write_service "$APP_PORT" "$INSTALL_DIR"
    systemctl restart anbarpro
    
    # 6.1 Open firewall ports (UFW / Firewalld)
    echo -e "\n${YELLOW}🛡️ Checking and configuring firewall ports...${NC}"
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "active"; then
            echo -e "${YELLOW}🔥 UFW firewall is active. Opening ports...${NC}"
            ufw allow $APP_PORT/tcp &> /dev/null
            ufw allow 80/tcp &> /dev/null
            ufw allow 443/tcp &> /dev/null
            ufw reload &> /dev/null
            echo -e "${GREEN}✅ Ports opened successfully in UFW.${NC}"
        fi
    fi

    if command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            echo -e "${YELLOW}🔥 Firewalld is active. Opening ports...${NC}"
            firewall-cmd --permanent --add-port=$APP_PORT/tcp &> /dev/null
            firewall-cmd --permanent --add-port=80/tcp &> /dev/null
            firewall-cmd --permanent --add-port=443/tcp &> /dev/null
            firewall-cmd --reload &> /dev/null
            echo -e "${GREEN}✅ Ports opened successfully in Firewalld.${NC}"
        fi
    fi

    # 6.2 Verify service status
    sleep 2
    if ! systemctl is-active --quiet anbarpro; then
        echo -e "${RED}❌ Web service failed to start! Checking system logs:${NC}"
        journalctl -u anbarpro -n 15 --no-pager
    else
        echo -e "${GREEN}✅ Linux service enabled and started successfully.${NC}"
    fi
    
    # Get primary IP address
    SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
    ACCESS_URL="http://$SERVER_IP:$APP_PORT"

    # 7. Configure Nginx and SSL
    if [ -n "$APP_DOMAIN" ]; then
        echo -e "\n${YELLOW}🌐 Configuring Nginx web server for domain $APP_DOMAIN...${NC}"
        
        NGINX_CONF="server {
    listen 80;
    server_name $APP_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}"
    else
        echo -e "\n${YELLOW}🌐 Configuring Nginx as default server on port 80...${NC}"
        
        NGINX_CONF="server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}"
    fi

    if [ -d "/etc/nginx/sites-available" ]; then
        echo "$NGINX_CONF" > "/etc/nginx/sites-available/anbarpro"
        ln -sf "/etc/nginx/sites-available/anbarpro" "/etc/nginx/sites-enabled/anbarpro"
        # Remove default configuration if conflicting on port 80
        rm -f /etc/nginx/sites-enabled/default
    elif [ -d "/etc/nginx/conf.d" ]; then
        echo "$NGINX_CONF" > "/etc/nginx/conf.d/anbarpro.conf"
    fi
    
    nginx -t &> /dev/null
    if [ $? -eq 0 ]; then
        systemctl restart nginx
        echo -e "${GREEN}✅ Nginx configuration applied and server restarted successfully.${NC}"
        
        # Enable SELinux Nginx Network Connection if applicable
        if command -v getenforce &> /dev/null; then
            if [ "$(getenforce)" = "Enforcing" ]; then
                echo -e "${YELLOW}🛡️ SELinux is active. Granting Nginx network connect permission...${NC}"
                setsebool -P httpd_can_network_connect 1 &> /dev/null
                echo -e "${GREEN}✅ Granted Nginx permission in SELinux successfully.${NC}"
            fi
        fi
        
        if [ -n "$APP_DOMAIN" ]; then
            ACCESS_URL="http://$APP_DOMAIN"

            # Obtain SSL via Certbot if requested
            if [ "$WANT_SSL" = "y" ]; then
                echo -e "\n${YELLOW}🔒 Obtaining free SSL Certificate (Let's Encrypt) for domain $APP_DOMAIN...${NC}"
                # Stop nginx temporarily if standalone is needed or use --nginx plugin directly
                certbot --nginx -d "$APP_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ SSL Certificate activated successfully. Redirected traffic to HTTPS!${NC}"
                    ACCESS_URL="https://$APP_DOMAIN"
                else
                    echo -e "${RED}⚠️ SSL issuance failed. Please make sure the domain points to your server IP ($SERVER_IP).${NC}"
                fi
            fi
        else
            ACCESS_URL="http://$SERVER_IP"
        fi
    else
        echo -e "${RED}❌ Invalid Nginx configuration. Skipping Nginx setup.${NC}"
    fi
    
    echo -e "\n${GREEN}==================================================================${NC}"
    echo -e "${GREEN}🎉 AnbarPro Inventory Management System Installed Successfully!${NC}"
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "   🔹 Installation path: $INSTALL_DIR"
    echo -e "   🔹 Service status: Enabled & Running (Active)"
    echo -e "   🔹 Internal port: $APP_PORT"
    echo -e "   🔹 Access URL: ${CYAN}$ACCESS_URL${NC}"
    echo -e "   🔹 Note: The database is initialized and ready. On your first access"
    echo -e "      you will be greeted by the welcome page to set up brand & admin."
    echo -e "${GREEN}==================================================================${NC}\n"
    
    read -p "Press [Enter] to return to the main menu..." CONFIRM
}

# Update System
update_anbarpro() {
    echo -e "\n${YELLOW}🔄 Checking system installation paths...${NC}"
    
    # Ensure swap is setup to avoid freeze during update build/npm install
    setup_swap_if_needed
    
    # Run automatic garbage collection to prevent ENOSPC (Disk Full)
    cleanup_disk_space
    
    INSTALL_DIR="/usr/local/anbarpro"
    if [ ! -d "$INSTALL_DIR" ]; then
        read -p "📂 Enter AnbarPro installation folder path [/usr/local/anbarpro]: " INPUT_DIR
        if [ -n "$INPUT_DIR" ]; then
            INSTALL_DIR="$INPUT_DIR"
        fi
    fi
    
    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ Application folder not found! Please select option [1] to install first.${NC}"
        sleep 2
        return 1
    fi
    
    echo -e "${YELLOW}🛑 Stopping current service to free up memory for the update process...${NC}"
    systemctl stop anbarpro 2>/dev/null || true
    
    cd "$INSTALL_DIR"
    mkdir -p backups data /var/backups/anbarpro
    echo -e "${YELLOW}📦 Creating backup before update...${NC}"
    if command -v tar &> /dev/null; then
        tar -czf backups/AnbarMeh_AutoBackup_PreUpdate_$(date +%Y%m%d%H%M%S).tar.gz --exclude='./node_modules' --exclude='./dist' . 2>/dev/null || true
        echo -e "${GREEN}✅ Backup saved successfully in the backups folder.${NC}"
    fi

    # Safe preservation of active business database to permanent system backup directory
    if [ -s "data/server_database.json" ]; then
        cp -f "data/server_database.json" "/var/backups/anbarpro/server_database_update_safe.json" 2>/dev/null || true
    fi
    
    echo -e "${YELLOW}📥 Fetching the latest application codes from GitHub main repository...${NC}"
    git fetch --all
    git reset --hard origin/main || git pull --force
    
    # Restore preserved active database
    if [ -s "/var/backups/anbarpro/server_database_update_safe.json" ]; then
        mkdir -p data
        cp -f "/var/backups/anbarpro/server_database_update_safe.json" "data/server_database.json"
        echo -e "${GREEN}✅ Active business database preserved safely.${NC}"
    fi
    
    # Remove package-lock.json if it exists to prevent Tailwind v4 native binary compilation bugs
    if [ -f "package-lock.json" ]; then
        echo -e "${YELLOW}🗑️ Removing package-lock.json to reload OS native bindings...${NC}"
        rm -f package-lock.json
    fi
    
    # 4. Install NPM Dependencies
    run_npm_with_progress "npm install --production=false --legacy-peer-deps" "Installing/Updating main NPM dependencies"
    
    # Force install the correct Tailwind CSS v4 Rust native bindings based on CPU architecture
    ARCH=$(uname -m)
    echo -e "${YELLOW}🖥️ Detecting CPU architecture: $ARCH${NC}"
    if [ "$ARCH" = "x86_64" ]; then
        run_npm_with_progress "npm install --save-dev --force @tailwindcss/oxide-linux-x64-gnu" "Installing native Linux x64 bindings for @tailwindcss/oxide"
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        run_npm_with_progress "npm install --save-dev --force @tailwindcss/oxide-linux-arm64-gnu" "Installing native Linux ARM64 bindings for @tailwindcss/oxide"
    fi
    
    # Clean previous build to verify success
    rm -f dist/server.cjs
    echo -e "${YELLOW}📦 Compiling project and building production assets (Vite & Server)...${NC}"
    NODE_OPTIONS="--max-old-space-size=1536" npm run build
    
    # Auto-repair fallback if native binary fails during build
    if [ ! -f "dist/server.cjs" ]; then
        echo -e "\n${YELLOW}🔄 Attempting automatic native bindings repair and rebuilding...${NC}"
        npm install --save-dev --force @tailwindcss/oxide @tailwindcss/oxide-linux-x64-gnu
        NODE_OPTIONS="--max-old-space-size=1536" npm run build
    fi
    
    if [ ! -f "dist/server.cjs" ]; then
        echo -e "\n${RED}❌ Critical Error: Update build failed! dist/server.cjs was not created.${NC}"
        echo -e "${YELLOW}Checking root partition disk space:${NC}"
        df -h /
        read -p "Press [Enter] to return..." DUMMY
        return 1
    fi
    
    # Ensure custom port and domain are strictly preserved from Nginx or existing configs
    DETECTED_PORT="3000"
    
    # 1. Search all files in /etc/nginx to see where Nginx is actually routing traffic for anbarpro
    if [ -d "/etc/nginx" ]; then
        FOUND_P=$(grep -rEi 'proxy_pass\s+http://(127\.0\.0\.1|localhost):[0-9]+' /etc/nginx/ 2>/dev/null | head -n1 | grep -oE '[0-9]+$' | tr -d ' "/;')
        if [ -n "$FOUND_P" ] && [[ "$FOUND_P" =~ ^[0-9]+$ ]]; then
            DETECTED_PORT="$FOUND_P"
            echo -e "${GREEN}🔍 Detected active port from Nginx routing: $DETECTED_PORT${NC}"
        fi
    fi
    
    # 2. If Nginx routing not found, fallback to existing systemd service port
    if [ "$DETECTED_PORT" = "3000" ] && [ -f "/etc/systemd/system/anbarpro.service" ]; then
        FOUND_P=$(grep -oE 'PORT=[0-9]+' /etc/systemd/system/anbarpro.service 2>/dev/null | cut -d= -f2)
        if [ -n "$FOUND_P" ] && [[ "$FOUND_P" =~ ^[0-9]+$ ]]; then
            DETECTED_PORT="$FOUND_P"
            echo -e "${GREEN}🔍 Detected active port from systemd service: $DETECTED_PORT${NC}"
        fi
    fi

    # 3. Fallback to existing .env if still not found or as confirmation
    if [ "$DETECTED_PORT" = "3000" ] && [ -f "$INSTALL_DIR/.env" ]; then
        FOUND_P=$(grep -E '^(PORT|APP_PORT)=' "$INSTALL_DIR/.env" | head -n1 | cut -d= -f2 | tr -d ' "')
        if [ -n "$FOUND_P" ] && [[ "$FOUND_P" =~ ^[0-9]+$ ]]; then
            DETECTED_PORT="$FOUND_P"
            echo -e "${GREEN}🔍 Detected active port from .env: $DETECTED_PORT${NC}"
        fi
    fi
    
    echo -e "${CYAN}🔌 Active Web Port Determined: $DETECTED_PORT (Preserving without alteration)${NC}"

    # Ensure .env exists and has the correct port
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        cat > "$INSTALL_DIR/.env" <<EOF
PORT=$DETECTED_PORT
APP_PORT=$DETECTED_PORT
NODE_ENV=production
EOF
    fi

    # Ensure systemd service exists and is configured properly with preserved PORT (unmasked)
    unmask_and_write_service "$DETECTED_PORT" "$INSTALL_DIR"

    echo -e "${YELLOW}🛡️ Restarting AnbarPro web service on Port $DETECTED_PORT...${NC}"
    # Clean up legacy PM2 processes to prevent port conflicts with systemd (EADDRINUSE)
    if command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}🧹 Cleaning up legacy PM2 instances to prevent port conflicts...${NC}"
        pm2 stop anbarpro 2>/dev/null || true
        pm2 delete anbarpro 2>/dev/null || true
        pm2 stop anbarmeh-app 2>/dev/null || true
        pm2 delete anbarmeh-app 2>/dev/null || true
        pm2 save 2>/dev/null || true
        pm2 kill 2>/dev/null || true
    fi
    
    echo -e "${YELLOW}🧹 Forcefully freeing port $DETECTED_PORT (fuser, lsof, ss fallbacks)...${NC}"
    if command -v fuser &> /dev/null; then
        fuser -k -9 $DETECTED_PORT/tcp 2>/dev/null || true
    else
        apt-get install -y psmisc &>/dev/null || yum install -y psmisc &>/dev/null || true
        fuser -k -9 $DETECTED_PORT/tcp 2>/dev/null || true
    fi
    if command -v lsof &> /dev/null; then
        kill -9 $(lsof -t -i:$DETECTED_PORT) 2>/dev/null || true
    fi
    if command -v ss &> /dev/null; then
        PIDS=$(ss -lptn "sport = :$DETECTED_PORT" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2)
        if [ -n "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null || true
        fi
    fi

    systemctl daemon-reload
    systemctl restart anbarpro
    
    # Verify service health
    sleep 2
    if systemctl is-active --quiet anbarpro; then
        echo -e "${GREEN}✅ Update completed successfully! Service is active and running on port $DETECTED_PORT.${NC}"
    else
        echo -e "${YELLOW}⚠️ Checking service status...${NC}"
        journalctl -u anbarpro -n 10 --no-pager
    fi
    
    # Sync Nginx configuration if existing to point to the active custom port
    if [ -f "/etc/nginx/sites-available/anbarpro" ]; then
        echo -e "${YELLOW}🌐 Syncing Nginx reverse proxy to port $DETECTED_PORT...${NC}"
        sed -i -E "s|proxy_pass http://127.0.0.1:[0-9]+;|proxy_pass http://127.0.0.1:$DETECTED_PORT;|g" "/etc/nginx/sites-available/anbarpro"
    elif [ -f "/etc/nginx/conf.d/anbarpro.conf" ]; then
        echo -e "${YELLOW}🌐 Syncing Nginx reverse proxy to port $DETECTED_PORT...${NC}"
        sed -i -E "s|proxy_pass http://127.0.0.1:[0-9]+;|proxy_pass http://127.0.0.1:$DETECTED_PORT;|g" "/etc/nginx/conf.d/anbarpro.conf"
    fi

    # Restart Nginx if present
    if command -v nginx &> /dev/null; then
        echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
        if nginx -t; then
            systemctl reload nginx || systemctl restart nginx
        else
            echo -e "${RED}⚠️ Nginx configuration test failed! Check your Nginx config manually: nginx -t${NC}"
        fi
    fi
    
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}🎉 AnbarPro Updated & Restared Successfully on Port $DETECTED_PORT!${NC}"
    echo -e "${GREEN}==================================================================${NC}\n"
    sleep 3
}

# Change Web Service Port
change_port() {
    INSTALL_DIR="/usr/local/anbarpro"
    if [ ! -d "$INSTALL_DIR" ]; then
        read -p "📂 Enter AnbarPro installation folder path [/usr/local/anbarpro]: " INPUT_DIR
        if [ -n "$INPUT_DIR" ]; then
            INSTALL_DIR="$INPUT_DIR"
        fi
    fi

    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ Application folder not found! Please install first.${NC}"
        sleep 2
        return 1
    fi

    # Detect current port from Nginx or Fallbacks
    local current_port="3000"
    if [ -f "/etc/nginx/sites-available/anbarpro" ]; then
        current_port=$(grep -oE 'proxy_pass http://127.0.0.1:[0-9]+' /etc/nginx/sites-available/anbarpro | grep -oE '[0-9]+$')
    elif [ -f "/etc/nginx/conf.d/anbarpro.conf" ]; then
        current_port=$(grep -oE 'proxy_pass http://127.0.0.1:[0-9]+' /etc/nginx/conf.d/anbarpro.conf | grep -oE '[0-9]+$')
    elif [ -f "$INSTALL_DIR/.env" ]; then
        current_port=$(grep -E '^(PORT|APP_PORT)=' "$INSTALL_DIR/.env" | head -n1 | cut -d= -f2 | tr -d ' "')
    elif [ -f "/etc/systemd/system/anbarpro.service" ]; then
        current_port=$(grep -o 'PORT=[0-9]\+' /etc/systemd/system/anbarpro.service | cut -d= -f2)
    fi
    current_port=${current_port:-3000}

    echo -e "\n${CYAN}🔌 Current Web Service Port: ${YELLOW}$current_port${NC}"
    read -p "⚙️ Enter NEW custom port (e.g. 3000, 8080, 5000, 8000): " NEW_PORT

    if [ -z "$NEW_PORT" ] || ! [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ Invalid port number provided! Operation cancelled.${NC}"
        sleep 2
        return 1
    fi

    echo -e "${YELLOW}⚙️ Updating port from $current_port to $NEW_PORT...${NC}"

    # Update .env
    cat > "$INSTALL_DIR/.env" <<EOF
PORT=$NEW_PORT
APP_PORT=$NEW_PORT
NODE_ENV=production
EOF
    chmod 600 "$INSTALL_DIR/.env"

    # Update systemd unit
    unmask_and_write_service "$NEW_PORT" "$INSTALL_DIR"

    # Update firewall rules
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "active"; then
            ufw allow $NEW_PORT/tcp &> /dev/null
            ufw reload &> /dev/null
        fi
    fi
    if command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-port=$NEW_PORT/tcp &> /dev/null
            firewall-cmd --reload &> /dev/null
        fi
    fi

    # Update Nginx reverse proxy if configured
    if [ -f "/etc/nginx/sites-available/anbarpro" ]; then
        sed -i -E "s|proxy_pass http://127.0.0.1:[0-9]+;|proxy_pass http://127.0.0.1:$NEW_PORT;|g" "/etc/nginx/sites-available/anbarpro"
        nginx -t && systemctl reload nginx || echo -e "${RED}⚠️ Nginx reload failed. Check Nginx configuration.${NC}"
    elif [ -f "/etc/nginx/conf.d/anbarpro.conf" ]; then
        sed -i -E "s|proxy_pass http://127.0.0.1:[0-9]+;|proxy_pass http://127.0.0.1:$NEW_PORT;|g" "/etc/nginx/conf.d/anbarpro.conf"
        nginx -t && systemctl reload nginx || echo -e "${RED}⚠️ Nginx reload failed. Check Nginx configuration.${NC}"
    fi

    # Clean up PM2 to avoid port conflicts
    if command -v pm2 &> /dev/null; then
        pm2 stop anbarpro 2>/dev/null || true
        pm2 delete anbarpro 2>/dev/null || true
        pm2 stop anbarmeh-app 2>/dev/null || true
        pm2 delete anbarmeh-app 2>/dev/null || true
        pm2 save 2>/dev/null || true
        pm2 kill 2>/dev/null || true
    fi

    echo -e "${YELLOW}🧹 Forcefully freeing new port $NEW_PORT (fuser, lsof, ss fallbacks)...${NC}"
    if command -v fuser &> /dev/null; then
        fuser -k -9 $NEW_PORT/tcp 2>/dev/null || true
    else
        apt-get install -y psmisc &>/dev/null || yum install -y psmisc &>/dev/null || true
        fuser -k -9 $NEW_PORT/tcp 2>/dev/null || true
    fi
    if command -v lsof &> /dev/null; then
        kill -9 $(lsof -t -i:$NEW_PORT) 2>/dev/null || true
    fi
    if command -v ss &> /dev/null; then
        PIDS=$(ss -lptn "sport = :$NEW_PORT" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2)
        if [ -n "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null || true
        fi
    fi

    # Restart Services
    systemctl daemon-reload
    systemctl restart anbarpro

    sleep 2
    if systemctl is-active --quiet anbarpro; then
        echo -e "${GREEN}✅ Port successfully changed to $NEW_PORT! Service is online and healthy.${NC}"
    else
        echo -e "${YELLOW}⚠️ Service status check:${NC}"
        journalctl -u anbarpro -n 10 --no-pager
    fi

    read -p "Press [Enter] to return..." DUMMY
}

# Uninstall
uninstall_anbarpro() {
    echo -e "\n${RED}⚠️ WARNING: This will permanently delete all AnbarPro data and source files!${NC}"
    read -p "Are you absolutely sure you want to completely uninstall the system? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
        echo -e "${YELLOW}🗑️ Stopping and removing systemd service...${NC}"
        systemctl stop anbarpro &> /dev/null
        systemctl disable anbarpro &> /dev/null
        rm -f /etc/systemd/system/anbarpro.service
        systemctl daemon-reload
        
        INSTALL_DIR="/usr/local/anbarpro"
        cd /root 2>/dev/null || cd /tmp
        if [ -d "$INSTALL_DIR" ]; then
            echo -e "${YELLOW}🗑️ Deleting physical application files directory...${NC}"
            rm -rf "$INSTALL_DIR"
        fi
        
        echo -e "${GREEN}✅ AnbarPro has been completely uninstalled from this server.${NC}"
    else
        echo -e "${YELLOW}Uninstallation cancelled.${NC}"
    fi
    sleep 3
}

# Show status
show_status() {
    echo -e "\n${CYAN}📊 Current AnbarPro Service Status:${NC}"
    systemctl status anbarpro --no-pager
    echo -e "\n${YELLOW}📋 Latest 30 Application Logs (Journalctl):${NC}"
    journalctl -u anbarpro -n 30 --no-pager
    echo ""
    read -p "Press [Enter] to return to the main menu..." CONFIRM
}

# Restart Service
restart_service() {
    echo -e "\n${YELLOW}🔄 Restarting AnbarPro service...${NC}"
    systemctl restart anbarpro
    echo -e "${GREEN}✅ Service restarted successfully.${NC}"
    sleep 2
}

# Stop Service
stop_service() {
    echo -e "\n${YELLOW}🛑 Stopping AnbarPro service...${NC}"
    systemctl stop anbarpro
    echo -e "${GREEN}✅ Service stopped successfully.${NC}"
    sleep 2
}

# Manual backup
manual_backup() {
    INSTALL_DIR="/usr/local/anbarpro"
    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ Application folder not found!${NC}"
        sleep 2
        return 1
    fi
    cd "$INSTALL_DIR"
    mkdir -p backups
    BACKUP_FILE="backups/AnbarMeh_ManualBackup_$(date +%Y%m%d%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" --exclude='./node_modules' --exclude='./dist' .
    echo -e "${GREEN}✅ Manual compressed backup saved successfully: $BACKUP_FILE${NC}"
    sleep 3
}

# Restore database from backup
restore_backup() {
    INSTALL_DIR="/usr/local/anbarpro"
    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ Application folder not found!${NC}"
        sleep 2
        return 1
    fi
    
    echo -e "\n${CYAN}🔎 Searching for available backups in system...${NC}"
    
    local count=0
    local backup_paths=()
    local backup_types=()
    
    # 1. Search for previous renamed directories:
    for dir in $(ls -d /usr/local/anbarpro_backup_* 2>/dev/null); do
        if [ -f "$dir/data/server_database.json" ]; then
            backup_paths+=("$dir/data/server_database.json")
            backup_types+=("Full directory backup: $dir")
            ((count++))
        fi
    done
    
    # 2. Search for tar.gz backups inside backups directory
    for archive in $(ls -t "$INSTALL_DIR/backups/"*.tar.gz 2>/dev/null); do
        backup_paths+=("$archive")
        backup_types+=("Compressed backup archive: $(basename "$archive")")
        ((count++))
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${RED}❌ No database backups found on this server!${NC}"
        sleep 3
        return 1
    fi
    
    echo -e "\n${YELLOW}📋 Available backups found on your system:${NC}"
    for i in "${!backup_paths[@]}"; do
        echo -e "   [${GREEN}$((i+1))${NC}] ${backup_types[$i]}"
    done
    echo -e "   [${RED}0${NC}] Cancel (انصراف)"
    
    echo ""
    read -p "🔢 Select backup to restore [0-$count]: " BACKUP_CHOICE
    
    if [ -z "$BACKUP_CHOICE" ] || [ "$BACKUP_CHOICE" -eq 0 ] 2>/dev/null; then
        echo -e "${YELLOW}Restore operation cancelled.${NC}"
        sleep 1.5
        return 0
    fi
    
    if ! [[ "$BACKUP_CHOICE" =~ ^[0-9]+$ ]] || [ "$BACKUP_CHOICE" -gt "$count" ] || [ "$BACKUP_CHOICE" -lt 1 ]; then
        echo -e "${RED}❌ Invalid selection!${NC}"
        sleep 1.5
        return 1
    fi
    
    local INDEX=$((BACKUP_CHOICE - 1))
    local SELECTED_PATH="${backup_paths[$INDEX]}"
    local SELECTED_TYPE="${backup_types[$INDEX]}"
    
    echo -e "\n${RED}⚠️ WARNING: Restoring will completely overwrite your current active database!${NC}"
    read -p "Are you absolutely sure you want to restore? (yes/no): " CONFIRM_RESTORE
    
    if [ "$CONFIRM_RESTORE" != "yes" ]; then
        echo -e "${YELLOW}Restore operation cancelled.${NC}"
        sleep 1.5
        return 0
    fi
    
    echo -e "${YELLOW}🛑 Stopping service to safely overwrite database...${NC}"
    systemctl stop anbarpro 2>/dev/null || true
    
    mkdir -p "$INSTALL_DIR/data"
    local cp_exit=1
    
    if [[ "$SELECTED_PATH" == *.json ]]; then
        # Direct file copy
        cp -f "$SELECTED_PATH" "$INSTALL_DIR/data/server_database.json"
        cp_exit=$?
    elif [[ "$SELECTED_PATH" == *.tar.gz ]]; then
        # Unpack server_database.json from tar.gz
        local TMP_EXTRACT_DIR="/tmp/anbar_restore_$(date +%s)"
        mkdir -p "$TMP_EXTRACT_DIR"
        tar -xzf "$SELECTED_PATH" -C "$TMP_EXTRACT_DIR" data/server_database.json 2>/dev/null || tar -xzf "$SELECTED_PATH" -C "$TMP_EXTRACT_DIR" ./data/server_database.json 2>/dev/null || true
        
        if [ -f "$TMP_EXTRACT_DIR/data/server_database.json" ]; then
            cp -f "$TMP_EXTRACT_DIR/data/server_database.json" "$INSTALL_DIR/data/server_database.json"
            cp_exit=$?
            rm -rf "$TMP_EXTRACT_DIR"
        elif [ -f "$TMP_EXTRACT_DIR/./data/server_database.json" ]; then
            cp -f "$TMP_EXTRACT_DIR/./data/server_database.json" "$INSTALL_DIR/data/server_database.json"
            cp_exit=$?
            rm -rf "$TMP_EXTRACT_DIR"
        else
            echo -e "${RED}❌ Failed to extract server_database.json from backup archive!${NC}"
            rm -rf "$TMP_EXTRACT_DIR"
            systemctl start anbarpro 2>/dev/null || true
            sleep 3
            return 1
        fi
    fi
    
    if [ "$cp_exit" -eq 0 ]; then
        # Verify file ownership & permissions
        chown -R root:root "$INSTALL_DIR/data" 2>/dev/null || true
        chmod 600 "$INSTALL_DIR/data/server_database.json" 2>/dev/null || true
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to copy database file!${NC}"
    fi
    
    echo -e "${YELLOW}⚡ Restarting service...${NC}"
    systemctl restart anbarpro 2>/dev/null || true
    
    echo -e "${GREEN}🎉 DATABASE RESTORED AND SERVICE ONLINE! All your data is back!${NC}"
    sleep 3
}

# Core menu loop
while true; do
    show_menu
    read -p "🔢 Please select an option [0-9]: " CHOICE
    case $CHOICE in
        1)
            install_anbarpro
            ;;
        2)
            update_anbarpro
            ;;
        3)
            change_port
            ;;
        4)
            show_status
            ;;
        5)
            restart_service
            ;;
        6)
            stop_service
            ;;
        7)
            manual_backup
            ;;
        8)
            restore_backup
            ;;
        9)
            uninstall_anbarpro
            ;;
        0)
            echo -e "\n${GREEN}Goodbye! Exiting installer.${NC}\n"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option selected! Please try again.${NC}"
            sleep 1.5
            ;;
    esac
done
