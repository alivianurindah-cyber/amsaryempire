import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Save, FileText } from 'lucide-react';
import { User, AttendanceRecord, LeaveRequest, AttendanceNote } from '../types';
import { getLeaveRequests, updateLeaveRequestStatus } from '../services/leave';
import { getAttendanceNotes, saveAttendanceNote } from '../services/notes';
import { Button } from './Button';

interface AdminAttendanceProps {
  users: User[];
  records: AttendanceRecord[];
}

export const AdminAttendance: React.FC<AdminAttendanceProps> = ({ users, records }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    const requests = await getLeaveRequests();
    setLeaveRequests(requests);

    const dateStr = new Date(selectedDate).toLocaleDateString();
    const loadedNotes = await getAttendanceNotes(dateStr);
    const notesMap: Record<string, string> = {};
    loadedNotes.forEach(n => {
      notesMap[n.userId] = n.note;
    });
    setNotes(notesMap);
  };

  const handleUpdateLeaveStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const success = await updateLeaveRequestStatus(id, status);
    if (success) {
      setLeaveRequests(leaveRequests.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const handleSaveNote = async (userId: string) => {
    setSavingNotes(prev => ({ ...prev, [userId]: true }));
    const dateStr = new Date(selectedDate).toLocaleDateString();
    const noteText = notes[userId] || '';
    
    const note: AttendanceNote = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      userId,
      dateStr,
      note: noteText,
      updatedAt: Date.now()
    };

    await saveAttendanceNote(note);
    setSavingNotes(prev => ({ ...prev, [userId]: false }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'REJECTED': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  // Summary calculations for selected date
  const dateStr = new Date(selectedDate).toLocaleDateString();
  const todaysRecords = records.filter(r => r.dateStr === dateStr);
  const clockedInUsers = new Set(todaysRecords.filter(r => r.type === 'CLOCK_IN').map(r => r.userId));
  const clockedOutUsers = new Set(todaysRecords.filter(r => r.type === 'CLOCK_OUT').map(r => r.userId));
  
  const totalStaff = users.filter(u => u.role === 'STAFF').length;
  const presentStaff = clockedInUsers.size;
  const absentStaff = totalStaff - presentStaff;

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800">Attendance Summary</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Staff</p>
            <p className="text-3xl font-bold text-slate-800">{totalStaff}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <p className="text-sm font-medium text-emerald-600 mb-1">Present</p>
            <p className="text-3xl font-bold text-emerald-700">{presentStaff}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="text-sm font-medium text-red-600 mb-1">Absent</p>
            <p className="text-3xl font-bold text-red-700">{absentStaff}</p>
          </div>
        </div>
      </div>

      {/* Staff Notes Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Daily Notes by Staff</h2>
        <div className="space-y-4">
          {users.filter(u => u.role === 'STAFF').map(staff => {
            const hasClockedIn = clockedInUsers.has(staff.id);
            const hasClockedOut = clockedOutUsers.has(staff.id);
            
            return (
              <div key={staff.id} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                <div className="w-full md:w-1/3">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={staff.avatar} alt={staff.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-slate-800">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.department || 'No Department'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs font-medium">
                    <span className={`px-2 py-1 rounded-full ${hasClockedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      In: {hasClockedIn ? 'Yes' : 'No'}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${hasClockedOut ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      Out: {hasClockedOut ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div className="w-full md:w-2/3 flex gap-2">
                  <textarea
                    value={notes[staff.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [staff.id]: e.target.value })}
                    placeholder="Add a note for this staff member on this date..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm resize-none"
                    rows={2}
                  />
                  <Button 
                    onClick={() => handleSaveNote(staff.id)}
                    disabled={savingNotes[staff.id]}
                    className="shrink-0 h-full"
                  >
                    {savingNotes[staff.id] ? '...' : <Save className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave Requests Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Leave Requests</h2>
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No leave requests found</p>
            </div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800">{request.userName}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <Calendar className="w-4 h-4" />
                    <span>{request.startDate} to {request.endDate}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-2 bg-white p-2 rounded border border-slate-100">
                    "{request.reason}"
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Applied on {new Date(request.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <div className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span className="text-xs font-bold uppercase tracking-wider">{request.status}</span>
                  </div>
                  
                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleUpdateLeaveStatus(request.id, 'APPROVED')}
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      >
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleUpdateLeaveStatus(request.id, 'REJECTED')}
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
