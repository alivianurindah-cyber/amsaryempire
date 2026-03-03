import { sql, isOffline } from './db';
import { AttendanceNote } from '../types';

export const getAttendanceNotes = async (dateStr: string): Promise<AttendanceNote[]> => {
  if (isOffline) {
    const allNotes = JSON.parse(localStorage.getItem('attendance_notes') || '[]');
    return allNotes.filter((n: AttendanceNote) => n.dateStr === dateStr);
  }

  try {
    const rows = await sql`SELECT * FROM attendance_notes WHERE date_str = ${dateStr}`;
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      dateStr: row.date_str,
      note: row.note,
      updatedAt: Number(row.updated_at)
    }));
  } catch (error) {
    console.error("Failed to fetch attendance notes:", error);
    return [];
  }
};

export const getAttendanceNotesByUser = async (userId: string): Promise<AttendanceNote[]> => {
  if (isOffline) {
    const allNotes = JSON.parse(localStorage.getItem('attendance_notes') || '[]');
    return allNotes.filter((n: AttendanceNote) => n.userId === userId);
  }

  try {
    const rows = await sql`SELECT * FROM attendance_notes WHERE user_id = ${userId}`;
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      dateStr: row.date_str,
      note: row.note,
      updatedAt: Number(row.updated_at)
    }));
  } catch (error) {
    console.error("Failed to fetch attendance notes by user:", error);
    return [];
  }
};

export const saveAttendanceNote = async (note: AttendanceNote): Promise<boolean> => {
  if (isOffline) {
    const notes = JSON.parse(localStorage.getItem('attendance_notes') || '[]');
    const existingIndex = notes.findIndex((n: AttendanceNote) => n.userId === note.userId && n.dateStr === note.dateStr);
    
    if (existingIndex !== -1) {
      notes[existingIndex] = note;
    } else {
      notes.push(note);
    }
    
    localStorage.setItem('attendance_notes', JSON.stringify(notes));
    return true;
  }

  try {
    await sql`
      INSERT INTO attendance_notes (id, user_id, date_str, note, updated_at)
      VALUES (${note.id}, ${note.userId}, ${note.dateStr}, ${note.note}, ${note.updatedAt})
      ON CONFLICT (user_id, date_str) 
      DO UPDATE SET note = EXCLUDED.note, updated_at = EXCLUDED.updated_at
    `;
    return true;
  } catch (error) {
    console.error("Failed to save attendance note:", error);
    return false;
  }
};
