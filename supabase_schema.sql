-- TeleDrive Supabase PostgreSQL Database Schema
-- Run this SQL in your Supabase Project -> SQL Editor

-- 1. Create Settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Telegram Sessions table
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    session_string TEXT,
    user_info TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#4285f4',
    is_starred INTEGER DEFAULT 0,
    is_trash INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Files table
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
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

-- Enable Row Level Security (RLS) and allow public API access
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create open access policies for anon / service role
CREATE POLICY "Allow all operations for anon on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on telegram_sessions" ON public.telegram_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on files" ON public.files FOR ALL USING (true) WITH CHECK (true);

-- Insert Default Folders if they do not exist
INSERT INTO public.folders (id, name, color, parent_id)
VALUES 
  ('f-docs', 'Documents', '#4285f4', NULL),
  ('f-media', 'Media & Photos', '#34a853', NULL),
  ('f-tg-imports', 'Telegram Channel Imports', '#0088cc', NULL)
ON CONFLICT (id) DO NOTHING;
