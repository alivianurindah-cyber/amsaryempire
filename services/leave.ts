import { sql, isOffline } from './db';
import { LeaveRequest } from '../types';

export const getLeaveRequests = async (userId?: string): Promise<LeaveRequest[]> => {
  if (isOffline) {
    const allRequests = JSON.parse(localStorage.getItem('leave_requests') || '[]');
    if (userId) {
      return allRequests.filter((r: LeaveRequest) => r.userId === userId);
    }
    return allRequests;
  }

  try {
    let rows;
    if (userId) {
      rows = await sql`SELECT * FROM leave_requests WHERE user_id = ${userId} ORDER BY applied_at DESC`;
    } else {
      rows = await sql`SELECT * FROM leave_requests ORDER BY applied_at DESC`;
    }
    
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      appliedAt: Number(row.applied_at)
    }));
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    return [];
  }
};

export const createLeaveRequest = async (request: LeaveRequest): Promise<boolean> => {
  if (isOffline) {
    const requests = JSON.parse(localStorage.getItem('leave_requests') || '[]');
    requests.push(request);
    localStorage.setItem('leave_requests', JSON.stringify(requests));
    return true;
  }

  try {
    await sql`
      INSERT INTO leave_requests (id, user_id, user_name, start_date, end_date, reason, status, applied_at)
      VALUES (${request.id}, ${request.userId}, ${request.userName}, ${request.startDate}, ${request.endDate}, ${request.reason}, ${request.status}, ${request.appliedAt})
    `;
    return true;
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return false;
  }
};

export const updateLeaveRequestStatus = async (id: string, status: 'APPROVED' | 'REJECTED'): Promise<boolean> => {
  if (isOffline) {
    const requests = JSON.parse(localStorage.getItem('leave_requests') || '[]');
    const index = requests.findIndex((r: LeaveRequest) => r.id === id);
    if (index !== -1) {
      requests[index].status = status;
      localStorage.setItem('leave_requests', JSON.stringify(requests));
      return true;
    }
    return false;
  }

  try {
    await sql`UPDATE leave_requests SET status = ${status} WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error("Failed to update leave request status:", error);
    return false;
  }
};
