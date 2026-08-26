-- ========================================================
-- TeleDrive Supabase PostgreSQL Database Schema & Migration
-- Run this SQL in your Supabase Project -> SQL Editor
-- ========================================================

-- 1. Create / Update Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    pin_hash TEXT,
    is_2fa_enabled INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrations for existing user tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_2fa_enabled INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create / Update Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create / Update Telegram Sessions Table
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    session_string TEXT,
    user_info TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.telegram_sessions ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.telegram_sessions ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.telegram_sessions ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.telegram_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 4. Create / Update Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#4285f4',
    is_starred INTEGER DEFAULT 0,
    is_trash INTEGER DEFAULT 0,
    share_access TEXT DEFAULT 'private',
    share_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS is_starred INTEGER DEFAULT 0;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS is_trash INTEGER DEFAULT 0;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS share_access TEXT DEFAULT 'private';
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS share_token TEXT;

-- 5. Create / Update Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    folder_id TEXT REFERENCES public.folders(id) ON DELETE SET NULL,
    size BIGINT DEFAULT 0,
    mime_type TEXT,
    type TEXT,
    source_type TEXT DEFAULT 'upload',
    telegram_file_id TEXT,
    telegram_message_id TEXT,
    telegram_channel_id TEXT,
    telegram_post_url TEXT,
    telegram_channel_title TEXT,
    telegram_access_hash TEXT,
    telegram_file_reference TEXT,
    thumbnail_url TEXT,
    is_starred INTEGER DEFAULT 0,
    is_trash INTEGER DEFAULT 0,
    share_access TEXT DEFAULT 'private',
    share_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.files ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'upload';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS telegram_channel_title TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_starred INTEGER DEFAULT 0;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_trash INTEGER DEFAULT 0;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS share_access TEXT DEFAULT 'private';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS share_token TEXT;

-- 6. Create / Update Item Permissions Table
CREATE TABLE IF NOT EXISTS public.item_permissions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    permission TEXT DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_item_shared_user UNIQUE (item_id, item_type, shared_with_email)
);

-- 7. Create / Update Share Requests Table
CREATE TABLE IF NOT EXISTS public.share_requests (
    id TEXT PRIMARY KEY,
    share_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    requester_email TEXT NOT NULL,
    requester_name TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create / Update Email OTPs / Verification Tokens Table
CREATE TABLE IF NOT EXISTS public.email_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    type TEXT DEFAULT 'signup_link',
    metadata TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- 10. Drop and Recreate Open Access Policies for Backend Service/Anon Key
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
    DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
    DROP POLICY IF EXISTS "Allow all operations on telegram_sessions" ON public.telegram_sessions;
    DROP POLICY IF EXISTS "Allow all operations on folders" ON public.folders;
    DROP POLICY IF EXISTS "Allow all operations on files" ON public.files;
    DROP POLICY IF EXISTS "Allow all operations on item_permissions" ON public.item_permissions;
    DROP POLICY IF EXISTS "Allow all operations on share_requests" ON public.share_requests;
    DROP POLICY IF EXISTS "Allow all operations on email_otps" ON public.email_otps;
END
$$;

CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on telegram_sessions" ON public.telegram_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on files" ON public.files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on item_permissions" ON public.item_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on share_requests" ON public.share_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on email_otps" ON public.email_otps FOR ALL USING (true) WITH CHECK (true);
