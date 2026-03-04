import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Users, MapPin, Clock, CheckCircle2, ChefHat, Edit2, Trash2, Save, X, Plus, DollarSign, FileText, Calendar, AlertCircle, Search } from 'lucide-react';
import { AttendanceRecord, User } from '../types';
import { Button } from './Button';
import { getUsers, updateUser, deleteUser, register } from '../services/auth';
import { getAttendanceRecords, updateAttendanceRecord } from '../services/attendance';
import { AdminAttendance } from './AdminAttendance';

import { AttendanceCalendar } from './AttendanceCalendar';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'STAFF' | 'PAYROLL' | 'ATTENDANCE'>('ATTENDANCE');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Payroll State
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [showPayslip, setShowPayslip] = useState<string | null>(null); // User ID for payslip modal
  const [showDetails, setShowDetails] = useState<string | null>(null); // User ID for details modal
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TODAY'>('ALL');

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  
  // Calendar State
  const [selectedStaffCalendar, setSelectedStaffCalendar] = useState<string | null>(null);

  // Add Employee State
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addForm, setAddForm] = useState<Partial<User>>({
    role: 'STAFF',
    salaryType: 'MONTHLY'
  });
  const [addError, setAddError] = useState<string | null>(null);

  // Image Modal State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Logs View State
  const [logsView, setLogsView] = useState<'DETAILED' | 'SUMMARY'>('DETAILED');

  useEffect(() => {
    // Load Logs
    const loadData = async () => {
        try {
            setDbError(null);
            const recs = await getAttendanceRecords();
            setRecords(recs);
            const usrs = await getUsers();
            setUsers(usrs);
        } catch (error: any) {
            console.error("Failed to load data:", error);
            if (error.message?.includes('authentication failed')) {
                setDbError("Database authentication failed. Please check your DATABASE_URL password.");
            } else {
                setDbError("Failed to connect to database. Check your connection.");
            }
        }
    };
    loadData();
  }, [activeTab]);

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setEditForm({ ...u });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'typhoidCertificateUrl' | 'avatar') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async () => {
    if (editingUser && editForm) {
        const updated = await updateUser({
            id: editingUser.id,
            name: editForm.name,
            department: editForm.department,
            phone: editForm.phone,
            employeeId: editForm.employeeId,
            icNumber: editForm.icNumber,
            homeAddress: editForm.homeAddress,
            emergencyPhone: editForm.emergencyPhone,
            typhoidCertificateUrl: editForm.typhoidCertificateUrl,
            typhoidExpiryDate: editForm.typhoidExpiryDate,
            avatar: editForm.avatar,
            shiftStart: editForm.shiftStart,
            shiftEnd: editForm.shiftEnd,
            baseSalary: editForm.baseSalary,
            salaryType: editForm.salaryType
        });
        
        // If the admin is editing their own profile, update global state
        if (updated.id === user.id) {
            onUserUpdate(updated);
        }

        setEditingUser(null);
        // Refresh users
        const usrs = await getUsers();
        setUsers(usrs);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    
    if (!addForm.username || !addForm.password || !addForm.name) {
      setAddError("Username, password, and name are required.");
      return;
    }

    try {
      // 1. Register the user
      const newUser = await register(
        addForm.username, 
        addForm.password, 
        addForm.name, 
        addForm.department || 'General'
      );

      // 2. Update with additional details
      await updateUser({
        id: newUser.id,
        role: addForm.role,
        avatar: addForm.avatar,
        phone: addForm.phone,
        icNumber: addForm.icNumber,
        homeAddress: addForm.homeAddress,
        emergencyPhone: addForm.emergencyPhone,
        typhoidCertificateUrl: addForm.typhoidCertificateUrl,
        typhoidExpiryDate: addForm.typhoidExpiryDate,
        employeeId: addForm.employeeId,
        shiftStart: addForm.shiftStart,
        shiftEnd: addForm.shiftEnd,
        baseSalary: addForm.baseSalary,
        salaryType: addForm.salaryType
      });

      // 3. Refresh users list
      const usrs = await getUsers();
      setUsers(usrs);
      
      // 4. Close modal and reset form
      setShowAddEmployee(false);
      setAddForm({ role: 'STAFF', salaryType: 'MONTHLY' });
    } catch (err: any) {
      setAddError(err.message || "Failed to add employee");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
        await deleteUser(id);
        const usrs = await getUsers();
        setUsers(usrs);
    }
  };

  const handleOTStatusChange = async (recordId: string, status: 'APPROVED' | 'REJECTED') => {
      try {
          await updateAttendanceRecord(recordId, { otStatus: status });
          const recs = await getAttendanceRecords();
          setRecords(recs);
      } catch (err) {
          console.error("Failed to update OT status", err);
          alert("Failed to update OT status. Please try again.");
      }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          record.userRole?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'TODAY') {
        const todayStr = new Date().toLocaleDateString();
        return matchesSearch && record.dateStr === todayStr;
    }
    return matchesSearch;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const summaryData = useMemo(() => {
    const data: Record<string, { name: string, role: string, date: string, clockIn: string | null, clockOut: string | null }> = {};
    filteredRecords.forEach(r => {
        const key = `${r.userId}-${r.dateStr}`;
        if (!data[key]) {
            data[key] = {
                name: r.userName,
                role: r.userRole,
                date: r.dateStr,
                clockIn: null,
                clockOut: null
            };
        }
        if (r.type === 'CLOCK_IN') data[key].clockIn = r.timeStr;
        if (r.type === 'CLOCK_OUT') data[key].clockOut = r.timeStr;
    });
    return Object.values(data).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredRecords]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
                <ChefHat className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Chef Ammar <span className="text-slate-400 font-normal">| Admin</span></h1>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden lg:flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('LOGS')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'LOGS' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Activity Logs
                </button>
                <button 
                    onClick={() => setActiveTab('STAFF')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'STAFF' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Staff Management
                </button>
                <button 
                    onClick={() => setActiveTab('ATTENDANCE')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'ATTENDANCE' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Attendance & Leave
                </button>
                <button 
                    onClick={() => setActiveTab('PAYROLL')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'PAYROLL' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Payroll
                </button>
            </div>

            <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 font-medium">Administrator</p>
            </div>
            <div className="relative hidden sm:block">
                <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <Button 
                onClick={onLogout} 
                variant="ghost" 
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 px-2 sm:px-4"
                title="Sign Out"
            >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile Tabs Navigation */}
        <div className="lg:hidden border-t border-slate-100 bg-white overflow-x-auto scrollbar-hide print:hidden">
            <div className="flex p-2 gap-2 min-w-max">
                <button 
                    onClick={() => setActiveTab('LOGS')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'LOGS' ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Activity Logs
                </button>
                <button 
                    onClick={() => setActiveTab('STAFF')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'STAFF' ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Staff Management
                </button>
                <button 
                    onClick={() => setActiveTab('ATTENDANCE')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ATTENDANCE' ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Attendance & Leave
                </button>
                <button 
                    onClick={() => setActiveTab('PAYROLL')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'PAYROLL' ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    Payroll
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dbError && (
            <div className="mb-8 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="flex-1">
                    <p className="font-bold">Database Connection Error</p>
                    <p className="text-sm">{dbError}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => window.location.reload()} className="text-red-600 hover:bg-red-100 border-red-200">
                    Retry
                </Button>
            </div>
        )}
        
        {/* Stats Row (Only on Logs view) */}
        {activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Logs</p>
                        <p className="text-3xl font-bold text-slate-900">{records.length}</p>
                    </div>
                    <div className="bg-brand-50 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-brand-600" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Today's Activity</p>
                        <p className="text-3xl font-bold text-slate-900">
                            {records.filter(r => r.dateStr === new Date().toLocaleDateString()).length}
                        </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                        <Clock className="w-6 h-6 text-green-600" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Locations</p>
                        <p className="text-3xl font-bold text-slate-900">
                            {new Set(records.map(r => r.location?.address)).size}
                        </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                        <MapPin className="w-6 h-6 text-orange-600" />
                    </div>
                </div>
            </div>
        )}

        {/* Common Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 print:hidden">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={activeTab === 'LOGS' ? "Search logs by name or role..." : "Search staff directory..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow placeholder:text-slate-400"
                />
            </div>
            {activeTab === 'LOGS' && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        <button 
                            onClick={() => setFilter('ALL')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All Logs
                        </button>
                        <button 
                            onClick={() => setFilter('TODAY')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'TODAY' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Today
                        </button>
                    </div>
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        <button 
                            onClick={() => setLogsView('DETAILED')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${logsView === 'DETAILED' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Detailed
                        </button>
                        <button 
                            onClick={() => setLogsView('SUMMARY')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${logsView === 'SUMMARY' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Summary
                        </button>
                    </div>
                    {logsView === 'SUMMARY' && (
                        <Button variant="secondary" onClick={() => window.print()} className="gap-2 shrink-0">
                            <FileText className="w-4 h-4" /> Download PDF
                        </Button>
                    )}
                </div>
            )}
            {activeTab === 'STAFF' && (
                 <div className="flex gap-2">
                     <Button 
                        variant="secondary"
                        onClick={() => { setSearchTerm(''); }}
                        className="shrink-0 text-slate-600 border-slate-200 hover:bg-slate-50"
                     >
                        View All
                     </Button>
                     <Button className="shrink-0 gap-2">
                        <Plus className="w-4 h-4" /> Add Staff
                     </Button>
                 </div>
            )}
        </div>

        {/* LOGS TABLE */}
        {activeTab === 'LOGS' && logsView === 'DETAILED' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">AI Verification</th>
                                <th className="px-6 py-4">Snapshot</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                                                {record.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">{record.userName || 'Unknown'}</div>
                                                <div className="text-xs text-slate-500">{record.userRole}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            record.type === 'CLOCK_IN' 
                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {record.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-700 font-medium">{record.timeStr}</div>
                                        <div className="text-xs text-slate-500">{record.dateStr}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 max-w-xs text-slate-600">
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="text-sm truncate">{record.location?.address || 'GPS Coordinates'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xs">
                                            <div className="flex items-center gap-1 text-green-600 font-medium mb-0.5">
                                                <CheckCircle2 className="w-3 h-3" /> Analyzed
                                            </div>
                                            {record.aiVerification || 'Processing...'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div 
                                            className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group cursor-pointer"
                                            onClick={() => setSelectedImage(record.photoUrl)}
                                        >
                                            <img src={record.photoUrl} alt="proof" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* SUMMARY TABLE */}
        {activeTab === 'LOGS' && logsView === 'SUMMARY' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none">
                <div className="hidden print:block mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Activity Logs Summary</h1>
                    <p className="text-slate-500">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                    <p className="text-slate-500">Filter: {filter === 'TODAY' ? "Today's Logs" : "All Logs"}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px] print:w-full print:min-w-0">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 print:bg-transparent print:text-black">
                            <tr>
                                <th className="px-6 py-4 print:px-2 print:py-2">Employee</th>
                                <th className="px-6 py-4 print:px-2 print:py-2">Date</th>
                                <th className="px-6 py-4 print:px-2 print:py-2">Clock In</th>
                                <th className="px-6 py-4 print:px-2 print:py-2">Clock Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                            {summaryData.map((data, index) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                    <td className="px-6 py-4 print:px-2 print:py-2">
                                        <div className="font-semibold text-slate-900 print:text-black">{data.name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500 print:text-black">{data.role}</div>
                                    </td>
                                    <td className="px-6 py-4 print:px-2 print:py-2 text-sm text-slate-700 print:text-black">
                                        {data.date}
                                    </td>
                                    <td className="px-6 py-4 print:px-2 print:py-2">
                                        {data.clockIn ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 print:border-none print:bg-transparent print:text-black print:p-0">
                                                {data.clockIn}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm print:text-black">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 print:px-2 print:py-2">
                                        {data.clockOut ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 print:border-none print:bg-transparent print:text-black print:p-0">
                                                {data.clockOut}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm print:text-black">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {summaryData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No activity found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* STAFF TABLE */}
        {activeTab === 'STAFF' && (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Employee Management</h2>
                            <p className="text-sm text-slate-500">Add, view, and edit employee details</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowAddEmployee(true)} className="flex items-center justify-center gap-2 w-full sm:w-auto">
                        <Plus className="w-4 h-4" />
                        Add Employee
                    </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Employee Info</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Emp ID</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Typhoid Cert</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {editingUser?.id === u.id ? (
                                            <div className="space-y-2">
                                                <div className="flex justify-center mb-2">
                                                    <div className="relative w-12 h-12">
                                                        <img 
                                                            src={editForm.avatar || u.avatar} 
                                                            className="w-12 h-12 rounded-full object-cover bg-slate-100 border border-slate-200" 
                                                        />
                                                        <label className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow border border-slate-200 cursor-pointer hover:bg-slate-50">
                                                            <Edit2 className="w-3 h-3 text-slate-500" />
                                                            <input 
                                                                type="file" 
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleFileUpload(e, 'avatar')}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                                <input 
                                                    className="w-full border rounded px-2 py-1 text-sm"
                                                    value={editForm.name || ''}
                                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                                    placeholder="Full Name"
                                                />
                                                <input 
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editForm.icNumber || ''}
                                                    onChange={e => setEditForm({...editForm, icNumber: e.target.value})}
                                                    placeholder="IC Number"
                                                />
                                                <select
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editForm.role || 'STAFF'}
                                                    onChange={e => setEditForm({...editForm, role: e.target.value as 'ADMIN' | 'STAFF'})}
                                                >
                                                    <option value="STAFF">Staff</option>
                                                    <option value="ADMIN">Admin</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100 object-cover" />
                                                <div>
                                                    <div className="font-semibold text-slate-900">{u.name}</div>
                                                    <div className="text-xs text-brand-600 font-medium">{u.role}</div>
                                                    {u.icNumber && <div className="text-xs text-slate-500">IC: {u.icNumber}</div>}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser?.id === u.id ? (
                                            <div className="space-y-2">
                                                <input 
                                                    className="w-full border rounded px-2 py-1 text-sm"
                                                    value={editForm.department || ''}
                                                    onChange={e => setEditForm({...editForm, department: e.target.value})}
                                                    placeholder="Department"
                                                />
                                                <div className="grid grid-cols-2 gap-1">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block">Shift Start</label>
                                                        <input 
                                                            type="time"
                                                            className="w-full border rounded px-1 py-1 text-xs"
                                                            value={editForm.shiftStart || ''}
                                                            onChange={e => setEditForm({...editForm, shiftStart: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block">Shift End</label>
                                                        <input 
                                                            type="time"
                                                            className="w-full border rounded px-1 py-1 text-xs"
                                                            value={editForm.shiftEnd || ''}
                                                            onChange={e => setEditForm({...editForm, shiftEnd: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] text-slate-400 block">Base Salary (RM)</label>
                                                        <input 
                                                            type="number"
                                                            className="w-full border rounded px-2 py-1 text-xs"
                                                            value={editForm.baseSalary || ''}
                                                            onChange={e => setEditForm({...editForm, baseSalary: Number(e.target.value)})}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] text-slate-400 block">Type</label>
                                                        <select
                                                            className="w-full border rounded px-2 py-1 text-xs"
                                                            value={editForm.salaryType || 'MONTHLY'}
                                                            onChange={e => setEditForm({...editForm, salaryType: e.target.value as 'HOURLY' | 'DAILY' | 'MONTHLY'})}
                                                        >
                                                            <option value="MONTHLY">Monthly</option>
                                                            <option value="DAILY">Daily</option>
                                                            <option value="HOURLY">Hourly</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <span className="text-sm text-slate-600 block">{u.department || '-'}</span>
                                                {(u.shiftStart || u.shiftEnd) && (
                                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {u.shiftStart || '?'} - {u.shiftEnd || '?'}
                                                    </div>
                                                )}
                                                {u.baseSalary && (
                                                    <div className="text-xs text-green-600 font-medium">
                                                        RM {u.baseSalary.toLocaleString()} {u.salaryType === 'HOURLY' ? '/ hr' : u.salaryType === 'DAILY' ? '/ day' : '/ mo'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser?.id === u.id ? (
                                            <div className="space-y-2">
                                                <input 
                                                    className="w-full border rounded px-2 py-1 text-sm"
                                                    value={editForm.phone || ''}
                                                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                                    placeholder="Phone"
                                                />
                                                <input 
                                                    className="w-full border rounded px-2 py-1 text-sm"
                                                    value={editForm.emergencyPhone || ''}
                                                    onChange={e => setEditForm({...editForm, emergencyPhone: e.target.value})}
                                                    placeholder="Emergency"
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-600">
                                                <div>{u.phone || 'No Phone'}</div>
                                                {u.emergencyPhone && <div className="text-xs text-red-400 mt-1">SOS: {u.emergencyPhone}</div>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                         {editingUser?.id === u.id ? (
                                            <input 
                                                className="w-full border rounded px-2 py-1 text-sm"
                                                value={editForm.employeeId || ''}
                                                onChange={e => setEditForm({...editForm, employeeId: e.target.value})}
                                            />
                                        ) : (
                                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{u.employeeId || 'Pending'}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        {editingUser?.id === u.id ? (
                                             <textarea 
                                                className="w-full border rounded px-2 py-1 text-xs"
                                                rows={2}
                                                value={editForm.homeAddress || ''}
                                                onChange={e => setEditForm({...editForm, homeAddress: e.target.value})}
                                                placeholder="Address"
                                            />
                                        ) : (
                                            <span className="text-xs text-slate-500 truncate block" title={u.homeAddress}>
                                                {u.homeAddress || '-'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser?.id === u.id ? (
                                            <div className="space-y-2">
                                                <input 
                                                    type="date"
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editForm.typhoidExpiryDate || ''}
                                                    onChange={e => setEditForm({...editForm, typhoidExpiryDate: e.target.value})}
                                                />
                                                <div className="relative">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e, 'typhoidCertificateUrl')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className="border border-dashed border-slate-300 rounded px-2 py-1 text-xs text-center text-slate-500 hover:bg-slate-50 cursor-pointer">
                                                        {editForm.typhoidCertificateUrl ? 'Change Img' : 'Upload'}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs">
                                                {u.typhoidExpiryDate ? (
                                                    <div className={`font-medium ${new Date(u.typhoidExpiryDate) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                                                        Exp: {u.typhoidExpiryDate}
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-400 italic">Not set</div>
                                                )}
                                                {u.typhoidCertificateUrl && (
                                                    <a href={u.typhoidCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline mt-1 block">
                                                        View Cert
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingUser?.id === u.id ? (
                                                <>
                                                    <button onClick={() => setEditingUser(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={handleSaveUser} className="p-1.5 text-green-600 hover:text-green-700 bg-green-50 rounded">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => setSelectedStaffCalendar(u.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Calendar">
                                                        <Calendar className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleEditClick(u)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {u.role !== 'ADMIN' && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        )}
        {/* ATTENDANCE TABLE */}
        {activeTab === 'ATTENDANCE' && (
            <AdminAttendance users={users} records={records} />
        )}

        {/* PAYROLL TABLE */}
        {activeTab === 'PAYROLL' && (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600 shrink-0">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Payroll Summary</h2>
                            <p className="text-sm text-slate-500">Manage salaries, deductions, and OT</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400 hidden sm:block" />
                        <input 
                            type="date" 
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="flex-1 sm:flex-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                        <span className="text-slate-400">to</span>
                        <input 
                            type="date" 
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="flex-1 sm:flex-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4 text-center">Days Worked</th>
                                    <th className="px-6 py-4 text-center">Late (Days)</th>
                                    <th className="px-6 py-4 text-center">OT (Hrs)</th>
                                    <th className="px-6 py-4 text-right">Base Salary</th>
                                    <th className="px-6 py-4 text-right text-red-600">Deductions</th>
                                    <th className="px-6 py-4 text-right text-green-600">Net Salary</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.filter(u => u.role !== 'ADMIN').map(u => {
                                    const fromDate = new Date(dateFrom);
                                    fromDate.setHours(0, 0, 0, 0);
                                    const toDate = new Date(dateTo);
                                    toDate.setHours(23, 59, 59, 999);

                                    const userRecords = records.filter(r => {
                                        const d = new Date(r.timestamp);
                                        return r.userId === u.id && d >= fromDate && d <= toDate;
                                    });

                                    const clockInRecords = userRecords.filter(r => r.type === 'CLOCK_IN');
                                    const clockOutRecords = userRecords.filter(r => r.type === 'CLOCK_OUT');

                                    const totalDays = new Set(clockInRecords.map(r => r.dateStr)).size;
                                    
                                    let lateOccurrences = 0;
                                    let totalDeductions = 0;
                                    let totalOTMinutes = 0;
                                    let approvedOTMinutes = 0;

                                    clockInRecords.forEach(r => {
                                        if (!u.shiftStart) return;
                                        const recordTime = new Date(r.timestamp);
                                        const [shiftHour, shiftMinute] = u.shiftStart.split(':').map(Number);
                                        const shiftTime = new Date(recordTime);
                                        shiftTime.setHours(shiftHour, shiftMinute, 0, 0);

                                        if (recordTime > shiftTime) {
                                            const diffMs = recordTime.getTime() - shiftTime.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            if (diffMins > 0) {
                                                lateOccurrences++;
                                                totalDeductions += diffMins <= 30 ? 15 : 25;
                                            }
                                        }
                                    });

                                    clockOutRecords.forEach(r => {
                                        if (!u.shiftEnd) return;
                                        const recordTime = new Date(r.timestamp);
                                        const [shiftHour, shiftMinute] = u.shiftEnd.split(':').map(Number);
                                        const shiftTime = new Date(recordTime);
                                        shiftTime.setHours(shiftHour, shiftMinute, 0, 0);

                                        if (recordTime > shiftTime) {
                                            const diffMs = recordTime.getTime() - shiftTime.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            if (diffMins > 0) {
                                                totalOTMinutes += diffMins;
                                                if (r.otStatus === 'APPROVED') {
                                                    approvedOTMinutes += diffMins;
                                                }
                                            }
                                        }
                                    });

                                    const baseSalary = u.baseSalary || 0;
                                    let calculatedBaseSalary = baseSalary;
                                    let hourlyRate = 0;

                                    if (u.salaryType === 'HOURLY') {
                                        // Assuming 8 hours per day worked
                                        calculatedBaseSalary = baseSalary * 8 * totalDays;
                                        hourlyRate = baseSalary;
                                    } else if (u.salaryType === 'DAILY') {
                                        calculatedBaseSalary = baseSalary * totalDays;
                                        hourlyRate = baseSalary / 8;
                                    } else {
                                        // MONTHLY (default)
                                        calculatedBaseSalary = baseSalary;
                                        hourlyRate = baseSalary / 26 / 8;
                                    }

                                    const otPay = (hourlyRate / 60) * approvedOTMinutes * 1.5;
                                    const netSalary = Math.max(0, calculatedBaseSalary + otPay - totalDeductions);

                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100 object-cover" />
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{u.name}</div>
                                                        <div className="text-xs text-slate-500">{u.department}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-700">
                                                {totalDays}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {lateOccurrences > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {lateOccurrences}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {totalOTMinutes > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-medium text-brand-600">{(approvedOTMinutes / 60).toFixed(1)}h</span>
                                                        {totalOTMinutes > approvedOTMinutes && (
                                                            <span className="text-[10px] text-orange-500">{(totalOTMinutes / 60).toFixed(1)}h pending</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm">
                                                RM {calculatedBaseSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                {u.salaryType !== 'MONTHLY' && (
                                                    <div className="text-[10px] text-slate-400">
                                                        (RM {baseSalary} {u.salaryType === 'HOURLY' ? '/hr' : '/day'})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm text-red-600">
                                                {totalDeductions > 0 ? `- RM ${totalDeductions}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm font-bold text-green-600">
                                                RM {netSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary"
                                                        onClick={() => setShowDetails(u.id)}
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary"
                                                        onClick={() => setShowPayslip(u.id)}
                                                        className="gap-2"
                                                    >
                                                        <FileText className="w-4 h-4" /> Payslip
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* Payslip Modal */}
        {showPayslip && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                    {(() => {
                        const u = users.find(user => user.id === showPayslip);
                        if (!u) return null;

                        const fromDate = new Date(dateFrom);
                        fromDate.setHours(0, 0, 0, 0);
                        const toDate = new Date(dateTo);
                        toDate.setHours(23, 59, 59, 999);
                        
                        const userRecords = records.filter(r => {
                            const d = new Date(r.timestamp);
                            return r.userId === u.id && d >= fromDate && d <= toDate;
                        });

                        const clockInRecords = userRecords.filter(r => r.type === 'CLOCK_IN');
                        const clockOutRecords = userRecords.filter(r => r.type === 'CLOCK_OUT');

                        let totalDeductions = 0;
                        const deductionDetails: { date: string, time: string, lateMins: number, amount: number }[] = [];
                        let approvedOTMinutes = 0;
                        const otDetails: { date: string, time: string, otMins: number, amount: number }[] = [];

                        const baseSalary = u.baseSalary || 0;
                        const totalDays = new Set(clockInRecords.map(r => r.dateStr)).size;
                        
                        let calculatedBaseSalary = baseSalary;
                        let hourlyRate = 0;

                        if (u.salaryType === 'HOURLY') {
                            calculatedBaseSalary = baseSalary * 8 * totalDays;
                            hourlyRate = baseSalary;
                        } else if (u.salaryType === 'DAILY') {
                            calculatedBaseSalary = baseSalary * totalDays;
                            hourlyRate = baseSalary / 8;
                        } else {
                            calculatedBaseSalary = baseSalary;
                            hourlyRate = baseSalary / 26 / 8;
                        }

                        clockInRecords.forEach(r => {
                            if (!u.shiftStart) return;
                            const recordTime = new Date(r.timestamp);
                            const [shiftHour, shiftMinute] = u.shiftStart.split(':').map(Number);
                            const shiftTime = new Date(recordTime);
                            shiftTime.setHours(shiftHour, shiftMinute, 0, 0);

                            if (recordTime > shiftTime) {
                                const diffMs = recordTime.getTime() - shiftTime.getTime();
                                const diffMins = Math.floor(diffMs / 60000);

                                if (diffMins > 0) {
                                    const amount = diffMins <= 30 ? 15 : 25;
                                    totalDeductions += amount;
                                    deductionDetails.push({
                                        date: r.dateStr,
                                        time: r.timeStr,
                                        lateMins: diffMins,
                                        amount
                                    });
                                }
                            }
                        });

                        clockOutRecords.forEach(r => {
                            if (!u.shiftEnd) return;
                            const recordTime = new Date(r.timestamp);
                            const [shiftHour, shiftMinute] = u.shiftEnd.split(':').map(Number);
                            const shiftTime = new Date(recordTime);
                            shiftTime.setHours(shiftHour, shiftMinute, 0, 0);

                            if (recordTime > shiftTime) {
                                const diffMs = recordTime.getTime() - shiftTime.getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                if (diffMins > 0 && r.otStatus === 'APPROVED') {
                                    approvedOTMinutes += diffMins;
                                    const amount = (hourlyRate / 60) * diffMins * 1.5;
                                    otDetails.push({
                                        date: r.dateStr,
                                        time: r.timeStr,
                                        otMins: diffMins,
                                        amount
                                    });
                                }
                            }
                        });

                        const otPay = (hourlyRate / 60) * approvedOTMinutes * 1.5;
                        const netSalary = Math.max(0, calculatedBaseSalary + otPay - totalDeductions);

                        return (
                            <>
                                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">Payslip</h2>
                                        <p className="text-slate-400">{dateFrom} to {dateTo}</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-lg">Chef Ammar Group</h3>
                                        <p className="text-xs text-slate-400">Strictly Private & Confidential</p>
                                    </div>
                                </div>
                                
                                <div className="p-8 max-h-[70vh] overflow-y-auto">
                                    <div className="flex justify-between mb-8 pb-8 border-b border-slate-100">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Employee</p>
                                            <h3 className="font-bold text-lg text-slate-900">{u.name}</h3>
                                            <p className="text-sm text-slate-600">{u.department}</p>
                                            <p className="text-xs text-slate-400 mt-1">{u.employeeId || 'ID: Pending'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Payment Details</p>
                                            <div className="text-sm text-slate-600">
                                                <div className="flex justify-between gap-8 mb-1">
                                                    <span>Base Salary:</span>
                                                    <span className="font-mono">RM {calculatedBaseSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                                </div>
                                                <div className="flex justify-between gap-8 mb-1">
                                                    <span>Rate:</span>
                                                    <span className="font-mono text-xs text-slate-400">RM {baseSalary} {u.salaryType === 'HOURLY' ? '/hr' : u.salaryType === 'DAILY' ? '/day' : '/mo'}</span>
                                                </div>
                                                <div className="flex justify-between gap-8">
                                                    <span>Shift:</span>
                                                    <span className="font-mono">{u.shiftStart || 'N/A'} - {u.shiftEnd || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-green-500" /> Approved Overtime
                                            </h4>
                                            {otDetails.length > 0 ? (
                                                <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-100 text-xs text-slate-500 font-semibold text-left">
                                                            <tr>
                                                                <th className="px-4 py-2">Date</th>
                                                                <th className="px-4 py-2">OT Mins</th>
                                                                <th className="px-4 py-2 text-right">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {otDetails.map((d, i) => (
                                                                <tr key={i}>
                                                                    <td className="px-4 py-2 text-slate-600">{d.date}</td>
                                                                    <td className="px-4 py-2 text-green-600 font-medium">{d.otMins} mins</td>
                                                                    <td className="px-4 py-2 text-right font-mono text-slate-900">+ RM {d.amount.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">No approved overtime.</p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-red-500" /> Late Deductions
                                            </h4>
                                            {deductionDetails.length > 0 ? (
                                                <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-100 text-xs text-slate-500 font-semibold text-left">
                                                            <tr>
                                                                <th className="px-4 py-2">Date</th>
                                                                <th className="px-4 py-2">Late By</th>
                                                                <th className="px-4 py-2 text-right">Deduction</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {deductionDetails.map((d, i) => (
                                                                <tr key={i}>
                                                                    <td className="px-4 py-2 text-slate-600">{d.date}</td>
                                                                    <td className="px-4 py-2 text-red-500 font-medium">{d.lateMins} mins</td>
                                                                    <td className="px-4 py-2 text-right font-mono text-slate-900">- RM {d.amount.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">No late deductions. Great job!</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-6 flex justify-between items-center border border-slate-200">
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Total Net Salary</p>
                                            <p className="text-xs text-slate-400">Base + OT - Deductions</p>
                                        </div>
                                        <div className="text-3xl font-bold text-brand-600 font-mono">
                                            RM {netSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                                    <Button variant="ghost" onClick={() => setShowPayslip(null)}>Close</Button>
                                    <Button onClick={() => window.print()}>
                                        <FileText className="w-4 h-4 mr-2" /> Print Payslip
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        )}
        {/* Details Modal */}
        {showDetails && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                    {(() => {
                        const u = users.find(user => user.id === showDetails);
                        if (!u) return null;

                        const fromDate = new Date(dateFrom);
                        fromDate.setHours(0, 0, 0, 0);
                        const toDate = new Date(dateTo);
                        toDate.setHours(23, 59, 59, 999);
                        
                        const userRecords = records.filter(r => {
                            const d = new Date(r.timestamp);
                            return r.userId === u.id && d >= fromDate && d <= toDate;
                        });

                        // Generate all dates in range
                        const allDates: string[] = [];
                        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
                            allDates.push(d.toLocaleDateString());
                        }

                        // Group by date
                        const dailyData: Record<string, { in?: AttendanceRecord, out?: AttendanceRecord, lateMins: number, otMins: number }> = {};
                        
                        allDates.forEach(date => {
                            dailyData[date] = { lateMins: 0, otMins: 0 };
                        });

                        userRecords.forEach(r => {
                            if (!dailyData[r.dateStr]) {
                                dailyData[r.dateStr] = { lateMins: 0, otMins: 0 };
                            }
                            if (r.type === 'CLOCK_IN') {
                                dailyData[r.dateStr].in = r;
                                if (u.shiftStart) {
                                    const recordTime = new Date(r.timestamp);
                                    const [shiftHour, shiftMinute] = u.shiftStart.split(':').map(Number);
                                    const shiftTime = new Date(recordTime);
                                    shiftTime.setHours(shiftHour, shiftMinute, 0, 0);
                                    if (recordTime > shiftTime) {
                                        dailyData[r.dateStr].lateMins = Math.floor((recordTime.getTime() - shiftTime.getTime()) / 60000);
                                    }
                                }
                            } else if (r.type === 'CLOCK_OUT') {
                                dailyData[r.dateStr].out = r;
                                if (u.shiftEnd) {
                                    const recordTime = new Date(r.timestamp);
                                    const [shiftHour, shiftMinute] = u.shiftEnd.split(':').map(Number);
                                    const shiftTime = new Date(recordTime);
                                    shiftTime.setHours(shiftHour, shiftMinute, 0, 0);
                                    if (recordTime > shiftTime) {
                                        dailyData[r.dateStr].otMins = Math.floor((recordTime.getTime() - shiftTime.getTime()) / 60000);
                                    }
                                }
                            }
                        });

                        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                        return (
                            <>
                                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold">Attendance Details: {u.name}</h2>
                                        <p className="text-sm text-slate-400">{dateFrom} to {dateTo}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => setShowDetails(null)} className="text-white hover:bg-white/10">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                                
                                <div className="p-6 max-h-[70vh] overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Clock In</th>
                                                <th className="px-4 py-3">Clock Out</th>
                                                <th className="px-4 py-3 text-center">Late</th>
                                                <th className="px-4 py-3 text-center">OT</th>
                                                <th className="px-4 py-3 text-center">OT Status</th>
                                                <th className="px-4 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sortedDates.map(date => {
                                                const data = dailyData[date];
                                                const isOffDay = !data.in && !data.out;
                                                
                                                return (
                                                    <tr key={date} className={`hover:bg-slate-50 ${isOffDay ? 'bg-slate-50/50' : ''}`}>
                                                        <td className="px-4 py-3 font-medium text-slate-900">{date}</td>
                                                        {isOffDay ? (
                                                            <td colSpan={6} className="px-4 py-3 text-center text-slate-500 italic">Off Day</td>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-3 text-slate-600">{data.in ? data.in.timeStr : <span className="text-slate-400">-</span>}</td>
                                                                <td className="px-4 py-3 text-slate-600">{data.out ? data.out.timeStr : <span className="text-slate-400">-</span>}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {data.lateMins > 0 ? (
                                                                        <span className="text-red-600 font-medium">{data.lateMins}m</span>
                                                                    ) : <span className="text-slate-400">-</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {data.otMins > 0 ? (
                                                                        <span className="text-brand-600 font-medium">{data.otMins}m</span>
                                                                    ) : <span className="text-slate-400">-</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {data.out && data.otMins > 0 ? (
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                            data.out.otStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                                            data.out.otStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                                            'bg-orange-100 text-orange-800'
                                                                        }`}>
                                                                            {data.out.otStatus || 'PENDING'}
                                                                        </span>
                                                                    ) : <span className="text-slate-400">-</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {data.out && data.otMins > 0 && (!data.out.otStatus || data.out.otStatus === 'PENDING') && (
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <Button size="sm" onClick={() => handleOTStatusChange(data.out!.id, 'APPROVED')} className="bg-green-600 hover:bg-green-700 text-white">
                                                                                Approve
                                                                            </Button>
                                                                            <Button size="sm" variant="secondary" onClick={() => handleOTStatusChange(data.out!.id, 'REJECTED')} className="text-red-600 hover:bg-red-50">
                                                                                Reject
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {sortedDates.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                                        No attendance records found for this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        )}
        {/* CALENDAR MODAL */}
        {selectedStaffCalendar && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">
                            Staff Calendar - {users.find(u => u.id === selectedStaffCalendar)?.name}
                        </h2>
                        <button onClick={() => setSelectedStaffCalendar(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <AttendanceCalendar 
                            userId={selectedStaffCalendar} 
                            records={records.filter(r => r.userId === selectedStaffCalendar)} 
                            isAdmin={true}
                            onUpdateRecord={async (updatedRecord) => {
                                setRecords(records.map(r => r.id === updatedRecord.id ? updatedRecord : r));
                                await updateAttendanceRecord(updatedRecord);
                            }}
                        />
                    </div>
                </div>
            </div>
        )}
        {/* ADD EMPLOYEE MODAL */}
        {showAddEmployee && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">Add New Employee</h2>
                        <button onClick={() => setShowAddEmployee(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        {addError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {addError}
                            </div>
                        )}
                        <form onSubmit={handleAddEmployee} className="space-y-6">
                            {/* Account Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Account Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Username *</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.username || ''}
                                            onChange={e => setAddForm({...addForm, username: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                                        <input 
                                            required
                                            type="password"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.password || ''}
                                            onChange={e => setAddForm({...addForm, password: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.name || ''}
                                            onChange={e => setAddForm({...addForm, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.role || 'STAFF'}
                                            onChange={e => setAddForm({...addForm, role: e.target.value as 'ADMIN' | 'STAFF'})}
                                        >
                                            <option value="STAFF">Staff</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Employment Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Employment Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Employee ID</label>
                                        <input 
                                            type="text"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.employeeId || ''}
                                            onChange={e => setAddForm({...addForm, employeeId: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                                        <input 
                                            type="text"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.department || ''}
                                            onChange={e => setAddForm({...addForm, department: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Shift Start</label>
                                        <input 
                                            type="time"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.shiftStart || ''}
                                            onChange={e => setAddForm({...addForm, shiftStart: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Shift End</label>
                                        <input 
                                            type="time"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.shiftEnd || ''}
                                            onChange={e => setAddForm({...addForm, shiftEnd: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Base Salary (RM)</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.baseSalary || ''}
                                            onChange={e => setAddForm({...addForm, baseSalary: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Salary Type</label>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.salaryType || 'MONTHLY'}
                                            onChange={e => setAddForm({...addForm, salaryType: e.target.value as 'HOURLY' | 'DAILY' | 'MONTHLY'})}
                                        >
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="DAILY">Daily</option>
                                            <option value="HOURLY">Hourly</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Personal Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                                        <input 
                                            type="tel"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.phone || ''}
                                            onChange={e => setAddForm({...addForm, phone: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">IC Number</label>
                                        <input 
                                            type="text"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.icNumber || ''}
                                            onChange={e => setAddForm({...addForm, icNumber: e.target.value})}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Home Address</label>
                                        <textarea 
                                            rows={2}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={addForm.homeAddress || ''}
                                            onChange={e => setAddForm({...addForm, homeAddress: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setShowAddEmployee(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Save Employee
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}
        
        {/* Image Modal */}
        {selectedImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
                <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-12 right-0 text-white hover:text-slate-300 p-2"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img src={selectedImage} alt="Enlarged proof" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                </div>
            </div>
        )}
      </main>
    </div>
  );
};