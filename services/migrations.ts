import { sql, isOffline } from './db';
import { safeJSONParse } from '../src/utils/json';

export const initDB = async () => {
  try {
    console.log("Initializing database schema...");

    if (isOffline) {
      console.log("System in Offline Mode: Checking LocalStorage schema...");
      
      let users = safeJSONParse(localStorage.getItem('users'), []);
      
      // Initialize Users Table in LocalStorage
      if (!localStorage.getItem('users')) {
        console.log("Creating local 'users' table");
        localStorage.setItem('users', JSON.stringify([]));
        users = [];
      }

      // Initialize Attendance Table in LocalStorage
      if (!localStorage.getItem('attendance_records')) {
        console.log("Creating local 'attendance_records' table");
        localStorage.setItem('attendance_records', JSON.stringify([]));
      }

      // Initialize Music Tracks Table in LocalStorage
      if (!localStorage.getItem('music_tracks')) {
        console.log("Creating local 'music_tracks' table");
        localStorage.setItem('music_tracks', JSON.stringify([]));
      }

      // Check/Create Default Admin for Offline Mode
      if (!users.find((u: any) => u.username === 'admin')) {
         console.log("Creating default admin user (Offline)...");
         users.push({
            id: 'admin-001',
            username: 'admin',
            password: 'admin',
            name: 'System Admin',
            role: 'ADMIN',
            department: 'Management',
            avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
            phone: '0000000000',
            employee_id: 'ADM-001',
            ic_number: '000000-00-0000',
            home_address: 'System HQ',
            emergency_phone: '000',
            created_at: new Date().toISOString()
         });
         localStorage.setItem('users', JSON.stringify(users));
      }

      return true;
    }

    // SQL Mode: Create Users Table
    await sql`
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Add new columns if they don't exist
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS typhoid_certificate_url TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS typhoid_expiry_date TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS typhoid_verification_status TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS typhoid_verification_details TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_start TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_end TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary NUMERIC`;
    } catch (e) {
        console.log("Migration note: Columns might already exist or error adding them:", e);
    }

    // SQL Mode: Create Attendance Records Table
    await sql`
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
    `;

    // SQL Mode: Create Music Tracks Table
    await sql`
      CREATE TABLE IF NOT EXISTS music_tracks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        url TEXT NOT NULL,
        lyrics TEXT,
        created_at BIGINT NOT NULL
      );
    `;
    
    // Check/Create Default Admin for SQL Mode
    // We check existence first to avoid unique constraint errors without relying on ON CONFLICT syntax availability
    const [adminExists] = await sql`SELECT 1 FROM users WHERE username = 'admin' LIMIT 1`;
    
    if (!adminExists) {
      console.log("Inserting default admin user...");
      await sql`
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
        )
      `;
    }
    
    console.log("Database schema confirmed.");
    return true;
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    return false;
  }
};