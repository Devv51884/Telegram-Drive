# 🚀 TeleDrive Cloud

An open-source, unlimited cloud storage and media streaming drive powered by the **Telegram Cloud API**, **Supabase PostgreSQL**, and **React 18 + TailwindCSS / Lucide**.

---

## ✨ Features

- ♾️ **Unlimited Cloud Storage**: Store files, videos, documents, and photos securely on Telegram.
- ⚡ **Real-Time Video & Media Streaming**: Stream large 4K/1080p MP4/MKV videos with full HTTP Range request seeking without downloading the whole file first.
- 📄 **In-App Document Reader**:
  - **Word Documents (`.docx`, `.doc`)**: Live formatted Word document reader.
  - **PDF Documents (`.pdf`)**: In-app PDF viewer with full-tab reading mode.
  - **Code & Text (`.txt`, `.md`, `.json`, `.csv`, `.py`, `.js`, `.sql`)**: Formatted code view with line numbers and 1-click copy.
- 🔗 **Telegram Post Link Importer**: Import posts and media from your subscribed public and private Telegram channels directly into your personal drive.
- 🛡️ **Enterprise Security & Master Lock**:
  - Master PIN / Password Lock Screen with Scrypt password hashing & unique salts.
  - Signed HMAC-SHA256 stateless session tokens.
  - DDoS & brute-force rate limiters on all authentication and upload endpoints.
  - Helmet HTTP security headers & custom Content Security Policy (CSP).
  - Path traversal and XSS input sanitization.
- 🗄️ **Supabase Cloud Database**: High-performance PostgreSQL backend with real-time sync and SQLite local fallback.
- 📁 **Complete Drive File System**: Folders, Starred files, Trash lifecycle with restore/permanent delete, Move, Rename, and Search.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, Mammoth.js
- **Backend**: Node.js, Express, GramJS (MTProto Client), Axios, Helmet, Rate Limit
- **Database**: Supabase PostgreSQL / SQLite fallback

---

## 🚀 Quick Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/telegram-drive.git
cd telegram-drive
```

### 2. Install dependencies
```bash
npm run install:all
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials in `.env`:
- `BOT_TOKEN`: From [@BotFather](https://t.me/BotFather) on Telegram
- `STORAGE_CHAT_ID`: Your private Telegram channel or group ID
- `API_ID` & `API_HASH`: From [my.telegram.org](https://my.telegram.org)
- `SUPABASE_URL` & `SUPABASE_ANON_KEY`: From your Supabase Project Settings

### 4. Setup Supabase Database Schema
Go to your **Supabase Dashboard -> SQL Editor**, open `supabase_schema.sql` from this repository, and execute the SQL query to create the tables.

### 5. Build and Start the Application
```bash
# Build frontend
npm run build

# Start production server
npm start
```

Visit `http://localhost:5000` in your browser!

---

## 📄 License
MIT License. Free for personal and educational use.
