-- Faculty Substitute App - Supabase Schema
-- Run this in your Supabase SQL Editor

-- =============================================
-- OPTION 1: FRESH INSTALL (New Database)
-- Uncomment and run if starting fresh
-- =============================================

/*
-- Drop existing tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS substitute_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/

-- Users/Faculty table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE,  -- Links to Supabase Auth user ID
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),  -- Optional: only if not using Supabase Auth
    department VARCHAR(100),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    push_token VARCHAR(255),  -- Expo push notification token
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Substitute requests table
CREATE TABLE IF NOT EXISTS substitute_requests (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) DEFAULT 'class',
    subject VARCHAR(100),
    date DATE NOT NULL,
    time VARCHAR(20) NOT NULL,
    duration INTEGER NOT NULL,
    classroom VARCHAR(50),
    campus VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Weekly class schedule table (used for availability filtering)
CREATE TABLE IF NOT EXISTS teacher_class_schedules (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject VARCHAR(120),
    classroom VARCHAR(50),
    source_file VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CHECK (start_time < end_time)
);

-- =============================================
-- OPTION 2: MIGRATION (Existing Database)
-- Run this if you already have tables created
-- =============================================

-- Add new columns to existing users table (safe to run multiple times)
DO $$ 
BEGIN
    -- Add auth_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'auth_id') THEN
        ALTER TABLE users ADD COLUMN auth_id UUID UNIQUE;
    END IF;
    
    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add push_token column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'push_token') THEN
        ALTER TABLE users ADD COLUMN push_token VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'substitute_requests' AND column_name = 'request_type') THEN
        ALTER TABLE substitute_requests ADD COLUMN request_type VARCHAR(20) DEFAULT 'class';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'substitute_requests' AND column_name = 'campus') THEN
        ALTER TABLE substitute_requests ADD COLUMN campus VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'teacher_class_schedules'
    ) THEN
        CREATE TABLE teacher_class_schedules (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            subject VARCHAR(120),
            classroom VARCHAR(50),
            source_file VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            CHECK (start_time < end_time)
        );
    END IF;

    ALTER TABLE substitute_requests ALTER COLUMN subject DROP NOT NULL;
    ALTER TABLE substitute_requests ALTER COLUMN classroom DROP NOT NULL;

    UPDATE substitute_requests
    SET request_type = COALESCE(request_type, 'class')
    WHERE request_type IS NULL;

    -- Rename old schedule fk column if present.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'teacher_class_schedules' AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'teacher_class_schedules' AND column_name = 'teacher_id'
    ) THEN
        ALTER TABLE teacher_class_schedules RENAME COLUMN user_id TO teacher_id;
    END IF;
    
    -- Make password column nullable (Supabase Auth handles passwords now)
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

    -- Add substitute_request_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'teacher_class_schedules' AND column_name = 'substitute_request_id') THEN
        ALTER TABLE teacher_class_schedules ADD COLUMN substitute_request_id INTEGER REFERENCES substitute_requests(id) ON DELETE CASCADE;
    END IF;

    -- Add subject column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'teacher_class_schedules' AND column_name = 'subject') THEN
        ALTER TABLE teacher_class_schedules ADD COLUMN subject VARCHAR(120);
    END IF;

    -- Add classroom column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'teacher_class_schedules' AND column_name = 'classroom') THEN
        ALTER TABLE teacher_class_schedules ADD COLUMN classroom VARCHAR(50);
    END IF;
EXCEPTION
    WHEN others THEN
        -- Ignore errors (column might already be nullable)
        NULL;
END $$;

-- =============================================
-- INDEXES (Run for both options)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token);
CREATE INDEX IF NOT EXISTS idx_requests_status ON substitute_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_teacher ON substitute_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_requests_date ON substitute_requests(date);
CREATE INDEX IF NOT EXISTS idx_teacher_schedule_teacher ON teacher_class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_schedule_day ON teacher_class_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_teacher_schedule_window ON teacher_class_schedules(start_time, end_time);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on substitute_requests" ON substitute_requests;
DROP POLICY IF EXISTS "Allow all operations on teacher_class_schedules" ON teacher_class_schedules;

-- Create policies for access
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on substitute_requests" ON substitute_requests
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on teacher_class_schedules" ON teacher_class_schedules
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGER FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_substitute_requests_updated_at ON substitute_requests;
CREATE TRIGGER update_substitute_requests_updated_at
    BEFORE UPDATE ON substitute_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_class_schedules_updated_at ON teacher_class_schedules;
CREATE TRIGGER update_teacher_class_schedules_updated_at
    BEFORE UPDATE ON teacher_class_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PENDING INVITES TABLE
-- =============================================

-- Stores invited users before they complete registration
CREATE TABLE IF NOT EXISTS pending_invites (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    phone VARCHAR(20),
    invite_token VARCHAR(255) UNIQUE NOT NULL,
    invited_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '7 days')
);

-- Indexes for pending_invites
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_token ON pending_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_pending_invites_status ON pending_invites(status);

-- RLS for pending_invites
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on pending_invites" ON pending_invites;
CREATE POLICY "Allow all operations on pending_invites" ON pending_invites
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SUPABASE AUTH EMAIL CONFIGURATION
-- =============================================
-- To enable email verification:
-- 1. Go to Authentication > Providers > Enable Email
-- 2. Go to Authentication > URL Configuration
-- 3. Set your Site URL (e.g., http://localhost:3000)
-- 4. For production: Configure SMTP in Project Settings
-- =============================================
