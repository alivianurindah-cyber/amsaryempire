import { sql, isTrulyOnline } from './db';
import { safeJSONParse } from '../src/utils/json';

export const initDB = async () => {
  try {
    console.log("Initializing database schema...");

    if (!isTrulyOnline()) {
      console.log("System in Offline/Error Mode: Checking LocalStorage schema...");
      
      let users = safeJSONParse<any[]>(localStorage.getItem('users'), []);
      
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
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_type TEXT`;
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

    // Add new columns to attendance_records if they don't exist
    try {
        await sql`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS ot_status TEXT`;
    } catch (e) {
        console.log("Migration note: Columns might already exist or error adding them:", e);
    }

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

export const migrateFromLocalToSQL = async () => {
  if (!isTrulyOnline()) {
    console.log("Cannot migrate to SQL while in offline/error mode.");
    return false;
  }

  try {
    console.log("Starting migration from LocalStorage to SQL...");
    
    // Migrate Users
    const localUsers = safeJSONParse<any[]>(localStorage.getItem('users'), []);
    for (const u of localUsers) {
      const [exists] = await sql`SELECT 1 FROM users WHERE id = ${u.id} OR username = ${u.username}`;
      if (!exists) {
        await sql`
          INSERT INTO users (id, username, password, name, role, department, avatar, phone, employee_id, ic_number, home_address, emergency_phone, typhoid_certificate_url, typhoid_expiry_date, typhoid_verification_status, typhoid_verification_details, shift_start, shift_end, base_salary, salary_type)
          VALUES (${u.id}, ${u.username}, ${u.password}, ${u.name}, ${u.role}, ${u.department}, ${u.avatar}, ${u.phone || null}, ${u.employeeId || u.employee_id || null}, ${u.icNumber || u.ic_number || null}, ${u.homeAddress || u.home_address || null}, ${u.emergencyPhone || u.emergency_phone || null}, ${u.typhoidCertificateUrl || u.typhoid_certificate_url || null}, ${u.typhoidExpiryDate || u.typhoid_expiry_date || null}, ${u.typhoidVerificationStatus || u.typhoid_verification_status || null}, ${u.typhoidVerificationDetails || u.typhoid_verification_details || null}, ${u.shiftStart || u.shift_start || null}, ${u.shiftEnd || u.shift_end || null}, ${u.baseSalary || u.base_salary || null}, ${u.salaryType || u.salary_type || null})
        `;
      }
    }

    // Migrate Attendance Records
    const localRecords = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
    for (const r of localRecords) {
      const [exists] = await sql`SELECT 1 FROM attendance_records WHERE id = ${r.id}`;
      if (!exists) {
        await sql`
          INSERT INTO attendance_records (id, user_id, user_name, user_role, type, timestamp, date_str, time_str, location, photo_url, ai_verification, synced, ot_status)
          VALUES (${r.id}, ${r.userId || r.user_id}, ${r.userName || r.user_name}, ${r.userRole || r.user_role}, ${r.type}, ${r.timestamp}, ${r.dateStr || r.date_str}, ${r.timeStr || r.time_str}, ${r.location ? JSON.stringify(r.location) : null}, ${r.photoUrl || r.photo_url || null}, ${r.aiVerification || r.ai_verification || null}, true, ${r.otStatus || r.ot_status || null})
        `;
      }
    }

    // Migrate Music Tracks
    const localTracks = safeJSONParse<any[]>(localStorage.getItem('music_tracks'), []);
    for (const t of localTracks) {
      const [exists] = await sql`SELECT 1 FROM music_tracks WHERE id = ${t.id}`;
      if (!exists) {
        await sql`
          INSERT INTO music_tracks (id, title, artist, url, lyrics, created_at)
          VALUES (${t.id}, ${t.title}, ${t.artist}, ${t.url}, ${t.lyrics || null}, ${t.createdAt || t.created_at || Date.now()})
        `;
      }
    }

    console.log("Migration completed successfully.");
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
};