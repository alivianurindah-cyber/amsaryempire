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
  try {
    if (isOffline) {
      const raw = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
      let records = raw.map(mapRecord);
      
      if (userId) {
        records = records.filter((r: AttendanceRecord) => r.userId === userId);
      }
      // Sort desc
      return records.sort((a: AttendanceRecord, b: AttendanceRecord) => b.timestamp - a.timestamp);
    }

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
    if (isOffline) {
      const records = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
      // Store in snake_case to match DB format for consistency in mapRecord
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
        synced: true,
        ot_status: record.otStatus
      };
      records.push(dbRow);
      localStorage.setItem('attendance_records', JSON.stringify(records));
      return;
    }

    await sql`
      INSERT INTO attendance_records (
        id, user_id, user_name, user_role, type, timestamp, 
        date_str, time_str, location, photo_url, ai_verification, synced, ot_status
      ) VALUES (
        ${record.id}, ${record.userId}, ${record.userName}, ${record.userRole}, ${record.type}, 
        ${record.timestamp}, ${record.dateStr}, ${record.timeStr}, ${JSON.stringify(record.location)}, 
        ${record.photoUrl}, ${record.aiVerification}, ${true}, ${record.otStatus || null}
      )
    `;
  } catch (error) {
    console.error("Failed to create attendance record:", error);
    throw error;
  }
};

export const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<void> => {
  try {
    if (isOffline) {
      const records = safeJSONParse<any[]>(localStorage.getItem('attendance_records'), []);
      const index = records.findIndex((r: any) => r.id === id);
      if (index !== -1) {
        records[index] = {
          ...records[index],
          ot_status: updates.otStatus !== undefined ? updates.otStatus : records[index].ot_status
        };
        localStorage.setItem('attendance_records', JSON.stringify(records));
      }
      return;
    }

    if (updates.otStatus !== undefined) {
      await sql`UPDATE attendance_records SET ot_status = ${updates.otStatus} WHERE id = ${id}`;
    }
  } catch (error) {
    console.error("Failed to update attendance record:", error);
    throw error;
  }
};