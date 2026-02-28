import { sql, isOffline } from './db';
import { AttendanceRecord } from '../types';
import { safeJSONParse } from '../src/utils/json';

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
  location: row.location,
  photoUrl: row.photo_url,
  aiVerification: row.ai_verification,
  synced: row.synced,
  otStatus: row.ot_status
});

export const getAttendanceRecords = async (userId?: string): Promise<AttendanceRecord[]> => {
  const fetchLocal = () => {
    const raw = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
    let records = raw.map(mapRecord);
    if (userId) {
      records = records.filter((r: AttendanceRecord) => r.userId === userId);
    }
    return records.sort((a: AttendanceRecord, b: AttendanceRecord) => b.timestamp - a.timestamp);
  };

  if (isOffline) {
    return fetchLocal();
  }

  try {
    let rows;
    if (userId) {
      rows = await sql`SELECT * FROM attendance_records WHERE user_id = ${userId} ORDER BY timestamp DESC`;
    } else {
      rows = await sql`SELECT * FROM attendance_records ORDER BY timestamp DESC`;
    }
    return rows.map(mapRecord);
  } catch (error) {
    console.error("Failed to fetch attendance records from SQL, falling back to local:", error);
    return fetchLocal();
  }
};

export const createAttendanceRecord = async (record: AttendanceRecord): Promise<void> => {
  const saveToLocal = () => {
    const records = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
    const dbRow = {
      id: record.id,
      user_id: record.userId,
      user_name: record.userName,
      user_role: record.userRole,
      type: record.type,
      timestamp: record.timestamp,
      date_str: record.dateStr,
      time_str: record.timeStr,
      location: record.location,
      photo_url: record.photoUrl,
      ai_verification: record.aiVerification,
      synced: false, // Mark as not synced if saved to local
      ot_status: record.otStatus
    };
    records.push(dbRow);
    localStorage.setItem('attendance_records', JSON.stringify(records));
  };

  if (isOffline) {
    saveToLocal();
    return;
  }

  try {
    await sql`
      INSERT INTO attendance_records (
        id, user_id, user_name, user_role, type, timestamp, 
        date_str, time_str, location, photo_url, ai_verification, synced, ot_status
      ) VALUES (
        ${record.id}, ${record.userId}, ${record.userName}, ${record.userRole}, ${record.type}, 
        ${record.timestamp}, ${record.dateStr}, ${record.timeStr}, ${JSON.stringify(record.location)}, 
        ${record.photoUrl ?? null}, ${record.aiVerification ?? null}, ${true}, ${record.otStatus ?? null}
      )
    `;
  } catch (error) {
    console.error("Failed to create attendance record in SQL, saving to local:", error);
    saveToLocal();
  }
};

export const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<void> => {
  const updateLocal = () => {
    const records = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
    const index = records.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      records[index] = {
        ...records[index],
        ot_status: updates.otStatus !== undefined ? updates.otStatus : records[index].ot_status
      };
      localStorage.setItem('attendance_records', JSON.stringify(records));
    }
  };

  if (isOffline) {
    updateLocal();
    return;
  }

  try {
    if (updates.otStatus !== undefined) {
      await sql`UPDATE attendance_records SET ot_status = ${updates.otStatus} WHERE id = ${id}`;
    }
  } catch (error) {
    console.error("Failed to update attendance record in SQL, updating local:", error);
    updateLocal();
  }
};