#!/bin/bash
# AnbarMeh Enterprise - Deployment Script for Linux
# This script installs Node.js, PM2, and sets up the application to run automatically.

echo "========================================================="
echo "   AnbarMeh Enterprise - Web Server Installation Script  "
echo "========================================================="

# Stop on first error
set -e

# Setup SWAP space to prevent low-RAM Linux servers from hanging during build and package installation
setup_swap_if_needed() {
    echo "=> Checking SWAP configuration to prevent system freeze..."
    
    # Check current swap size
    local total_swap=0
    if [ -f /proc/swaps ]; then
        total_swap=$(free -m | grep -i swap | awk '{print $2}')
    fi
    total_swap=${total_swap:-0}
    
    if [ "$total_swap" -gt 500 ]; then
        echo "=> SWAP space is already configured ($total_swap MB)."
        return 0
    fi
    
    echo "=> Insufficient SWAP space detected ($total_swap MB)."
    echo "=> Automatically configuring a 2GB swap file at /swapfile to ensure stable build..."
    
    # Verify free disk space
    local free_disk=$(df -m / | awk 'NR==2 {print $4}')
    if [ "$free_disk" -lt 3000 ]; then
        echo "=> Disk space is very low ($free_disk MB). Skipping swap creation."
        return 0
    fi
    
    # Disable swap if exists
    sudo swapoff /swapfile 2>/dev/null || true
    sudo rm -f /swapfile
    
    # Create swap file
    if command -v fallocate &> /dev/null; then
        sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null
    else
        sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null
    fi
    
    if [ -f /swapfile ]; then
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile >/dev/null
        sudo swapon /swapfile >/dev/null
        
        # Add to fstab if not present
        if ! grep -q "/swapfile" /etc/fstab; then
            echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab >/dev/null
        fi
        
        local new_swap=$(free -m | grep -i swap | awk '{print $2}')
        echo "=> 2GB SWAP space successfully created and enabled (New swap size: $new_swap MB)."
    else
        echo "=> Failed to create swap file."
    fi
}

# Update system
echo "=> Updating system packages..."
sudo apt-get update -y

# Install Node.js if not installed
if ! command -v node &> /dev/null
then
    echo "=> Installing Node.js (v20)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "=> Node.js is already installed."
fi

# Ensure git is installed
if ! command -v git &> /dev/null
then
    echo "=> Installing Git..."
    sudo apt-get install -y git
fi

# Move to the app directory (assuming we run this script from inside the repo, or we clone it)
if [ ! -f "package.json" ]; then
    echo "=> package.json not found in current directory. Cloning repository from GitHub..."
    if [ -d "anbarpro" ]; then
        echo "=> Existing directory 'anbarpro' found. Navigating into it..."
        cd "anbarpro"
    else
        git clone https://github.com/meh732/anbarpro.git
        cd "anbarpro"
    fi
fi

APP_DIR=$(pwd)
echo "=> Application directory: $APP_DIR"

# Ensure swap is setup to avoid freeze during build/npm install
setup_swap_if_needed

# Configure fast NPM mirror and timeout settings
npm config set registry https://registry.npmmirror.com/ 2>/dev/null || true
npm config set fetch-retries 5 2>/dev/null || true
npm config set fetch-retry-mintimeout 15000 2>/dev/null || true

# Install dependencies
echo "=> Installing project dependencies (using high-speed mirror)..."
npm install --legacy-peer-deps

# Build the application
echo "=> Building the application..."
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Install PM2 globally
if ! command -v pm2 &> /dev/null
then
    echo "=> Installing PM2 for process management..."
    sudo npm install -g pm2
fi

# Stop existing PM2 process if any
pm2 stop anbarmeh-app 2>/dev/null || true
pm2 delete anbarmeh-app 2>/dev/null || true

# Start the application
echo "=> Starting application with PM2..."
pm2 start "node dist/server.cjs" --name "anbarmeh-app" || pm2 restart anbarmeh-app

# Setup PM2 startup script
echo "=> Configuring PM2 to start on boot..."
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $HOME || true

echo "========================================================="
echo "   Installation Completed Successfully!"
echo "   Application is running on port 3000."
echo "   Access it via: http://YOUR_SERVER_IP:3000"
echo "========================================================="
