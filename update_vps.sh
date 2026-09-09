#!/usr/bin/env bash
# TeleDrive VPS Quick Update Script
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing backend & frontend dependencies..."
npm install --production=false
npm --prefix client install

echo "⚡ Building client..."
npm --prefix client run build

echo "🚀 Restarting PM2 process with updated environment..."
pm2 restart teledrive --update-env

echo "✅ TeleDrive updated and restarted successfully!"
