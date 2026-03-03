import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { User, LeaveRequest } from '../types';
import { getLeaveRequests, createLeaveRequest } from '../services/leave';
import { Button } from './Button';

interface LeaveManagementProps {
  user: User;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ user }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [user.id]);

  const loadRequests = async () => {
    const data = await getLeaveRequests(user.id);
    setRequests(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;

    setIsSubmitting(true);
    const newRequest: LeaveRequest = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      userId: user.id,
      userName: user.name,
      startDate,
      endDate,
      reason,
      status: 'PENDING',
      appliedAt: Date.now()
    };

    const success = await createLeaveRequest(newRequest);
    if (success) {
      setRequests([newRequest, ...requests]);
      setShowForm(false);
      setStartDate('');
      setEndDate('');
      setReason('');
    }
    setIsSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Leave Requests</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'primary'}>
          {showForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> New Request</>}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Please provide a reason for your leave request..."
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No leave requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-800">
                    {request.startDate} to {request.endDate}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{request.reason}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Applied on {new Date(request.appliedAt).toLocaleDateString()}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full border flex items-center gap-2 w-fit ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                <span className="text-sm font-medium capitalize">{request.status.toLowerCase()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
