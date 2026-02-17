import React, { useState, useEffect } from 'react';
import { LogOut, Users, Search, MapPin, Clock, Filter, CheckCircle2, ChefHat, Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import { AttendanceRecord, User } from '../types';
import { Button } from './Button';
import { getUsers, updateUser, deleteUser, register } from '../services/auth';
import { getAttendanceRecords } from '../services/attendance';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'STAFF'>('LOGS');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TODAY'>('ALL');

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    // Load Logs
    const loadData = async () => {
        const recs = await getAttendanceRecords();
        setRecords(recs);
        const usrs = await getUsers();
        setUsers(usrs);
    };
    loadData();
  }, [activeTab]);

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setEditForm({ ...u });
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

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
        await deleteUser(id);
        const usrs = await getUsers();
        setUsers(usrs);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
                <ChefHat className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Chef Ammar <span className="text-slate-400 font-normal">| Admin</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-slate-100 p-1 rounded-lg">
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
            </div>

            <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 font-medium">Administrator</p>
            </div>
            <Button 
                onClick={onLogout} 
                variant="ghost" 
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
            >
                <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Row (Only on Logs view) */}
        {activeTab === 'LOGS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            )}
            {activeTab === 'STAFF' && (
                 <Button className="shrink-0 gap-2">
                    <Plus className="w-4 h-4" /> Add Staff
                 </Button>
            )}
        </div>

        {/* LOGS TABLE */}
        {activeTab === 'LOGS' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
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
                                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group cursor-pointer">
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

        {/* STAFF TABLE */}
        {activeTab === 'STAFF' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Name & IC</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Emp ID</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {editingUser?.id === u.id ? (
                                            <div className="space-y-2">
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
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100" />
                                                <div>
                                                    <div className="font-semibold text-slate-900">{u.name}</div>
                                                    {u.icNumber && <div className="text-xs text-slate-500">IC: {u.icNumber}</div>}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser?.id === u.id ? (
                                            <input 
                                                className="w-full border rounded px-2 py-1 text-sm"
                                                value={editForm.department || ''}
                                                onChange={e => setEditForm({...editForm, department: e.target.value})}
                                            />
                                        ) : (
                                            <span className="text-sm text-slate-600">{u.department || '-'}</span>
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
        )}
      </main>
    </div>
  );
};