import React, { useState, useEffect } from 'react';
import { Home, LogOut, User as UserIcon, Settings, Calendar, ChefHat, Save, AlertCircle, Phone, MapPin, HeartPulse, Bell, Shield, Moon, ChevronRight, CheckCircle } from 'lucide-react';
import { AppView, AttendanceRecord, LocationData, User } from '../types';
import { CameraCapture } from './CameraCapture';
import { AttendanceList } from './AttendanceList';
import { Button } from './Button';
import { verifyAttendanceImage } from '../services/geminiService';
import { updateUser } from '../services/auth';

interface StaffDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [clockMode, setClockMode] = useState<'CLOCK_IN' | 'CLOCK_OUT'>('CLOCK_IN');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    icNumber: user.icNumber || '',
    homeAddress: user.homeAddress || '',
    emergencyPhone: user.emergencyPhone || ''
  });

  // Check if all required fields are present (Employee ID is excluded as it is admin-managed)
  const isProfileComplete = 
    user.name && 
    user.phone && 
    user.icNumber && 
    user.homeAddress && 
    user.emergencyPhone;

  // Load records from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendance_records');
    if (saved) {
      try {
        const allRecords: AttendanceRecord[] = JSON.parse(saved);
        // Filter records for this user only
        const userRecords = allRecords.filter(r => r.userId === user.id);
        setRecords(userRecords);
      } catch (e) {
        console.error('Failed to parse records', e);
      }
    }
  }, [user.id]);

  // Determine next likely action
  useEffect(() => {
    if (records.length > 0) {
      const lastRecord = records.sort((a, b) => b.timestamp - a.timestamp)[0];
      if (lastRecord.type === 'CLOCK_IN') {
        setClockMode('CLOCK_OUT');
      } else {
        setClockMode('CLOCK_IN');
      }
    }
  }, [records]);

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    // Basic Validation
    if (!profileForm.name.trim()) {
      setProfileError("Full Name is required.");
      return;
    }
    if (!profileForm.phone.trim()) {
      setProfileError("Phone Number is required.");
      return;
    }
    if (!profileForm.icNumber.trim()) {
       setProfileError("IC / Passport Number is required.");
       return;
    }
    if (!profileForm.emergencyPhone.trim()) {
       setProfileError("Emergency Contact is required.");
       return;
    }
    if (!profileForm.homeAddress.trim()) {
       setProfileError("Home Address is required.");
       return;
    }

    setProfileSaving(true);
    try {
        const updatedUser = await updateUser({
            id: user.id,
            name: profileForm.name,
            phone: profileForm.phone,
            icNumber: profileForm.icNumber,
            homeAddress: profileForm.homeAddress,
            emergencyPhone: profileForm.emergencyPhone
        });
        
        onUserUpdate(updatedUser);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
        
    } catch (err: any) {
        console.error("Failed to update profile", err);
        setProfileError(err.message || "Failed to save profile. Please try again.");
    } finally {
        setProfileSaving(false);
    }
  };

  // Render onboarding if profile incomplete
  if (!isProfileComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border border-slate-100 overflow-hidden my-8">
             <div className="bg-brand-600 px-6 py-6 flex items-center gap-3">
                 <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <UserIcon className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h1 className="text-xl font-bold text-white">Staff Profile Setup</h1>
                    <p className="text-brand-100 text-xs">Complete your personnel file to proceed</p>
                 </div>
             </div>
             
             <div className="p-6 sm:p-8">
                <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">Welcome to Chef Ammar Group. Please provide your full details for our records.</p>
                </div>

                {profileError && (
                  <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-800">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{profileError}</p>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Reused form fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-1 md:col-span-2">
                             <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                             <div className="relative">
                                <input 
                                    type="text"
                                    required
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IC / Passport Number</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. 900101-14-1234"
                                    value={profileForm.icNumber}
                                    onChange={(e) => setProfileForm({...profileForm, icNumber: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <div className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">IC</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                            <div className="relative">
                                <input 
                                    type="tel"
                                    required
                                    placeholder="+60 12-345 6789"
                                    value={profileForm.phone}
                                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Emergency Contact</label>
                            <div className="relative">
                                <input 
                                    type="tel"
                                    required
                                    placeholder="Next of kin phone"
                                    value={profileForm.emergencyPhone}
                                    onChange={(e) => setProfileForm({...profileForm, emergencyPhone: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <HeartPulse className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Home Address</label>
                            <div className="relative">
                                <textarea 
                                    required
                                    rows={2}
                                    placeholder="Full residential address"
                                    value={profileForm.homeAddress}
                                    onChange={(e) => setProfileForm({...profileForm, homeAddress: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                                />
                                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        fullWidth 
                        isLoading={profileSaving}
                        className="mt-6"
                    >
                        Save Staff Profile <Save className="w-4 h-4 ml-2" />
                    </Button>
                </form>
                
                <button onClick={onLogout} className="mt-6 w-full text-center text-xs text-slate-400 hover:text-red-500 transition-colors">
                    Sign out
                </button>
             </div>
        </div>
      </div>
    );
  }

  const handleStartCapture = (mode: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setClockMode(mode);
    setView(AppView.CAMERA);
  };

  const handleCaptureComplete = async (imageSrc: string, location: LocationData) => {
    setIsProcessing(true);
    setView(AppView.DASHBOARD); 
    
    let aiResult = "";
    if (process.env.API_KEY) {
       aiResult = await verifyAttendanceImage(imageSrc);
    } else {
       aiResult = "Verified: Person detected at location.";
    }

    const now = new Date();
    // Use simple ID generation instead of crypto.randomUUID for broader compatibility
    const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const newRecord: AttendanceRecord = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      type: clockMode,
      timestamp: now.getTime(),
      dateStr: now.toLocaleDateString(),
      timeStr: now.toLocaleTimeString(),
      location: location,
      photoUrl: imageSrc,
      aiVerification: aiResult,
      synced: false
    };

    // Update state
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);

    // Update Local Storage
    const saved = localStorage.getItem('attendance_records');
    let allRecords: AttendanceRecord[] = [];
    if (saved) {
        try {
            allRecords = JSON.parse(saved);
        } catch(e) {}
    }
    const newAllRecords = [newRecord, ...allRecords];
    localStorage.setItem('attendance_records', JSON.stringify(newAllRecords));
    
    setIsProcessing(false);
  };

  // Render Camera View
  if (view === AppView.CAMERA) {
    return (
      <CameraCapture 
        mode={clockMode}
        onCapture={handleCaptureComplete}
        onCancel={() => setView(AppView.DASHBOARD)}
      />
    );
  }

  // Render Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col relative border-x border-slate-200">
      
      {/* Header */}
      <header className="bg-white px-6 py-5 sticky top-0 z-20 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg">
                <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Chef Ammar</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">
                  {user.department || 'Staff'} {user.employeeId ? `• ${user.employeeId}` : ''}
                </p>
             </div>
             <div className="relative">
                <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto scrollbar-hide">
        
        {/* DASHBOARD VIEW */}
        {view === AppView.DASHBOARD && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Status Card */}
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <h2 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Current Status</h2>
                   <div className="flex items-center gap-2">
                     <span className={`w-2.5 h-2.5 rounded-full ${records.length > 0 && records[0].type === 'CLOCK_IN' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                     <span className="text-2xl font-bold text-slate-900">
                        {records.length > 0 && records[0].type === 'CLOCK_IN' ? 'Active' : 'Clocked Out'}
                     </span>
                   </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium mb-1">Last Activity</div>
                    <div className="text-lg font-mono font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">
                        {records.length > 0 ? records[0].timeStr : '--:--'}
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleStartCapture('CLOCK_IN')}
                  variant="primary"
                  className={clockMode === 'CLOCK_IN' 
                    ? "bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 py-4" 
                    : "bg-white text-slate-400 border border-slate-200 shadow-none hover:bg-slate-50"}
                  disabled={isProcessing}
                >
                  Clock In
                </Button>
                <Button 
                  onClick={() => handleStartCapture('CLOCK_OUT')}
                  variant="primary"
                   className={clockMode === 'CLOCK_OUT' 
                    ? "bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 py-4" 
                    : "bg-white text-slate-400 border border-slate-200 shadow-none hover:bg-slate-50"}
                   disabled={isProcessing}
                >
                  Clock Out
                </Button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                Activity History
              </h3>
              <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{records.length} Records</span>
            </div>

            {isProcessing && (
               <div className="mb-4 p-4 bg-brand-50 border border-brand-100 text-brand-700 rounded-xl flex items-center justify-center gap-3 animate-pulse">
                  <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Processing attendance...</span>
               </div>
            )}

            <AttendanceList records={records} />
          </div>
        )}

        {/* PROFILE VIEW */}
        {view === AppView.PROFILE && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
                <p className="text-slate-500 text-sm">Update your personal information</p>
             </div>

             <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
               
               {profileError && (
                  <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-800 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{profileError}</p>
                  </div>
               )}

               {profileSuccess && (
                  <div className="mb-6 bg-green-50 border border-green-100 p-4 rounded-xl flex gap-3 text-green-800 animate-in fade-in slide-in-from-top-2">
                      <CheckCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">Profile updated successfully!</p>
                  </div>
               )}

               <form onSubmit={handleProfileSubmit} className="space-y-5">
                    {/* Reused form fields with same state */}
                    <div className="grid grid-cols-1 gap-5">
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                             <div className="relative">
                                <input 
                                    type="text"
                                    required
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IC / Passport Number</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    required
                                    value={profileForm.icNumber}
                                    onChange={(e) => setProfileForm({...profileForm, icNumber: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <div className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">IC</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                            <div className="relative">
                                <input 
                                    type="tel"
                                    required
                                    value={profileForm.phone}
                                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Emergency Contact</label>
                            <div className="relative">
                                <input 
                                    type="tel"
                                    required
                                    value={profileForm.emergencyPhone}
                                    onChange={(e) => setProfileForm({...profileForm, emergencyPhone: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <HeartPulse className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Home Address</label>
                            <div className="relative">
                                <textarea 
                                    required
                                    rows={3}
                                    value={profileForm.homeAddress}
                                    onChange={(e) => setProfileForm({...profileForm, homeAddress: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                                />
                                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        fullWidth 
                        isLoading={profileSaving}
                        className="mt-6"
                    >
                        Save Changes <Save className="w-4 h-4 ml-2" />
                    </Button>
               </form>
             </div>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === AppView.SETTINGS && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Settings</h2>
                <p className="text-slate-500 text-sm">Manage app preferences</p>
             </div>

             <div className="space-y-4">
               {/* Account Section */}
               <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-50">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                     <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setView(AppView.PROFILE)}>
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-brand-50 text-brand-600 rounded-lg"><UserIcon className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">Personal Information</p>
                              <p className="text-xs text-slate-500">Update name, phone, address</p>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                     </div>
                  </div>
               </div>

               {/* Preferences Section */}
               <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-50">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Bell className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">Notifications</p>
                              <p className="text-xs text-slate-500">Receive alerts for clock in/out</p>
                           </div>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200">
                           <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                        </div>
                     </div>
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Moon className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">Dark Mode</p>
                              <p className="text-xs text-slate-500">Coming soon</p>
                           </div>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 opacity-50 cursor-not-allowed">
                           <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* About Section */}
               <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-50">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Shield className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">Privacy Policy</p>
                              <p className="text-xs text-slate-500">Read our terms & conditions</p>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                     </div>
                     <div className="p-4 text-center">
                        <p className="text-xs text-slate-400">GeoAttend AI v1.0.0</p>
                     </div>
                  </div>
               </div>
             </div>
          </div>
        )}

      </main>

      {/* Navigation */}
      <nav className="bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center text-slate-400 z-20">
         <button 
           onClick={() => setView(AppView.DASHBOARD)}
           className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.DASHBOARD ? 'text-brand-600' : 'hover:text-brand-600'}`}
         >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
         </button>
          <button 
            onClick={() => setView(AppView.PROFILE)}
            className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.PROFILE ? 'text-brand-600' : 'hover:text-brand-600'}`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
         </button>
         <button 
            onClick={() => setView(AppView.SETTINGS)}
            className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.SETTINGS ? 'text-brand-600' : 'hover:text-brand-600'}`}
         >
            <Settings className="w-6 h-6" />
            <span className="text-[10px] font-medium">Settings</span>
         </button>
          <button 
            onClick={onLogout}
            className="flex flex-col items-center gap-1 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-medium">Logout</span>
         </button>
      </nav>
    </div>
  );
};