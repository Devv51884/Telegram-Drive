#!/usr/bin/env bash
# ==============================================================================
# TeleDrive Automated VPS Deployment & Domain Setup Script
# Works on: Ubuntu 20.04+, Debian 11+, Debian 12+
# ==============================================================================

set -e

# Styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "    🚀 TeleDrive VPS Auto-Deployment & Domain Setup      "
echo "=========================================================="
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run this script as root (use sudo or root shell).${NC}"
  exit 1
fi

# Detect working directory
INSTALL_DIR="/var/www/telegram-drive"
CURRENT_DIR=$(pwd)

if [ -f "$CURRENT_DIR/server/index.js" ]; then
  APP_DIR="$CURRENT_DIR"
  echo -e "${GREEN}✓ Detected TeleDrive project in current directory: $APP_DIR${NC}"
else
  APP_DIR="$INSTALL_DIR"
  echo -e "${YELLOW}ℹ TeleDrive will be installed to: $APP_DIR${NC}"
fi

# 1. Update system packages
echo -e "\n${BLUE}==> [1/7] Updating system packages...${NC}"
apt-get update -y
apt-get install -y curl wget git ufw build-essential software-properties-common

# 2. Install Node.js 20 LTS & PM2
echo -e "\n${BLUE}==> [2/7] Checking & installing Node.js 20 LTS & PM2...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
  echo -e "${YELLOW}Installing Node.js 20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"
echo -e "${GREEN}✓ NPM version: $(npm -v)${NC}"

if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}Installing PM2 process manager...${NC}"
  npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 installed.${NC}"

# 3. Install Nginx and Certbot
echo -e "\n${BLUE}==> [3/7] Installing Nginx & Certbot for SSL...${NC}"
apt-get install -y nginx certbot python3-certbot-nginx

# 4. Clone or update repository
echo -e "\n${BLUE}==> [4/7] Setting up TeleDrive application...${NC}"
if [ "$APP_DIR" == "$INSTALL_DIR" ]; then
  if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "${YELLOW}Updating existing repository in $INSTALL_DIR...${NC}"
    cd "$INSTALL_DIR"
    git fetch origin main
    git reset --hard origin/main
  else
    echo -e "${YELLOW}Cloning repository to $INSTALL_DIR...${NC}"
    mkdir -p /var/www
    git clone https://github.com/Devv51884/Telegram-Drive.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi
else
  cd "$APP_DIR"
fi

# Install dependencies and build client
echo -e "\n${YELLOW}Installing Backend & Client dependencies...${NC}"
npm install --production=false
npm --prefix client install

echo -e "\n${YELLOW}Building Client production bundle...${NC}"
npm --prefix client run build

# 5. Environment configuration (.env)
echo -e "\n${BLUE}==> [5/7] Checking environment configuration (.env)...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f "$APP_DIR/.env.example" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  else
    touch "$APP_DIR/.env"
  fi
  echo -e "${YELLOW}⚠️  .env file created from .env.example.${NC}"
  echo -e "${CYAN}Please enter your credentials below (press Enter to skip if already set or configure later):${NC}"

  read -p "Enter Telegram BOT_TOKEN: " input_bot_token </dev/tty
  read -p "Enter Telegram STORAGE_CHAT_ID (e.g. -100xxxxxxx): " input_chat_id </dev/tty
  read -p "Enter Telegram API_ID: " input_api_id </dev/tty
  read -p "Enter Telegram API_HASH: " input_api_hash </dev/tty
  read -p "Enter Supabase URL (optional): " input_supabase_url </dev/tty
  read -p "Enter Supabase ANON_KEY (optional): " input_supabase_key </dev/tty
  read -p "Enter Brevo API Key for signup emails (optional): " input_brevo_key </dev/tty

  [ -n "$input_bot_token" ] && sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN=$input_bot_token|" "$APP_DIR/.env"
  [ -n "$input_chat_id" ] && sed -i "s|^STORAGE_CHAT_ID=.*|STORAGE_CHAT_ID=$input_chat_id|" "$APP_DIR/.env"
  [ -n "$input_api_id" ] && sed -i "s|^API_ID=.*|API_ID=$input_api_id|" "$APP_DIR/.env"
  [ -n "$input_api_hash" ] && sed -i "s|^API_HASH=.*|API_HASH=$input_api_hash|" "$APP_DIR/.env"
  [ -n "$input_supabase_url" ] && sed -i "s|^SUPABASE_URL=.*|SUPABASE_URL=$input_supabase_url|" "$APP_DIR/.env"
  [ -n "$input_supabase_key" ] && sed -i "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$input_supabase_key|" "$APP_DIR/.env"
  [ -n "$input_brevo_key" ] && sed -i "s|^BREVO_API_KEY=.*|BREVO_API_KEY=$input_brevo_key|" "$APP_DIR/.env"

  echo -e "${GREEN}✓ .env configuration updated.${NC}"
