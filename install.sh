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
    echo -e "   ${GREEN}[1]${NC} نصب سامانه انبار‌مه (Fresh Installation)"
    echo -e "   ${GREEN}[2]${NC} بروزرسانی سامانه از گیت‌هاب (Update from GitHub)"
    echo -e "   ${GREEN}[3]${NC} حذف کامل سامانه (Uninstall System)"
    echo -e "   ${CYAN}[4]${NC} مشاهده وضعیت وب‌سرویس (Show Status)"
    echo -e "   ${CYAN}[5]${NC} راه‌اندازی مجدد سرویس (Restart Service)"
    echo -e "   ${CYAN}[6]${NC} توقف موقت سرویس (Stop Service)"
    echo -e "   ${CYAN}[7]${NC} ایجاد بکاپ امنیتی به صورت دستی (Manual Backup)"
    echo -e "   ${RED}[0]${NC} خروج از برنامه نصب (Exit)"
    echo -e "${CYAN}==================================================================${NC}"
}

check_node() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    return 0
}

# Fresh installation process
install_anbarpro() {
    echo -e "\n${YELLOW}🔄 شروع فرآیند نصب سامانه انبار‌مه...${NC}"
    
    # 1. Ask for destination directory
    read -p "📂 مسیر نصب برنامه را وارد کنید [Default: /usr/local/anbarpro]: " INSTALL_DIR
    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="/usr/local/anbarpro"
    fi
    
    echo -e "${CYAN}🚀 مسیر انتخابی شما: $INSTALL_DIR${NC}"
    
    # 2. Package installation based on OS
    echo -e "\n${YELLOW}📦 در حال بررسی و نصب ملزومات سیستم...${NC}"
    if [ -f /etc/debian_version ]; then
        apt-get update -y
        apt-get install -y git curl wget build-essential nginx certbot python3-certbot-nginx
        if ! check_node; then
            echo -e "${YELLOW}📥 نصب آخرین نسخه Node.js LTS...${NC}"
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        fi
    elif [ -f /etc/redhat-release ]; then
        yum install -y epel-release
        yum update -y
        yum install -y git curl wget gcc-c++ make nginx certbot python3-certbot-nginx
        if ! check_node; then
            echo -e "${YELLOW}📥 نصب آخرین نسخه Node.js LTS...${NC}"
            curl -sL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        fi
    fi
    
    # Check if node was installed successfully
    if ! check_node; then
        echo -e "${RED}❌ نصب Node.js با خطا مواجه شد. لطفاً ابتدا به صورت دستی نصب کنید.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Node.js: $(node -v) با موفقیت یافت شد.${NC}"
    
    # 3. Clone Repository
    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}⚠️ مسیر انتخابی قبلاً ایجاد شده است. در حال ایجاد کپی پشتیبان...${NC}"
        mv "$INSTALL_DIR" "${INSTALL_DIR}_backup_$(date +%Y%m%d%H%M%S)"
    fi
    
    echo -e "${YELLOW}📥 در حال کلون کردن کدهای انبار‌مه از گیت‌هاب...${NC}"
    git clone https://github.com/meh732/anbarpro.git "$INSTALL_DIR"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ خطایی در کلون کردن گیت‌هاب رخ داد. لطفاً اتصال اینترنت خود را بررسی کنید.${NC}"
        return 1
    fi
    
    cd "$INSTALL_DIR"
    
    # 4. Install NPM Dependencies
    echo -e "\n${YELLOW}⚙️ در حال نصب پکیج‌های NPM...${NC}"
    npm install --production=false
    
    # 5. Build
    echo -e "\n${YELLOW}📦 در حال کامپایل پروژه و ساخت خروجی...${NC}"
    npm run build
    
    # 6. Setup Systemd Service
    echo -e "\n${YELLOW}🛡️ در حال ثبت سرویس در سیستم‌عامل برای اجرای خودکار در پس‌زمینه...${NC}"
    
    cat > /etc/systemd/system/anbarpro.service <<EOF
[Unit]
Description=AnbarMeh Smart Enterprise ERP Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) dist/server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable anbarpro
    systemctl restart anbarpro
    
    # Get primary IP address
    SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
    
    echo -e "\n${GREEN}==================================================================${NC}"
    echo -e "${GREEN}🎉 سامانه مدیریت انبار و تولید انبار‌مه با موفقیت نصب و فعال شد!${NC}"
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "   🔹 مسیر فیزیکی: $INSTALL_DIR"
    echo -e "   🔹 وضعیت سرویس: فعال و در حال اجرا (Active)"
    echo -e "   🔹 آدرس ورود به سامانه: ${CYAN}http://$SERVER_IP:3000${NC}"
    echo -e "   🔹 توجه: دیتابیس به صورت کاملاً خام فعال شده و در اولین ورود"
    echo -e "      پنجره خوش‌آمدگویی برای ثبت برند و ادمین نمایش داده می‌شود."
    echo -e "${GREEN}==================================================================${NC}\n"
    
    read -p "برای بازگشت به منو دکمه اینتر را بزنید..." CONFIRM
}

