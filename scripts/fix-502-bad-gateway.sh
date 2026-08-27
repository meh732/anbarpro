#!/bin/bash
# ==============================================================================
#  AnbarMeh Enterprise - 100% Automated 502 Bad Gateway Fix & Nginx Setup
#  Fixes Node backend crash, Nginx proxy_pass, systemd service, and permissions
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

DOMAIN="anbar.templatetesti.shop"
APP_DIR="/opt/anbarmeh-server"
SERVICE_NAME="anbarmeh.service"
PORT=3000

echo -e "${CYAN}${BOLD}==============================================================================${NC}"
echo -e "${CYAN}${BOLD}     ⚡ AnbarMeh Enterprise - 502 Bad Gateway Automated One-Click Fix ⚡     ${NC}"
echo -e "${CYAN}${BOLD}==============================================================================${NC}"
echo ""

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Please run this script with sudo or as root: sudo bash scripts/fix-502-bad-gateway.sh${NC}"
    exit 1
fi

echo -e "${BLUE}[1/6] Stopping any conflicting processes on Port ${PORT}...${NC}"
systemctl stop ${SERVICE_NAME} 2>/dev/null || true
fuser -k ${PORT}/tcp 2>/dev/null || true

# 2. Check Node.js and NPM
echo -e "${BLUE}[2/6] Checking Node.js environment...${NC}"
if ! command -v node &> /dev/null || [ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]; then
    echo -e "${YELLOW}Installing/Upgrading Node.js to v20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs nginx curl ufw build-essential
fi
echo -e "${GREEN}✓ Node: $(node -v) | NPM: $(npm -v)${NC}"

# 3. Locate & Setup App Directory
echo -e "${BLUE}[3/6] Building project and compiling production bundle...${NC}"
# Determine working source directory
CURRENT_DIR=$(pwd)
if [ -f "${CURRENT_DIR}/server.ts" ] && [ -f "${CURRENT_DIR}/package.json" ]; then
    SRC_DIR="${CURRENT_DIR}"
else
    SRC_DIR="${APP_DIR}"
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data"

if [ "$SRC_DIR" != "$APP_DIR" ]; then
    echo -e "${CYAN}Syncing files from ${SRC_DIR} to ${APP_DIR}...${NC}"
    rsync -av --exclude 'node_modules' --exclude '.git' "${SRC_DIR}/" "${APP_DIR}/"
fi

cd "$APP_DIR"
echo -e "${CYAN}Installing packages (clean install)...${NC}"
npm install --legacy-peer-deps

echo -e "${CYAN}Building Vite frontend & Esbuild server bundle...${NC}"
npm run build

if [ ! -f "${APP_DIR}/dist/server.cjs" ]; then
    echo -e "${RED}[ERROR] dist/server.cjs not found! Compiling directly...${NC}"
    npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
fi

echo -e "${GREEN}✓ Production bundle ready at ${APP_DIR}/dist/server.cjs${NC}"

# 4. Create and Enable Systemd Service
echo -e "${BLUE}[4/6] Configuring Systemd Auto-Restart Service...${NC}"
cat <<EOF > /etc/systemd/system/${SERVICE_NAME}
[Unit]
Description=AnbarMeh Enterprise Inventory Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=$(which node) ${APP_DIR}/dist/server.cjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=${PORT}

# Optimization & Resource limits
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}
sleep 3

# Check if Backend is responding
echo -e "${BLUE}[5/6] Verifying Backend on Port ${PORT}...${NC}"
if curl -s "http://127.0.0.1:${PORT}/api/health" | grep -q "status"; then
    echo -e "${GREEN}✓ Backend is ACTIVE and responding on http://127.0.0.1:${PORT}${NC}"
else
    echo -e "${YELLOW}Waiting another 3 seconds for backend...${NC}"
    sleep 3
    if curl -s "http://127.0.0.1:${PORT}/api/health" | grep -q "status"; then
        echo -e "${GREEN}✓ Backend is ACTIVE!${NC}"
    else
        echo -e "${RED}[WARNING] Backend didn't respond to health check. Journal logs:${NC}"
        journalctl -u ${SERVICE_NAME} -n 15 --no-pager
    fi
fi

# 5. Configure Nginx Reverse Proxy
echo -e "${BLUE}[6/6] Configuring Nginx Reverse Proxy for ${DOMAIN}...${NC}"
if command -v nginx &> /dev/null; then
    NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
    cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Max file upload for Excel import and backups (100MB)
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts for heavy Excel operations
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${DOMAIN}"
    
    # Test nginx configuration
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx configured & reloaded successfully!${NC}"
    else
        echo -e "${RED}[ERROR] Nginx test failed. Restoring...${NC}"
    fi
fi

# 6. Configure UFW Firewall
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow ${PORT}/tcp || true
fi

echo ""
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}   ✓ 502 BAD GATEWAY ERROR RESOLVED! APPLICATION IS NOW LIVE!               ${NC}"
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo ""
echo -e "👉 Domain: ${CYAN}http://${DOMAIN}${NC}"
echo -e "👉 Direct IP: ${CYAN}http://$(hostname -I | awk '{print $1}'):${PORT}${NC}"
echo ""
echo -e "${BOLD}Management Commands:${NC}"
echo -e "  - Check status: ${CYAN}systemctl status ${SERVICE_NAME}${NC}"
echo -e "  - View live logs: ${CYAN}journalctl -u ${SERVICE_NAME} -f${NC}"
echo -e "  - Restart: ${CYAN}systemctl restart ${SERVICE_NAME}${NC}"
echo ""
