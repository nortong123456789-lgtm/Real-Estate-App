#!/bin/bash
# ==============================================================================
# ApnaGhar Real Estate Platform - 100% Automated EC2 Setup Script (From Scratch)
# Architecture: Zero AWS Storage (0 S3, 0 RDS) - Uses Telegram CDN & Channel Index
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS on AWS EC2
# ==============================================================================

set -e

echo "🚀 Starting ApnaGhar Automated EC2 Deployment from Scratch..."

# 1. Update System Packages & Prerequisites
echo "📦 [1/8] Updating system packages & installing build essentials..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget unzip build-essential nginx net-tools fuser

# 2. Configure 2GB Swap Memory (Prevents OOM Out-Of-Memory Kills on t2.micro)
echo "💾 [2/8] Setting up 2GB Swap space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "  -> 2GB Swap file active!"
fi

# 3. Install Official Docker & Docker Compose
echo "🐳 [3/8] Installing Docker Engine..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
fi
sudo systemctl enable docker
sudo systemctl start docker

# 4. Install Node.js 20 LTS & PM2
echo "🟢 [4/8] Installing Node.js 20 LTS & PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
sudo npm install -g pm2

# 5. Clone Repository
echo "📂 [5/8] Cloning ApnaGhar Repository..."
sudo chmod 755 /home/ubuntu
mkdir -p /home/ubuntu/RE-App
cd /home/ubuntu/RE-App

if [ -d "Real-Estate-App" ]; then
    echo "  -> Repository exists. Fetching latest code..."
    cd Real-Estate-App
    git reset --hard HEAD
    git pull origin main
else
    git clone https://github.com/nortong123456789-lgtm/Real-Estate-App.git Real-Estate-App
    cd Real-Estate-App
fi

# 6. Configure Backend (Zero AWS Storage - Uses Telegram Bot CDN)
echo "⚙️ [6/8] Building & Deploying FastAPI Backend Container..."
cd /home/ubuntu/RE-App/Real-Estate-App/backend

cat << 'EOF' > .env
TELEGRAM_BOT_TOKEN="8224116280:AAEN7GFksFsFXOHwLTmSuMMN3q-ChTaJdkQ"
TELEGRAM_CHAT_ID="-5471118807"
TELEGRAM_LOCAL_API_SERVER="https://api.telegram.org"
EOF

sudo docker compose up -d --build --force-recreate

# 7. Configure & Build Next.js Web Dashboard
echo "⚡ [7/8] Building Next.js Web Dashboard..."
cd /home/ubuntu/RE-App/Real-Estate-App/web
npm install
rm -rf .next
npm run build

pm2 delete all || true
pm2 start "npm start" --name "realestate-web" --cwd "/home/ubuntu/RE-App/Real-Estate-App/web"
pm2 save

# 8. Configure Nginx Reverse Proxy
echo "🌐 [8/8] Configuring Nginx Reverse Proxy..."
sudo chmod -R 755 /home/ubuntu/RE-App/Real-Estate-App/web

cat << 'EOF' | sudo tee /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    client_max_body_size 2000M;

    # Nginx direct static asset serving for Next.js
    location /_next/static/ {
        alias /home/ubuntu/RE-App/Real-Estate-App/web/.next/static/;
        expires 365d;
        access_log off;
    }

    # API Proxy to FastAPI backend (Port 8000)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web Proxy to Next.js (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "=============================================================================="
echo "🎉 DEPLOYMENT COMPLETE! ApnaGhar Platform is Live on EC2!"
echo "Architecture: Zero AWS Storage (0 S3, 0 RDS) - Uses Telegram CDN & Channel Index"
echo "Public Web Dashboard: http://$(curl -s http://checkip.amazonaws.com)"
echo "API Health Check:     http://$(curl -s http://checkip.amazonaws.com)/api/listings/health"
echo "=============================================================================="
