-- TeleDrive Supabase PostgreSQL Database Schema
-- Run this SQL in your Supabase Project -> SQL Editor

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Telegram Sessions table
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    session_string TEXT,
    user_info TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#4285f4',
    is_starred INTEGER DEFAULT 0,
    is_trash INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Files table
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    folder_id TEXT REFERENCES public.folders(id) ON DELETE SET NULL,
    size BIGINT DEFAULT 0,
    mime_type TEXT,
    type TEXT, -- video, image, pdf, audio, document, archive, other
    source_type TEXT DEFAULT 'upload', -- 'upload', 'telegram_post', 'demo'
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create open access policies for anon / service role
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on telegram_sessions" ON public.telegram_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on files" ON public.files FOR ALL USING (true) WITH CHECK (true);
