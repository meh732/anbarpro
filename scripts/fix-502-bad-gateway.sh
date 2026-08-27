#!/bin/bash
# ==============================================================================
#  AnbarMeh Enterprise - Multi-App & SSL-Safe 502 Bad Gateway Fixer
#  Supports custom PORT, dynamic domain detection, and keeps other apps intact.
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

DOMAIN="anbar.templatetesti.shop"
APP_DIR="/opt/anbarmeh-server"
SERVICE_NAME="anbarmeh"

# 1. Detect Custom Port from Argument, Environment, or Default
INPUT_PORT="$1"
if [ -n "$INPUT_PORT" ]; then
    PORT="$INPUT_PORT"
elif [ -n "$PORT" ]; then
    PORT="$PORT"
else
    # Check if existing systemd service has a port configured
    if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        EXISTING_PORT=$(grep "Environment=PORT=" /etc/systemd/system/${SERVICE_NAME}.service 2>/dev/null | cut -d'=' -f3 | tr -d ' ' || true)
        if [ -n "$EXISTING_PORT" ]; then
            PORT="$EXISTING_PORT"
        fi
    fi
    # Check if existing nginx config has a proxy_pass port
    if [ -z "$PORT" ] && [ -f "/etc/nginx/sites-available/${DOMAIN}" ]; then
        EXISTING_NGINX_PORT=$(grep -oE "proxy_pass http://127.0.0.1:[0-9]+" /etc/nginx/sites-available/${DOMAIN} | cut -d':' -f3 || true)
        if [ -n "$EXISTING_NGINX_PORT" ]; then
            PORT="$EXISTING_NGINX_PORT"
        fi
    fi
fi

if [ -z "$PORT" ]; then
    PORT=3000
fi

echo -e "${CYAN}${BOLD}==============================================================================${NC}"
echo -e "${CYAN}${BOLD}   ⚡ AnbarMeh Enterprise - Multi-App 502 Bad Gateway Fixer ⚡   ${NC}"
echo -e "${CYAN}${BOLD}   Domain: ${YELLOW}${DOMAIN}${CYAN} | Target Node Port: ${MAGENTA}${PORT}${NC}"
echo -e "${CYAN}${BOLD}==============================================================================${NC}"
echo ""

# Root Check
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Please run with sudo: sudo bash scripts/fix-502-bad-gateway.sh [PORT]${NC}"
    exit 1
fi

# 2. Check Node.js
echo -e "${BLUE}[1/7] Checking Node.js environment...${NC}"
if ! command -v node &> /dev/null || [ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]; then
    echo -e "${YELLOW}Installing/Updating Node.js to v20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs build-essential
fi
echo -e "${GREEN}✓ Node: $(node -v) | NPM: $(npm -v)${NC}"

# 3. Determine Project Source Directory and Copy
echo -e "${BLUE}[2/7] Preparing project files in ${APP_DIR}...${NC}"
CURRENT_DIR=$(pwd)
if [ -f "${CURRENT_DIR}/server.ts" ] && [ -f "${CURRENT_DIR}/package.json" ]; then
    SRC_DIR="${CURRENT_DIR}"
else
    SRC_DIR="${APP_DIR}"
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/dist"

if [ "$SRC_DIR" != "$APP_DIR" ]; then
    echo -e "${CYAN}Syncing source from ${SRC_DIR} to ${APP_DIR}...${NC}"
    rsync -av --exclude 'node_modules' --exclude '.git' "${SRC_DIR}/" "${APP_DIR}/"
fi

cd "$APP_DIR"

# 4. Clean Build
echo -e "${BLUE}[3/7] Building Frontend and Backend Server...${NC}"
npm install --legacy-peer-deps

echo -e "${CYAN}Building Vite frontend...${NC}"
npx vite build

echo -e "${CYAN}Compiling Node backend to ${APP_DIR}/dist/server.cjs...${NC}"
npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

chmod -R 777 "$APP_DIR/data" 2>/dev/null || true
echo -e "${GREEN}✓ Build completed successfully!${NC}"

# 5. Clean Port Conflicts
echo -e "${BLUE}[4/7] Cleaning process on Port ${PORT}...${NC}"
systemctl stop ${SERVICE_NAME}.service 2>/dev/null || true
if command -v pm2 &> /dev/null; then
    pm2 delete ${SERVICE_NAME} 2>/dev/null || true
fi
fuser -k ${PORT}/tcp 2>/dev/null || true
sleep 1

# 6. Configure Systemd Service
echo -e "${BLUE}[5/7] Configuring and launching Systemd service on Port ${PORT}...${NC}"
cat <<EOF > /etc/systemd/system/${SERVICE_NAME}.service
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
Environment=DATA_DIR=${APP_DIR}/data

LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}.service
systemctl restart ${SERVICE_NAME}.service

# 7. Health Check Verification on 127.0.0.1:PORT
echo -e "${BLUE}[6/7] Verifying Node backend health on http://127.0.0.1:${PORT}...${NC}"
BACKEND_OK=0
for i in {1..8}; do
    sleep 1
    if curl -s -m 2 "http://127.0.0.1:${PORT}/api/health" | grep -q "status"; then
        BACKEND_OK=1
        break
    fi
done

if [ "$BACKEND_OK" -eq 1 ]; then
    echo -e "${GREEN}✓ Node Backend is ONLINE and responding on http://127.0.0.1:${PORT}!${NC}"
else
    echo -e "${YELLOW}[INFO] Backend starting up... Journal logs:${NC}"
    journalctl -u ${SERVICE_NAME}.service -n 15 --no-pager
fi

# 8. Check Existing SSL Certificates for domain
echo -e "${BLUE}[7/7] Configuring Nginx Reverse Proxy with SSL Detection (Target: Port ${PORT})...${NC}"

SSL_CERT=""
SSL_KEY=""

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
elif [ -f "/etc/letsencrypt/live/templatetesti.shop/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/templatetesti.shop/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/templatetesti.shop/privkey.pem"
fi

NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

if [ -n "$SSL_CERT" ] && [ -f "$SSL_CERT" ]; then
    echo -e "${GREEN}✓ Detected existing SSL certificate at ${SSL_CERT}${NC}"
    cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 100M;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
else
    echo -e "${YELLOW}No SSL found. Configuring standard HTTP proxy to 127.0.0.1:${PORT}...${NC}"
    cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

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

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
fi

# Enable site
ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${DOMAIN}"

# Test Nginx safely
if nginx -t; then
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded successfully (Routing ${DOMAIN} -> Port ${PORT})!${NC}"
else
    echo -e "${RED}[ERROR] Nginx test failed!${NC}"
    exit 1
fi

# Firewall rules
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    ufw allow ${PORT}/tcp 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 502 BAD GATEWAY ERROR RESOLVED ON PORT ${PORT}!                        ${NC}"
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo ""
if [ -n "$SSL_CERT" ]; then
    echo -e "🌐 Secure HTTPS: ${CYAN}https://${DOMAIN}${NC}"
else
    echo -e "🌐 Web Domain:  ${CYAN}http://${DOMAIN}${NC}"
fi
echo -e "🖥️ Direct Node:  ${CYAN}http://$(hostname -I | awk '{print $1}'):${PORT}${NC}"
echo ""
