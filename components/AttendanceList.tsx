import React from 'react';
import { AttendanceRecord } from '../types';
import { MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface AttendanceListProps {
  records: AttendanceRecord[];
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
        <Clock className="w-10 h-10 mb-2 opacity-50" />
        <p className="text-sm font-medium">No activity recorded yet</p>
      </div>
    );
  }

  // Sort by latest
  const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4 pb-20">
      {sortedRecords.map((record) => (
        <div key={record.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex">
            {/* Image Section */}
            <div className="w-1/3 relative bg-slate-100 border-r border-slate-100">
              <img 
                src={record.photoUrl} 
                alt="Proof" 
                className="w-full h-full object-cover absolute inset-0" 
              />
            </div>

            {/* Content Section */}
            <div className="w-2/3 p-4">
              <div className="flex justify-between items-start mb-2">
                <span className={clsx(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md",
                  record.type === 'CLOCK_IN' 
                    ? "bg-green-50 text-green-700 border border-green-100" 
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                )}>
                  {record.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {record.timeStr}
                </span>
              </div>

              <div className="mb-3 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-xs font-medium">{record.dateStr}</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-brand-500 shrink-0" />
                  <span className="text-[10px] leading-tight line-clamp-2">
                    {record.location.address || 'Unknown Location'}
                  </span>
                </div>
              </div>

              {record.aiVerification && (
                <div className="bg-slate-50 rounded-lg p-2 flex gap-2 items-start border border-slate-100">
                  <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    <span className="text-slate-900 font-semibold">Verified:</span> {record.aiVerification}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};