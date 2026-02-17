import { sql, isOffline } from './db';

export const initDB = async () => {
  try {
    console.log("Initializing database schema...");

    if (isOffline) {
      console.log("System in Offline Mode: Checking LocalStorage schema...");
      
      // Initialize Users Table in LocalStorage
      if (!localStorage.getItem('users')) {
        console.log("Creating local 'users' table");
        localStorage.setItem('users', JSON.stringify([]));
      }

      // Initialize Attendance Table in LocalStorage
      if (!localStorage.getItem('attendance_records')) {
        console.log("Creating local 'attendance_records' table");
        localStorage.setItem('attendance_records', JSON.stringify([]));
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
    
    console.log("Database schema confirmed.");
    return true;
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    return false;
  }
};