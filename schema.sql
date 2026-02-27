-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  avatar TEXT,
  phone TEXT,
  employee_id TEXT,
  ic_number TEXT,
  home_address TEXT,
  emergency_phone TEXT,
  typhoid_certificate_url TEXT,
  typhoid_expiry_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  date_str TEXT,
  time_str TEXT,
  location JSONB,
  photo_url TEXT,
  ai_verification TEXT,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Admin (Password: admin)
-- Use ON CONFLICT to prevent errors if already exists
INSERT INTO users (id, username, password, name, role, department, avatar, phone, employee_id, ic_number, home_address, emergency_phone)
VALUES (
  'admin-001', 
  'admin', 
  'admin', 
  'System Admin', 
  'ADMIN', 
  'Management', 
  'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
  '0000000000',
  'ADM-001',
  '000000-00-0000',
  'System HQ',
  '000'
) ON CONFLICT (username) DO NOTHING;