#!/usr/bin/env bash
# =================================================================
#  ElectroStock Industrial System - Linux Installer & Manager v1.0
# =================================================================

APP_NAME="electrostock"
APP_DIR="/opt/electrostock"
REPO_URL="https://github.com/meh732/anbarmeh.git"
NODE_VERSION="20"

# Configuration
PORT="3000"
DOMAIN=""
ADMIN_USER="admin"
ADMIN_PASS="admin123"

# Text Styling
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}${BOLD}"
echo "==============================================================="
echo "        ElectroStock Industrial Inventory Management          "
echo "               Linux Installation & CLI Manager                "
echo "==============================================================="
echo -e "${NC}"

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}[ERROR] Please run this script with root privileges (sudo).${NC}"
        exit 1
    fi
}

install_dependencies() {
    echo -e "${YELLOW}[1/5] Detecting Linux Distribution & Automatically Installing All Prerequisites...${NC}"

    if command -v apt-get &> /dev/null; then
        echo -e "${CYAN}Debian/Ubuntu detected. Updating packages...${NC}"
        apt-get update -y > /dev/null 2>&1
        apt-get install -y curl git build-essential net-tools ufw nginx > /dev/null 2>&1
        if ! command -v node &> /dev/null; then
            echo -e "${CYAN}Downloading & Installing Node.js 20 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
            apt-get install -y nodejs > /dev/null 2>&1
        fi
    elif command -v dnf &> /dev/null || command -v yum &> /dev/null; then
        PKG_MGR="dnf"
        command -v dnf &> /dev/null || PKG_MGR="yum"
        echo -e "${CYAN}RHEL/CentOS/AlmaLinux/Fedora detected (${PKG_MGR}). Updating packages...${NC}"
        $PKG_MGR update -y > /dev/null 2>&1
        $PKG_MGR install -y curl git gcc-c++ make net-tools firewalld nginx > /dev/null 2>&1
        if ! command -v node &> /dev/null; then
            echo -e "${CYAN}Downloading & Installing Node.js 20 LTS...${NC}"
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
            $PKG_MGR install -y nodejs > /dev/null 2>&1
        fi
    else
        echo -e "${RED}[WARNING] Unknown package manager. Attempting standard binary check...${NC}"
    fi

    # Install PM2 Process Manager globally if not present
    if ! command -v pm2 &> /dev/null; then
        echo -e "${CYAN}Installing PM2 process manager globally via npm...${NC}"
        npm install -g pm2 > /dev/null 2>&1
    fi

    echo -e "${GREEN}[OK] Node.js $(node -v), PM2 & Nginx ready.${NC}"
}

configure_credentials_and_ports() {
    echo -e "\n${YELLOW}===============================================================${NC}"
    echo -e "${YELLOW}   STEP-BY-STEP INTERACTIVE CONFIGURATION (ANBARMEH / GITHUB)   ${NC}"
    echo -e "${YELLOW}===============================================================${NC}\n"

    TTY_DEV="/dev/tty"
    if [ ! -c "$TTY_DEV" ]; then
        TTY_DEV="/dev/stdin"
    fi

    echo -e "${CYAN}[Step 1/4] Select Application HTTP Port:${NC}"
    read -p "  Enter Port Number [Default: ${PORT:-3000}]: " input_port < $TTY_DEV
    if [ -n "$input_port" ]; then PORT="$input_port"; else PORT="${PORT:-3000}"; fi

    echo -e "\n${CYAN}[Step 2/4] Configure Domain Name or Server IP (Optional):${NC}"
    read -p "  Enter Domain (e.g. anbar.company.com) [Default: ${DOMAIN:-None}]: " input_domain < $TTY_DEV
    if [ -n "$input_domain" ]; then DOMAIN="$input_domain"; fi

    echo -e "\n${CYAN}[Step 3/4] Configure Administrator Username:${NC}"
    read -p "  Enter Admin Username [Default: ${ADMIN_USER:-admin}]: " input_user < $TTY_DEV
    if [ -n "$input_user" ]; then ADMIN_USER="$input_user"; else ADMIN_USER="${ADMIN_USER:-admin}"; fi

    echo -e "\n${CYAN}[Step 4/4] Configure Administrator Password:${NC}"
    read -p "  Enter Admin Password [Default: ${ADMIN_PASS:-admin123}]: " input_pass < $TTY_DEV
    if [ -n "$input_pass" ]; then ADMIN_PASS="$input_pass"; else ADMIN_PASS="${ADMIN_PASS:-admin123}"; fi

    echo -e "\n${GREEN}---------------------------------------------------------------${NC}"
    echo -e "${GREEN} CONFIRMED SETTINGS SUMMARY:${NC}"
    echo -e "  - GitHub Repo: $REPO_URL"
    echo -e "  - Application Port: $PORT"
    echo -e "  - Server Domain / IP: ${DOMAIN:-Direct Server IP}"
    echo -e "  - Admin Username: $ADMIN_USER"
    echo -e "  - Admin Password: $ADMIN_PASS"
    echo -e "${GREEN}---------------------------------------------------------------${NC}\n"

    read -p "Proceed with installation using these settings? (Y/n): " confirm_install < $TTY_DEV
    if [[ "$confirm_install" =~ ^[Nn]$ ]]; then
        echo -e "${RED}[CANCELLED] Installation aborted by user.${NC}"
        exit 1
    fi
}

