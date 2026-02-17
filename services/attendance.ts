import { sql } from './db';
import { AttendanceRecord } from '../types';

// Map DB row to AttendanceRecord
const mapRecord = (row: any): AttendanceRecord => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userRole: row.user_role as any,
  type: row.type as 'CLOCK_IN' | 'CLOCK_OUT',
  timestamp: parseInt(row.timestamp),
  dateStr: row.date_str,
  timeStr: row.time_str,
  location: row.location, // JSONB comes back as object
  photoUrl: row.photo_url,
  aiVerification: row.ai_verification,
  synced: row.synced
});

export const getAttendanceRecords = async (userId?: string): Promise<AttendanceRecord[]> => {
  try {
    let rows;
    if (userId) {
      rows = await sql`SELECT * FROM attendance_records WHERE user_id = ${userId} ORDER BY timestamp DESC`;
    } else {
      rows = await sql`SELECT * FROM attendance_records ORDER BY timestamp DESC`;
    }
    return rows.map(mapRecord);
  } catch (error) {
    console.error("Failed to fetch attendance records:", error);
    return [];
  }
};

export const createAttendanceRecord = async (record: AttendanceRecord): Promise<void> => {
  try {
    await sql`
      INSERT INTO attendance_records (
        id, user_id, user_name, user_role, type, timestamp, 
        date_str, time_str, location, photo_url, ai_verification, synced
      ) VALUES (
        ${record.id}, ${record.userId}, ${record.userName}, ${record.userRole}, ${record.type}, 
        ${record.timestamp}, ${record.dateStr}, ${record.timeStr}, ${JSON.stringify(record.location)}, 
        ${record.photoUrl}, ${record.aiVerification}, ${true}
      )
    `;
  } catch (error) {
    console.error("Failed to create attendance record:", error);
    throw error;
  }
};