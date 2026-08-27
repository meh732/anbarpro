#!/bin/bash
# ==============================================================================
#  AnbarMeh Enterprise - Linux Server Auto-Installer & Service Manager
#  Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS/RHEL/AlmaLinux/Rocky
#  Default Port: 3000 (0.0.0.0) | Multi-User Real-time Sync Hub
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

APP_DIR="/opt/anbarmeh-server"
SERVICE_NAME="anbarmeh.service"
PORT=3000

print_header() {
    clear
    echo -e "${BLUE}${BOLD}==============================================================================${NC}"
    echo -e "${CYAN}${BOLD}       AnbarMeh Enterprise - Linux Server & Multi-User Network Manager         ${NC}"
    echo -e "${BLUE}${BOLD}==============================================================================${NC}"
    echo ""
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}[ERROR] Please run this script as root or with sudo.${NC}"
        exit 1
    fi
}

get_local_ip() {
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP="127.0.0.1"
    fi
}

install_dependencies() {
    echo -e "${BLUE}[1/5] Detecting Linux Distribution and Installing Prerequisites...${NC}"
    if [ -f /etc/debian_version ]; then
        apt-get update -y
        apt-get install -y curl git ufw build-essential
        if ! command -v node &> /dev/null; then
            echo -e "${CYAN}Installing Node.js 20 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        fi
    elif [ -f /etc/redhat-release ]; then
        yum update -y
        yum install -y curl git firewalld gcc-c++ make
        if ! command -v node &> /dev/null; then
            echo -e "${CYAN}Installing Node.js 20 LTS...${NC}"
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
        fi
    fi
    echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) ready!${NC}"
}

setup_application() {
    echo -e "${BLUE}[2/5] Setting up AnbarMeh Server in ${APP_DIR}...${NC}"
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/data"
    
    # Preserve existing database if already installed before copying new code
    if [ -f "$APP_DIR/data/server_database.json" ]; then
        echo -e "${GREEN}✓ Preserving existing database at $APP_DIR/data/server_database.json (No data loss)${NC}"
        cp "$APP_DIR/data/server_database.json" /tmp/anbarmeh_db_backup_temp.json
    fi

    # Copy current workspace files if running locally or clone
    if [ -f "server.ts" ] && [ -f "package.json" ]; then
        echo -e "${CYAN}Copying local project files to ${APP_DIR}...${NC}"
        cp -r . "$APP_DIR/"
    fi

    # Restore preserved database after file copy
    if [ -f /tmp/anbarmeh_db_backup_temp.json ]; then
        cp /tmp/anbarmeh_db_backup_temp.json "$APP_DIR/data/server_database.json"
        rm -f /tmp/anbarmeh_db_backup_temp.json
        echo -e "${GREEN}✓ Existing database restored safely.${NC}"
    fi

    cd "$APP_DIR"
    echo -e "${CYAN}Installing Node modules & compiling server bundle...${NC}"
    npm install
    npm run build

    echo -e "${GREEN}✓ Build completed successfully!${NC}"
}

configure_firewall() {
    echo -e "${BLUE}[3/5] Configuring Firewall for Port ${PORT} (0.0.0.0)...${NC}"
    if command -v ufw &> /dev/null; then
        ufw allow ${PORT}/tcp || true
    fi
    if command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=${PORT}/tcp || true
        firewall-cmd --reload || true
    fi
    echo -e "${GREEN}✓ Port ${PORT} opened for LAN and multi-client access!${NC}"
}

create_systemd_service() {
    echo -e "${BLUE}[4/5] Creating Systemd Background Service (${SERVICE_NAME})...${NC}"
    cat <<EOF > /etc/systemd/system/${SERVICE_NAME}
[Unit]
Description=AnbarMeh Enterprise Central Linux Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=$(which node) ${APP_DIR}/dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${PORT}

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME}
    systemctl restart ${SERVICE_NAME}

    echo -e "${GREEN}✓ Service ${SERVICE_NAME} created and started! Auto-starts on Linux boot.${NC}"
}