configure_firewall_and_env() {
    echo -e "${YELLOW}[2/5] Creating environment file and configuring firewall for Port $PORT...${NC}"
    
    mkdir -p "$APP_DIR"
    cat <<EOF > "$APP_DIR/.env"
PORT=$PORT
ADMIN_USER=$ADMIN_USER
ADMIN_PASS=$ADMIN_PASS
DOMAIN=$DOMAIN
NODE_ENV=production
EOF

    # Open firewall port
    if command -v ufw &> /dev/null; then
        ufw allow $PORT/tcp > /dev/null 2>&1 || true
        ufw allow 80/tcp > /dev/null 2>&1 || true
        ufw allow 443/tcp > /dev/null 2>&1 || true
    fi
    if command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=$PORT/tcp > /dev/null 2>&1 || true
        firewall-cmd --permanent --add-service=http > /dev/null 2>&1 || true
        firewall-cmd --reload > /dev/null 2>&1 || true
    fi

    # Configure Nginx reverse proxy if DOMAIN is specified
    if [ -n "$DOMAIN" ] && [ -d "/etc/nginx/conf.d" ]; then
        echo -e "${CYAN}Setting up Nginx reverse proxy for $DOMAIN -> Port $PORT...${NC}"
        cat <<EOF > "/etc/nginx/conf.d/$APP_NAME.conf"
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
        systemctl reload nginx > /dev/null 2>&1 || true
    fi
}

install_electrostock() {
    check_root
    configure_credentials_and_ports

    install_dependencies
    
    echo -e "${YELLOW}[3/5] Cloning repository from GitHub (${REPO_URL})...${NC}"
    if [ -d "$APP_DIR" ]; then
        echo -e "${CYAN}Directory $APP_DIR exists. Fetching latest changes...${NC}"
        cd "$APP_DIR" && git pull
    else
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi

    configure_firewall_and_env

    echo -e "${YELLOW}[4/5] Installing dependencies & building application...${NC}"
    npm install
    npm run build

    echo -e "${YELLOW}[5/5] Starting PM2 service on Port $PORT...${NC}"
    pm2 stop "$APP_NAME" > /dev/null 2>&1 || true
    pm2 delete "$APP_NAME" > /dev/null 2>&1 || true
    PORT=$PORT pm2 start server.js --name "$APP_NAME"
    pm2 save
    pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

    echo -e "${GREEN}${BOLD}"
    echo "==============================================================="
    echo "   [SUCCESS] ElectroStock v1.0 is now LIVE!                    "
    echo "   Port: $PORT                                                 "
    echo "   Admin Username: $ADMIN_USER                                "
    echo "   Access URL: http://${DOMAIN:-$(hostname -I | awk '{print $1}')}:$PORT"
    echo "==============================================================="
    echo -e "${NC}"
}

update_electrostock() {
    check_root
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${RED}[ERROR] ElectroStock is not installed at $APP_DIR.${NC}"
        return
    fi

    echo -e "${YELLOW}Pulling updates from GitHub...${NC}"
    cd "$APP_DIR"
    git pull
    npm install
    npm run build
    pm2 restart "$APP_NAME"
    echo -e "${GREEN}[SUCCESS] ElectroStock updated to the latest version!${NC}"
}

check_status() {
    echo -e "${CYAN}--- PM2 Service Status ---${NC}"
    pm2 status "$APP_NAME"
    echo -e "${CYAN}--- Active Environment Config ---${NC}"
    if [ -f "$APP_DIR/.env" ]; then
        cat "$APP_DIR/.env"
    else
        echo "No .env file found."
    fi
}

uninstall_electrostock() {
    check_root
    read -p "Are you sure you want to completely uninstall ElectroStock? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Stopping PM2 service and deleting directory...${NC}"
        pm2 stop "$APP_NAME" > /dev/null 2>&1 || true
        pm2 delete "$APP_NAME" > /dev/null 2>&1 || true
        pm2 save
        rm -f "/etc/nginx/conf.d/$APP_NAME.conf"
        rm -rf "$APP_DIR"
        echo -e "${RED}[OK] ElectroStock has been uninstalled.${NC}"
    else
        echo "Uninstall cancelled."
    fi
}

show_menu() {
    while true; do
        echo -e "${BOLD}Select an action:${NC}"
        echo "  1) Install / Reinstall ElectroStock"
        echo "  2) Update ElectroStock from GitHub"
        echo "  3) Check Service Status & Environment"
        echo "  4) Configure Domain, Port & Admin Credentials"
        echo "  5) Uninstall ElectroStock"
        echo "  6) Exit"
        echo ""
        read -p "Enter choice [1-6]: " choice
        case $choice in
            1) install_electrostock; break ;;
            2) update_electrostock; break ;;
            3) check_status; break ;;
            4) configure_credentials_and_ports; configure_firewall_and_env; break ;;
            5) uninstall_electrostock; break ;;
            6) echo "Exiting installer. Goodbye!"; exit 0 ;;
            *) echo -e "${RED}Invalid option. Please choose 1-6.${NC}" ;;
        esac
    done
}

show_menu
