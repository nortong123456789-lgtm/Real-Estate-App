#!/bin/bash
# ==============================================================================
# ApnaGhar Real Estate Platform - 100% Automated EC2 Setup Script (Universal OS)
# Supports: Ubuntu (apt) & Amazon Linux 2023 / Amazon Linux 2 (dnf / yum)
# Architecture: Zero AWS Storage (0 S3, 0 RDS) - Uses Telegram CDN & Channel Index
# ==============================================================================

set -e

echo "🚀 Starting ApnaGhar Automated EC2 Deployment from Scratch..."

# Detect Linux OS Family & Package Manager
if command -v apt-get &> /dev/null; then
    OS_TYPE="ubuntu"
    PKG_MGR="apt"
    DEPLOY_USER="ubuntu"
    echo "  -> OS Detected: Ubuntu / Debian"
elif command -v dnf &> /dev/null; then
    OS_TYPE="amazon"
    PKG_MGR="dnf"
    DEPLOY_USER="ec2-user"
    echo "  -> OS Detected: Amazon Linux 2023 (dnf)"
elif command -v yum &> /dev/null; then
    OS_TYPE="amazon"
    PKG_MGR="yum"
    DEPLOY_USER="ec2-user"
    echo "  -> OS Detected: Amazon Linux 2 (yum)"
else
    echo "❌ Unsupported OS package manager. Please use Ubuntu or Amazon Linux."
    exit 1
fi

HOME_BASE="/home/$DEPLOY_USER"

# 1. Update System Packages & Prerequisites
echo "📦 [1/8] Updating system packages & installing build essentials..."
if [ "$OS_TYPE" = "ubuntu" ]; then
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl wget unzip build-essential nginx net-tools fuser
else
    sudo $PKG_MGR update -y --allowerasing --skip-broken || true
    sudo $PKG_MGR install -y --allowerasing --skip-broken git wget unzip gcc gcc-c++ make nginx || true
fi

# 2. Configure 2GB Swap Memory (Prevents OOM Out-Of-Memory Kills)
echo "💾 [2/8] Setting up 2GB Swap space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "  -> 2GB Swap file active!"
fi

# 3. Install Official Docker & Standalone Docker Compose Binary
echo "🐳 [3/8] Installing Docker Engine & Standalone Docker Compose..."
if ! command -v docker &> /dev/null; then
    if [ "$OS_TYPE" = "ubuntu" ]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
    else
        sudo $PKG_MGR install -y --allowerasing --skip-broken docker || true
    fi
fi

sudo usermod -aG docker $DEPLOY_USER || true
sudo systemctl enable docker
sudo systemctl start docker

# Install Standalone Docker Compose Binary and symlink to /usr/bin
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# 4. Install Node.js 20 LTS & PM2
echo "🟢 [4/8] Installing Node.js 20 LTS & PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - || curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    if [ "$OS_TYPE" = "ubuntu" ]; then
        sudo apt install -y nodejs
    else
        sudo $PKG_MGR install -y --allowerasing --skip-broken nodejs || true
    fi
fi
sudo npm install -g pm2

# 5. Clone Repository
echo "📂 [5/8] Cloning ApnaGhar Repository..."
sudo chmod 755 $HOME_BASE || true
mkdir -p $HOME_BASE/RE-App
cd $HOME_BASE/RE-App

if [ -d "Real-Estate-App" ]; then
    echo "  -> Repository exists. Fetching latest code..."
    cd Real-Estate-App
    git reset --hard HEAD
    git pull origin main
else
    git clone https://github.com/nortong123456789-lgtm/Real-Estate-App.git Real-Estate-App
    cd Real-Estate-App
fi

PROJECT_DIR="$HOME_BASE/RE-App/Real-Estate-App"

# 6. Configure Backend (Zero AWS Storage - Uses Telegram Bot CDN)
echo "⚙️ [6/8] Building & Deploying FastAPI Backend Container..."
cd $PROJECT_DIR/backend

cat << 'EOF' > .env
TELEGRAM_BOT_TOKEN="8224116280:AAEN7GFksFsFXOHwLTmSuMMN3q-ChTaJdkQ"
TELEGRAM_CHAT_ID="-5471118807"
TELEGRAM_LOCAL_API_SERVER="https://api.telegram.org"
EOF

sudo /usr/local/bin/docker-compose up -d --build --force-recreate

# 7. Configure & Build Next.js Web Dashboard
echo "⚡ [7/8] Building Next.js Web Dashboard..."
cd $PROJECT_DIR/web
npm install
rm -rf .next
npm run build

pm2 delete all || true
pm2 start "npm start" --name "realestate-web" --cwd "$PROJECT_DIR/web"
pm2 save

# 8. Configure Nginx Reverse Proxy
echo "🌐 [8/8] Configuring Nginx Reverse Proxy..."
sudo chmod -R 755 $PROJECT_DIR/web

cat << EOF | sudo tee /etc/nginx/conf.d/default.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    client_max_body_size 2000M;

    # Nginx direct static asset serving for Next.js
    location /_next/static/ {
        alias $PROJECT_DIR/web/.next/static/;
        expires 365d;
        access_log off;
    }

    # API Proxy to FastAPI backend (Port 8000)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Web Proxy to Next.js (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo systemctl enable nginx || true
sudo nginx -t || true
sudo systemctl start nginx || sudo systemctl restart nginx

echo ""
echo "=============================================================================="
echo "🎉 DEPLOYMENT COMPLETE! ApnaGhar Platform is Live on EC2!"
echo "Architecture: Zero AWS Storage (0 S3, 0 RDS) - Uses Telegram CDN & Channel Index"
echo "Public Web Dashboard: http://$(curl -s http://checkip.amazonaws.com)"
echo "API Health Check:     http://$(curl -s http://checkip.amazonaws.com)/api/listings/health"
echo "=============================================================================="
