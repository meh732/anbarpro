#!/bin/bash
# One-Line Auto Installer for ElectroStock
# Usage: curl -sSL https://raw.githubusercontent.com/YOUR_REPO/deploy.sh | bash

set -e
echo "Starting ElectroStock Installation..."

# Install Dependencies
sudo apt-get update -y
sudo apt-get install -y curl git build-essential nginx

# Install Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2
sudo npm install -g pm2

# Clone or Update Repo
# Note: Users should replace this with their actual repo URL
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"
APP_DIR="/opt/electrostock"

if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd $APP_DIR
    git pull
else
    echo "Cloning repository..."
    sudo git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Build
sudo npm install
sudo npm run build

# Start App
pm2 stop electrostock || true
pm2 delete electrostock || true
pm2 start npm --name "electrostock" -- run start
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $HOME || true

# Setup NGINX to serve on port 80 (Direct IP/Domain access)
sudo bash -c 'cat > /etc/nginx/sites-available/electrostock <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF'

sudo ln -sf /etc/nginx/sites-available/electrostock /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo ""
echo "=========================================================="
echo " Installation Complete!"
echo " The system is now live on your server's IP address (Port 80)."
echo "=========================================================="