else
  echo -e "${GREEN}✓ Existing .env file found.${NC}"
fi

# Ensure PORT is 5000 in .env
if ! grep -q "^PORT=" "$APP_DIR/.env"; then
  echo "PORT=5000" >> "$APP_DIR/.env"
fi

# 6. PM2 Process Manager setup
echo -e "\n${BLUE}==> [6/7] Starting/Restarting application with PM2...${NC}"
cd "$APP_DIR"
pm2 delete teledrive 2>/dev/null || true
pm2 start server/index.js --name "teledrive" --time
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
echo -e "${GREEN}✓ TeleDrive backend process running with PM2.${NC}"

# 7. Domain & Nginx Reverse Proxy Setup
echo -e "\n${BLUE}==> [7/7] Nginx Reverse Proxy & Custom Domain Setup...${NC}"
echo -e "${CYAN}Enter your custom domain name (e.g. drive.yourdomain.com or yourdomain.com):${NC}"
read -p "Domain Name: " DOMAIN_NAME </dev/tty

if [ -z "$DOMAIN_NAME" ]; then
  DOMAIN_NAME="_"
  echo -e "${YELLOW}No domain entered, using default catch-all Nginx config on port 80.${NC}"
fi

NGINX_CONF="/etc/nginx/sites-available/telegram-drive"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Allow up to 2GB uploads for Telegram
    client_max_body_size 2048M;

    # Gzip settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Video streaming and long upload timeouts
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 3600s;
    }
}
EOF

sed -i "s|DOMAIN_PLACEHOLDER|$DOMAIN_NAME|" "$NGINX_CONF"

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/telegram-drive
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test & reload nginx
if nginx -t; then
  systemctl restart nginx
  echo -e "${GREEN}✓ Nginx configured and restarted successfully.${NC}"
else
  echo -e "${RED}❌ Nginx configuration test failed. Please check /etc/nginx/sites-available/telegram-drive${NC}"
fi

# Configure Firewall
if command -v ufw &> /dev/null; then
  ufw allow OpenSSH 2>/dev/null || true
  ufw allow 'Nginx Full' 2>/dev/null || ufw allow 80 2>/dev/null && ufw allow 443 2>/dev/null || true
fi

# 8. SSL Certificate Prompt
if [ "$DOMAIN_NAME" != "_" ]; then
  echo -e "\n${CYAN}=========================================================="
  echo "🔒 SSL / HTTPS Setup via Let's Encrypt (Certbot)"
  echo "==========================================================${NC}"
  echo -e "Make sure your domain (${BOLD}$DOMAIN_NAME${NC}) DNS 'A' record is pointing to this VPS IP."
  read -p "Do you want to generate a free SSL certificate right now? (y/n): " setup_ssl </dev/tty

  if [[ "$setup_ssl" =~ ^[Yy]$ ]]; then
    read -p "Enter your email address for SSL renewal notices: " SSL_EMAIL </dev/tty
    if [ -n "$SSL_EMAIL" ]; then
      certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect
    else
      certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --register-unsafely-without-email --redirect
    fi
    echo -e "${GREEN}✓ SSL certificate successfully configured!${NC}"
  else
    echo -e "${YELLOW}ℹ Skipping SSL setup. You can run it anytime with: certbot --nginx -d $DOMAIN_NAME${NC}"
  fi
fi

# Summary
PUBLIC_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

echo -e "\n${GREEN}${BOLD}=========================================================="
echo "🎉 TeleDrive Successfully Deployed!"
echo "==========================================================${NC}"
echo -e "📍 VPS Public IP: ${CYAN}$PUBLIC_IP${NC}"
if [ "$DOMAIN_NAME" != "_" ]; then
  echo -e "🌐 Site URL:      ${CYAN}https://$DOMAIN_NAME${NC} (or http://$DOMAIN_NAME)"
else
  echo -e "🌐 Site URL:      ${CYAN}http://$PUBLIC_IP${NC}"
fi
echo -e "⚙️  Project Dir:   ${CYAN}$APP_DIR${NC}"
echo -e "📄 PM2 Status:    ${CYAN}pm2 status${NC}"
echo -e "📜 View Logs:     ${CYAN}pm2 logs teledrive${NC}"
echo -e "🔄 Restart App:   ${CYAN}pm2 restart teledrive${NC}"
echo -e "✏️  Edit .env:     ${CYAN}nano $APP_DIR/.env && pm2 restart teledrive${NC}"
echo "=========================================================="
