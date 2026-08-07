#!/usr/bin/env bash
# AnbarMeh Linux Prerequisites Downloader & Interactive Installer Entrypoint
# Language: English

# Beautiful colors for terminal output
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${YELLOW}       AnbarMeh Enterprise Deployment - Linux Setup System       ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Detect Linux Distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
else
    OS_ID="unknown"
fi

echo -e "\n🔍 Checking system prerequisites..."

# Function to check command existence
check_cmd() {
    command -v "$1" &> /dev/null
}

# Auto-install prerequisites based on OS family
install_prereqs() {
    echo -e "${YELLOW}📦 Downloading and configuring necessary prerequisites...${NC}"
    
    if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
        sudo apt-get update -y
        
        # Install Git & Curl
        if ! check_cmd git || ! check_cmd curl; then
            sudo apt-get install -y git curl
        fi
        
        # Install Node.js if missing
        if ! check_cmd node; then
            echo -e "${YELLOW}Node.js is missing. Setting up Node.js 18 LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        # Install Nginx & Certbot
        echo -e "${YELLOW}Installing Web Proxy (Nginx) & SSL engine (Certbot)...${NC}"
        sudo apt-get install -y nginx certbot python3-certbot-nginx
        
    elif [[ "$OS_ID" == "centos" || "$OS_ID" == "rhel" || "$OS_ID" == "fedora" ]]; then
        sudo yum update -y
        
        # Install Git & Curl
        if ! check_cmd git || ! check_cmd curl; then
            sudo yum install -y git curl
        fi
        
        # Install Node.js if missing
        if ! check_cmd node; then
            echo -e "${YELLOW}Node.js is missing. Installing Node.js LTS...${NC}"
            sudo curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
        fi
        
        # Install Nginx & Certbot
        echo -e "${YELLOW}Installing Web Proxy (Nginx) & Certbot...${NC}"
        sudo yum install -y epel-release
        sudo yum install -y nginx certbot python3-certbot-nginx
    else
        echo -e "${RED}⚠️ Unsupported or unknown Linux distribution ($OS_ID).${NC}"
        echo -e "Please ensure Git, Node.js v18+, NPM, and Nginx are installed manually."
    fi
}

# Run prerequisite checks
PREREQS_MET=true

if ! check_cmd git || ! check_cmd node || ! check_cmd npm || ! check_cmd nginx || ! check_cmd certbot; then
    PREREQS_MET=false
    echo -e "${YELLOW}Some prerequisites are missing. Initializing automatic installation...${NC}"
    install_prereqs
else
    echo -e "${GREEN}✅ All basic prerequisites (Git, Node.js, NPM, Nginx, Certbot) are already installed.${NC}"
fi

# Ensure interactive installer is fired up
if check_cmd node; then
    echo -e "${GREEN}🚀 Invoking Interactive English Deployment Menu...${NC}\n"
    node ./scripts/setup-menu.cjs
else
    echo -e "${RED}❌ Could not execute setup. Please install Node.js manually first.${NC}"
fi
