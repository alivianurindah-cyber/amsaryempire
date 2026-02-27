import React, { useState, useEffect } from 'react';
import { LogOut, Users, Search, MapPin, Clock, CheckCircle2, ChefHat, Edit2, Trash2, Save, X, Plus, Music, Upload, Play, Pause, FileAudio, DollarSign, FileText, Calendar } from 'lucide-react';
import { AttendanceRecord, User, MusicTrack } from '../types';
import { Button } from './Button';
import { getUsers, updateUser, deleteUser } from '../services/auth';
import { getAttendanceRecords } from '../services/attendance';
import { getMusicTracks, addMusicTrack, deleteMusicTrack } from '../services/music';
import { generateLyrics } from '../services/geminiService';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'STAFF' | 'MUSIC' | 'PAYROLL'>('LOGS');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  
  // Payroll State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showPayslip, setShowPayslip] = useState<string | null>(null); // User ID for payslip modal
  
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
        const tracks = await getMusicTracks();
        setMusicTracks(tracks);
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
            baseSalary: editForm.baseSalary
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

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Skipping. Limit is 10MB.`);
                continue;
            }

            await new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64Audio = reader.result as string;
                        let title = file.name.replace(/\.[^/.]+$/, "");
                        let artist = "Unknown Artist";

                        // Attempt to extract Artist and Title from filename (Format: Artist - Title)
                        if (title.includes(" - ")) {
                            const parts = title.split(" - ");
                            if (parts.length >= 2) {
                                artist = parts[0].trim();
                                title = parts.slice(1).join(" - ").trim();
                            }
                        }

                        const lyrics = await generateLyrics(base64Audio, title, artist);

                        const newTrack: MusicTrack = {
                            id: crypto.randomUUID(),
                            title,
                            artist,
                            url: base64Audio, // Still provide base64 for online fallback or if blob fails
                            lyrics,
                            createdAt: Date.now()
                        };

                        await addMusicTrack(newTrack, file);
                        resolve();
                    } catch (err) {
                        console.error(`Failed to process ${file.name}`, err);
                        resolve(); 
                    }
                };
                reader.readAsDataURL(file);
            });
        }
        
        const tracks = await getMusicTracks();
        setMusicTracks(tracks);
    } catch (error) {
        console.error("Bulk upload error", error);
        alert("An error occurred during upload.");
    } finally {
        setIsUploading(false);
        e.target.value = ''; 
    }
  };

  const handleDeleteTrack = async (id: string) => {
      if (window.confirm('Delete this track?')) {
          await deleteMusicTrack(id);
          const tracks = await getMusicTracks();
          setMusicTracks(tracks);
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
                <button 
                    onClick={() => setActiveTab('MUSIC')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'MUSIC' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Music
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
            <div className="relative">
                <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
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
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100 object-cover" />
                                                <div>
                                                    <div className="font-semibold text-slate-900">{u.name}</div>
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
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block">Base Salary (RM)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full border rounded px-2 py-1 text-xs"
                                                        value={editForm.baseSalary || ''}
                                                        onChange={e => setEditForm({...editForm, baseSalary: Number(e.target.value)})}
                                                        placeholder="0.00"
                                                    />
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
                                                        RM {u.baseSalary.toLocaleString()}
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
        {/* MUSIC TABLE */}
        {activeTab === 'MUSIC' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">Music Library</h2>
                    <div className="relative">
                        <input
                            type="file"
                            accept="audio/*"
                            multiple
                            onChange={handleMusicUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                        />
                        <Button disabled={isUploading} className="gap-2">
                            {isUploading ? (
                                <>Uploading...</>
                            ) : (
                                <><Upload className="w-4 h-4" /> Upload Track</>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {musicTracks.map(track => (
                        <div key={track.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                                    <Music className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-900">{track.title}</h3>
                                    <p className="text-xs text-slate-500">{track.artist}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <audio controls src={track.url} className="h-8 w-64" />
                                <Button 
                                    variant="ghost" 
                                    onClick={() => handleDeleteTrack(track.id)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {musicTracks.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No music tracks uploaded yet.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
        {/* PAYROLL TABLE */}
        {activeTab === 'PAYROLL' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Payroll Summary</h2>
                            <p className="text-sm text-slate-500">Manage salaries and deductions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4 text-center">Days Worked</th>
                                    <th className="px-6 py-4 text-center">Late (Days)</th>
                                    <th className="px-6 py-4 text-right">Base Salary</th>
                                    <th className="px-6 py-4 text-right text-red-600">Deductions</th>
                                    <th className="px-6 py-4 text-right text-green-600">Net Salary</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.filter(u => u.role !== 'ADMIN').map(u => {
                                    const [year, month] = selectedMonth.split('-').map(Number);
                                    const userRecords = records.filter(r => {
                                        const d = new Date(r.timestamp);
                                        return r.userId === u.id && 
                                               d.getMonth() + 1 === month && 
                                               d.getFullYear() === year &&
                                               r.type === 'CLOCK_IN';
                                    });

                                    const totalDays = new Set(userRecords.map(r => r.dateStr)).size;
                                    
                                    let lateOccurrences = 0;
                                    let totalDeductions = 0;

                                    userRecords.forEach(r => {
                                        if (!u.shiftStart) return;
                                        
                                        const recordTime = new Date(r.timestamp);
                                        const [shiftHour, shiftMinute] = u.shiftStart.split(':').map(Number);
                                        
                                        const shiftTime = new Date(recordTime);
                                        shiftTime.setHours(shiftHour, shiftMinute, 0, 0);

                                        // Calculate difference in minutes
                                        // We only care if they are late (recordTime > shiftTime)
                                        if (recordTime > shiftTime) {
                                            const diffMs = recordTime.getTime() - shiftTime.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);

                                            if (diffMins > 0) {
                                                lateOccurrences++;
                                                if (diffMins <= 30) {
                                                    totalDeductions += 15;
                                                } else {
                                                    totalDeductions += 25;
                                                }
                                            }
                                        }
                                    });

                                    const baseSalary = u.baseSalary || 0;
                                    const netSalary = Math.max(0, baseSalary - totalDeductions);

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
                                            <td className="px-6 py-4 text-right font-mono text-sm">
                                                RM {baseSalary.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm text-red-600">
                                                {totalDeductions > 0 ? `- RM ${totalDeductions}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm font-bold text-green-600">
                                                RM {netSalary.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary"
                                                    onClick={() => setShowPayslip(u.id)}
                                                    className="gap-2"
                                                >
                                                    <FileText className="w-4 h-4" /> Payslip
                                                </Button>
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

                        const [year, month] = selectedMonth.split('-').map(Number);
                        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                        
                        const userRecords = records.filter(r => {
                            const d = new Date(r.timestamp);
                            return r.userId === u.id && 
                                   d.getMonth() + 1 === month && 
                                   d.getFullYear() === year &&
                                   r.type === 'CLOCK_IN';
                        });

                        let totalDeductions = 0;
                        const deductionDetails: { date: string, time: string, lateMins: number, amount: number }[] = [];

                        userRecords.forEach(r => {
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

                        const baseSalary = u.baseSalary || 0;
                        const netSalary = Math.max(0, baseSalary - totalDeductions);

                        return (
                            <>
                                <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">Payslip</h2>
                                        <p className="text-slate-400">{monthName} {year}</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-lg">Chef Ammar Group</h3>
                                        <p className="text-xs text-slate-400">Strictly Private & Confidential</p>
                                    </div>
                                </div>
                                
                                <div className="p-8">
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
                                                    <span className="font-mono">RM {baseSalary.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between gap-8">
                                                    <span>Shift:</span>
                                                    <span className="font-mono">{u.shiftStart || 'N/A'} - {u.shiftEnd || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-red-500" /> Late Deductions
                                        </h4>
                                        {deductionDetails.length > 0 ? (
                                            <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-100 text-xs text-slate-500 font-semibold text-left">
                                                        <tr>
                                                            <th className="px-4 py-2">Date</th>
                                                            <th className="px-4 py-2">Time In</th>
                                                            <th className="px-4 py-2">Late By</th>
                                                            <th className="px-4 py-2 text-right">Deduction</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {deductionDetails.map((d, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 text-slate-600">{d.date}</td>
                                                                <td className="px-4 py-2 text-slate-600">{d.time}</td>
                                                                <td className="px-4 py-2 text-red-500 font-medium">{d.lateMins} mins</td>
                                                                <td className="px-4 py-2 text-right font-mono text-slate-900">RM {d.amount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">No late deductions for this period. Great job!</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-6 flex justify-between items-center border border-slate-200">
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Total Net Salary</p>
                                            <p className="text-xs text-slate-400">Base - Deductions</p>
                                        </div>
                                        <div className="text-3xl font-bold text-brand-600 font-mono">
                                            RM {netSalary.toLocaleString()}
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
      </main>
    </div>
  );
};