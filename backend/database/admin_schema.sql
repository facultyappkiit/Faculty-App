-- Admin table for admin panel authentication
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'manager' CHECK (role IN ('super_admin', 'manager')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_admin_id ON admins(admin_id);

-- RLS Policies (drop first if exists, then create)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to admins" ON admins;
CREATE POLICY "Service role has full access to admins" ON admins
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE admins IS 'Admin users for the admin panel';
COMMENT ON COLUMN admins.admin_id IS 'Unique admin identifier for login';
COMMENT ON COLUMN admins.role IS 'super_admin has full access, manager has restricted access';