# Update System
update_anbarpro() {
    echo -e "\n${YELLOW}🔄 بررسی مسیرهای سامانه...${NC}"
    INSTALL_DIR="/usr/local/anbarpro"
    if [ ! -d "$INSTALL_DIR" ]; then
        read -p "📂 مسیر پوشه نصب شده انبار‌مه را وارد کنید [/usr/local/anbarpro]: " INPUT_DIR
        if [ -n "$INPUT_DIR" ]; then
            INSTALL_DIR="$INPUT_DIR"
        fi
    fi
    
    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ پوشه برنامه یافت نشد! ابتدا گزینه ۱ را برای نصب انتخاب کنید.${NC}"
        sleep 2
        return 1
    fi
    
    cd "$INSTALL_DIR"
    echo -e "${YELLOW}📦 ایجاد بکاپ قبل از بروزرسانی...${NC}"
    if command -v tar &> /dev/null; then
        tar -czf backups/AnbarMeh_AutoBackup_PreUpdate_$(date +%Y%m%d%H%M%S).tar.gz --exclude='./node_modules' --exclude='./dist' .
        echo -e "${GREEN}✅ بکاپ با موفقیت در پوشه backups ذخیره شد.${NC}"
    fi
    
    echo -e "${YELLOW}📥 در حال دریافت آخرین کدهای سامانه از مخزن اصلی گیت‌هاب...${NC}"
    git fetch --all
    git reset --hard origin/main
    
    echo -e "${YELLOW}⚙️ بروزرسانی کتابخانه‌ها و کامپایل مجدد...${NC}"
    npm install --production=false
    npm run build
    
    echo -e "${YELLOW}🛡️ راه‌اندازی مجدد وب‌سرویس...${NC}"
    systemctl restart anbarpro
    
    echo -e "${GREEN}✅ بروزرسانی با موفقیت کامل شد! سامانه ریستارت گردید.${NC}"
    sleep 3
}

# Uninstall
uninstall_anbarpro() {
    echo -e "\n${RED}⚠️ هشدار: این کار تمامی داده‌ها و کدهای انبار‌مه را پاک خواهد کرد.${NC}"
    read -p "آیا از حذف کامل سیستم اطمینان دارید؟ (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
        echo -e "${YELLOW}🗑️ در حال متوقف کردن و حذف سرویس لینوکس...${NC}"
        systemctl stop anbarpro &> /dev/null
        systemctl disable anbarpro &> /dev/null
        rm -f /etc/systemd/system/anbarpro.service
        systemctl daemon-reload
        
        INSTALL_DIR="/usr/local/anbarpro"
        if [ -d "$INSTALL_DIR" ]; then
            echo -e "${YELLOW}🗑️ حذف پوشه فیزیکی کدهای برنامه...${NC}"
            rm -rf "$INSTALL_DIR"
        fi
        
        echo -e "${GREEN}✅ سامانه انبار‌مه به طور کامل از این سرور حذف شد.${NC}"
    else
        echo -e "${YELLOW}حذف لغو شد.${NC}"
    fi
    sleep 3
}

# Show status
show_status() {
    echo -e "\n${CYAN}📊 وضعیت کنونی سرویس انبار‌مه:${NC}"
    systemctl status anbarpro --no-pager
    echo ""
    read -p "برای بازگشت به منو دکمه اینتر را بزنید..." CONFIRM
}

# Restart Service
restart_service() {
    echo -e "\n${YELLOW}🔄 در حال راه‌اندازی مجدد سرویس انبار‌مه...${NC}"
    systemctl restart anbarpro
    echo -e "${GREEN}✅ سرویس با موفقیت ریستارت شد.${NC}"
    sleep 2
}

# Stop Service
stop_service() {
    echo -e "\n${YELLOW}🛑 در حال متوقف کردن سرویس انبار‌مه...${NC}"
    systemctl stop anbarpro
    echo -e "${GREEN}✅ سرویس متوقف گردید.${NC}"
    sleep 2
}

# Manual backup
manual_backup() {
    INSTALL_DIR="/usr/local/anbarpro"
    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}❌ پوشه برنامه یافت نشد!${NC}"
        sleep 2
        return 1
    fi
    cd "$INSTALL_DIR"
    mkdir -p backups
    BACKUP_FILE="backups/AnbarMeh_ManualBackup_$(date +%Y%m%d%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" --exclude='./node_modules' --exclude='./dist' .
    echo -e "${GREEN}✅ فایل پشتیبان فشرده با موفقیت ذخیره شد: $BACKUP_FILE${NC}"
    sleep 3
}

# Core menu loop
while true; do
    show_menu
    read -p "🔢 لطفاً یک گزینه انتخاب کنید [0-7]: " CHOICE
    case $CHOICE in
        1)
            install_anbarpro
            ;;
        2)
            update_anbarpro
            ;;
        3)
            uninstall_anbarpro
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
        0)
            echo -e "\n${GREEN}خداحافظ! خروج از برنامه نصب.${NC}\n"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ گزینه وارد شده نامعتبر است!${NC}"
            sleep 1.5
            ;;
    esac
done
