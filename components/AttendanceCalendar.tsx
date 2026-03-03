import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, X, Save } from 'lucide-react';
import { AttendanceRecord, AttendanceNote } from '../types';
import { clsx } from 'clsx';
import { getAttendanceNotesByUser, saveAttendanceNote } from '../services/notes';
import { Button } from './Button';

interface AttendanceCalendarProps {
  userId: string;
  records: AttendanceRecord[];
  isAdmin?: boolean;
  onUpdateRecord?: (record: AttendanceRecord) => void;
}

interface DayStatus {
  hasRecord: boolean;
  isLate: boolean;
  clockIn?: string;
  clockOut?: string;
  clockInRecord?: AttendanceRecord;
  clockOutRecord?: AttendanceRecord;
  isToday: boolean;
  note?: string;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ userId, records, isAdmin, onUpdateRecord }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState<AttendanceNote[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      getAttendanceNotesByUser(userId).then(setNotes);
    }
  }, [userId]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthData = useMemo(() => {
    const map = new Map<string, DayStatus>();
    const todayStr = new Date().toLocaleDateString();

    const recordsByDate: Record<string, AttendanceRecord[]> = {};
    records.forEach(r => {
      if (!recordsByDate[r.dateStr]) {
        recordsByDate[r.dateStr] = [];
      }
      recordsByDate[r.dateStr].push(r);
    });

    const notesByDate: Record<string, string> = {};
    notes.forEach(n => {
      notesByDate[n.dateStr] = n.note;
    });

    Object.keys(recordsByDate).forEach(dateStr => {
      const dayRecords = recordsByDate[dateStr];
      dayRecords.sort((a, b) => a.timestamp - b.timestamp);

      const clockInRecord = dayRecords.find(r => r.type === 'CLOCK_IN');
      const clockOutRecord = dayRecords.slice().reverse().find(r => r.type === 'CLOCK_OUT');

      let isLate = false;
      if (clockInRecord) {
        const date = new Date(clockInRecord.timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        
        if (hours > 14 || (hours === 14 && minutes > 0)) {
          isLate = true;
        }
      }

      map.set(dateStr, {
        hasRecord: true,
        isLate,
        clockIn: clockInRecord?.timeStr,
        clockOut: clockOutRecord?.timeStr,
        clockInRecord,
        clockOutRecord,
        isToday: dateStr === todayStr,
        note: notesByDate[dateStr]
      });
    });

    // Also add days that only have notes
    Object.keys(notesByDate).forEach(dateStr => {
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          hasRecord: false,
          isLate: false,
          isToday: dateStr === todayStr,
          note: notesByDate[dateStr]
        });
      }
    });

    return map;
  }, [records, notes]);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 sm:h-24 bg-slate-50/50 border-b border-r border-slate-100"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = date.toLocaleDateString();
      const status = monthData.get(dateStr);
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      days.push(
        <div 
          key={day} 
          className={clsx(
            "h-20 sm:h-24 border-b border-r border-slate-100 p-1 relative flex flex-col transition-colors",
            status?.isToday ? "bg-blue-50/30" : "bg-white",
            isWeekend && "bg-slate-50/30"
          )}
        >
          <span className={clsx(
            "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1",
            status?.isToday ? "bg-brand-600 text-white" : "text-slate-400"
          )}>
            {day}
          </span>

          {status?.hasRecord ? (
            <div className={clsx(
              "flex-1 rounded-md p-1 flex flex-col justify-center gap-0.5 border overflow-hidden",
              status.isLate 
                ? "bg-red-50 border-red-100" 
                : "bg-green-50 border-green-100"
            )}>
              <div className="flex items-center gap-1">
                <div className={clsx(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  status.isLate ? "bg-red-500" : "bg-green-500"
                )}></div>
                <span className={clsx(
                  "text-[8px] sm:text-[10px] font-bold uppercase truncate",
                  status.isLate ? "text-red-700" : "text-green-700"
                )}>
                  {status.isLate ? 'Late' : 'OK'}
                </span>
              </div>
              
              <div className="text-[8px] sm:text-[9px] text-slate-500 leading-tight">
                <div className="flex justify-between">
                  <span>In</span>
                  <span className="font-mono text-slate-700">{status.clockIn || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Out</span>
                  <span className="font-mono text-slate-700">{status.clockOut || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
             <div className="flex-1"></div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
       <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Attendance Calendar</h2>
          <p className="text-slate-500 text-sm">Shift: 2:00 PM - 8:00 PM</p>
       </div>

       <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
          {/* Calendar Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
             {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
               <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 {day}
               </div>
             ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
             {renderCalendar()}
          </div>
          
          {/* Legend */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-4 text-xs text-slate-600 justify-center">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>On Time</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Late ({'>'} 2 PM)</span>
             </div>
          </div>
       </div>
    </div>
  );
};