show_completion_info() {
    get_local_ip
    echo ""
    echo -e "${GREEN}${BOLD}==============================================================================${NC}"
    echo -e "${GREEN}${BOLD}   ✓ INSTALLATION COMPLETED SUCCESSFULLY! SERVER IS ONLINE AND RUNNING!       ${NC}"
    echo -e "${GREEN}${BOLD}==============================================================================${NC}"
    echo ""
    echo -e "${BOLD}1. Web Browser Access (Any PC / Mobile on LAN):${NC}"
    echo -e "   ${CYAN}http://${LOCAL_IP}:${PORT}${NC}"
    echo -e "   ${CYAN}http://localhost:${PORT}${NC}"
    echo ""
    echo -e "${BOLD}2. Windows Desktop (.EXE / Setup) Connection:${NC}"
    echo -e "   In the AnbarMeh Windows desktop client app, configure Server URL as:"
    echo -e "   ${YELLOW}http://${LOCAL_IP}:${PORT}${NC}"
    echo ""
    echo -e "${BOLD}3. Systemd Service Management Commands:${NC}"
    echo -e "   - Check Status: ${CYAN}systemctl status ${SERVICE_NAME}${NC}"
    echo -e "   - Restart:      ${CYAN}systemctl restart ${SERVICE_NAME}${NC}"
    echo -e "   - Stop:         ${CYAN}systemctl stop ${SERVICE_NAME}${NC}"
    echo -e "   - View Logs:    ${CYAN}journalctl -u ${SERVICE_NAME} -f${NC}"
    echo ""
    echo -e "${BLUE}==============================================================================${NC}"
}

# Main Interactive CLI Menu
main_menu() {
    check_root
    while true; do
        print_header
        get_local_ip
        echo -e "Server IP on LAN: ${YELLOW}${LOCAL_IP}:${PORT}${NC}"
        echo ""
        echo "Please select an option:"
        echo -e "  ${BOLD}1)${NC} Full Automated Install & Start Service (نصب خودکار کامل سرور و راه‌اندازی)"
        echo -e "  ${BOLD}2)${NC} Check Service Status & Network (بررسی وضعیت سرویس و شبکه)"
        echo -e "  ${BOLD}3)${NC} Restart AnbarMeh Server (ری‌استارت سرور)"
        echo -e "  ${BOLD}4)${NC} View Live Server Logs (مشاهده لاگ‌های زنده سرور)"
        echo -e "  ${BOLD}5)${NC} Backup Database (تهیه نسخه پشتیبان از دیتابیس)"
        echo -e "  ${BOLD}6)${NC} Uninstall & Remove Service (حذف سرویس از سرور)"
        echo -e "  ${BOLD}0)${NC} Exit (خروج)"
        echo ""
        read -p "Enter choice [0-6]: " choice

        case $choice in
            1)
                install_dependencies
                setup_application
                configure_firewall
                create_systemd_service
                show_completion_info
                read -p "Press Enter to return to menu..."
                ;;
            2)
                systemctl status ${SERVICE_NAME} --no-pager || true
                read -p "Press Enter to return to menu..."
                ;;
            3)
                systemctl restart ${SERVICE_NAME}
                echo -e "${GREEN}Service restarted.${NC}"
                sleep 2
                ;;
            4)
                journalctl -u ${SERVICE_NAME} -f
                ;;
            5)
                BACKUP_FILE="/root/anbarmeh_backup_$(date +%Y%m%d_%H%M%S).json"
                if [ -f "${APP_DIR}/data/server_database.json" ]; then
                    cp "${APP_DIR}/data/server_database.json" "$BACKUP_FILE"
                    echo -e "${GREEN}Backup saved to $BACKUP_FILE${NC}"
                else
                    echo -e "${YELLOW}No database file found in ${APP_DIR}/data/${NC}"
                fi
                read -p "Press Enter to return to menu..."
                ;;
            6)
                systemctl stop ${SERVICE_NAME} || true
                systemctl disable ${SERVICE_NAME} || true
                rm -f /etc/systemd/system/${SERVICE_NAME}
                systemctl daemon-reload
                echo -e "${GREEN}Service uninstalled.${NC}"
                read -p "Press Enter to return to menu..."
                ;;
            0)
                echo "Exiting..."
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option!${NC}"
                sleep 1
                ;;
        esac
    done
}

if [ "$1" == "--install" ] || [ "$1" == "-i" ]; then
    check_root
    install_dependencies
    setup_application
    configure_firewall
    create_systemd_service
    show_completion_info
else
    main_menu
fi
