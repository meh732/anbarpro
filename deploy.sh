#!/bin/bash
# AnbarMeh Enterprise - Deployment Script for Linux
# This script installs Node.js, PM2, and sets up the application to run automatically.

echo "========================================================="
echo "   AnbarMeh Enterprise - Web Server Installation Script  "
echo "========================================================="

# Stop on first error
set -e

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
# If this is run via curl, we'd clone the repo here. For now, assuming we're in the directory.
APP_DIR=$(pwd)
echo "=> Application directory: $APP_DIR"

# Install dependencies
echo "=> Installing project dependencies..."
npm install

# Build the application
echo "=> Building the application..."
npm run build

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
pm2 start npm --name "anbarmeh-app" -- run start

# Setup PM2 startup script
echo "=> Configuring PM2 to start on boot..."
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $HOME || true

echo "========================================================="
echo "   Installation Completed Successfully!"
echo "   Application is running on port 3000."
echo "   Access it via: http://YOUR_SERVER_IP:3000"
echo "========================================================="
