import React, { useState, useEffect } from 'react';
import { Home, LogOut, User as UserIcon, Settings, Calendar, ChefHat, AlertCircle, Phone, MapPin, HeartPulse, Bell, Shield, ChevronRight, CheckCircle, Plus } from 'lucide-react';
import { AppView, AttendanceRecord, LocationData, User } from '../types';
import { CameraCapture } from './CameraCapture';
import { AttendanceList } from './AttendanceList';
import { AttendanceCalendar } from './AttendanceCalendar';
import { Button } from './Button';
import { verifyAttendanceImage } from '../services/geminiService';
import { updateUser } from '../services/auth';
import { getAttendanceRecords, createAttendanceRecord } from '../services/attendance';

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
    emergencyPhone: user.emergencyPhone || '',
    typhoidCertificateUrl: user.typhoidCertificateUrl || '',
    typhoidExpiryDate: user.typhoidExpiryDate || '',
    avatar: user.avatar || ''
  });

  // Check if all required fields are present (Employee ID is excluded as it is admin-managed)
  const isProfileComplete = 
    user.name && 
    user.phone && 
    user.icNumber && 
    user.homeAddress && 
    user.emergencyPhone;

  // Load records from DB on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await getAttendanceRecords(user.id);
      setRecords(data);
    };
    loadData();
  }, [user.id]);

  // Logic to determine if actions are allowed today
  const todayStr = new Date().toLocaleDateString();
  const todaysRecords = records.filter(r => r.dateStr === todayStr);
  const hasClockedInToday = todaysRecords.some(r => r.type === 'CLOCK_IN');
  const hasClockedOutToday = todaysRecords.some(r => r.type === 'CLOCK_OUT');
  const isShiftComplete = hasClockedInToday && hasClockedOutToday;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'typhoidCertificateUrl' | 'avatar') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

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
            emergencyPhone: profileForm.emergencyPhone,
            typhoidCertificateUrl: profileForm.typhoidCertificateUrl,
            typhoidExpiryDate: profileForm.typhoidExpiryDate,
            avatar: profileForm.avatar
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
    // Use simple ID generation
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
      synced: true 
    };

    // Optimistic Update
    setRecords([newRecord, ...records]);

    // Save to DB
    try {
      await createAttendanceRecord(newRecord);
    } catch (error) {
      console.error("Failed to save record to DB", error);
      alert("Failed to save attendance record. Please check your connection.");
    }
    
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

  // Render onboarding if profile incomplete
  if (!isProfileComplete) {
     return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-slate-50 flex items-center justify-center p-4 sm:relative sm:h-auto sm:bg-transparent">
             <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden my-8 max-h-[90dvh] flex flex-col">
                 <div className="bg-brand-600 px-6 py-6 flex items-center gap-3 shrink-0">
                     <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <UserIcon className="w-6 h-6 text-white" />
                     </div>
                     <div>
                        <h1 className="text-xl font-bold text-white">Staff Profile</h1>
                        <p className="text-brand-100 text-xs">Setup your personnel file</p>
                     </div>
                 </div>
                 
                 <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        {/* Form Fields - Mobile Optimized */}
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                             <input 
                                type="text"
                                required
                                value={profileForm.name}
                                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                             />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IC / Passport</label>
                            <input 
                                type="text"
                                required
                                value={profileForm.icNumber}
                                onChange={(e) => setProfileForm({...profileForm, icNumber: e.target.value})}
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                            <input 
                                type="tel"
                                required
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Emergency Contact</label>
                            <input 
                                type="tel"
                                required
                                value={profileForm.emergencyPhone}
                                onChange={(e) => setProfileForm({...profileForm, emergencyPhone: e.target.value})}
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                            <textarea 
                                required
                                rows={2}
                                value={profileForm.homeAddress}
                                onChange={(e) => setProfileForm({...profileForm, homeAddress: e.target.value})}
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                            />
                        </div>

                        {/* Typhoid Vaccination Section */}
                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-brand-500" />
                                Typhoid Vaccination
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
                                    <input 
                                        type="date"
                                        value={profileForm.typhoidExpiryDate}
                                        onChange={(e) => setProfileForm({...profileForm, typhoidExpiryDate: e.target.value})}
                                        className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Certificate Image</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'typhoidCertificateUrl')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {profileForm.typhoidCertificateUrl ? (
                                            <div className="relative">
                                                <img 
                                                    src={profileForm.typhoidCertificateUrl} 
                                                    alt="Typhoid Certificate" 
                                                    className="max-h-48 mx-auto rounded-lg shadow-sm"
                                                />
                                                <div className="mt-2 text-xs text-brand-600 font-medium">Click to replace</div>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <div className="w-10 h-10 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-600">Upload Certificate</p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            fullWidth 
                            isLoading={profileSaving}
                            className="mt-4"
                        >
                            Save Profile
                        </Button>
                        <button type="button" onClick={onLogout} className="w-full text-center text-xs text-slate-400 py-2">Sign out</button>
                    </form>
                 </div>
             </div>
        </div>
     )
  }

  // Render Dashboard Layout
  return (
    // Mobile: Full screen fixed layout. Desktop: Centered card.
    <div className="fixed inset-0 w-full h-[100dvh] bg-slate-50 font-sans text-slate-900 sm:relative sm:h-[850px] sm:max-w-md sm:mx-auto sm:shadow-2xl sm:rounded-3xl sm:overflow-hidden flex flex-col sm:border sm:border-slate-200">
      
      {/* Header - Sticky with safe area top padding */}
      <header className="bg-white px-6 py-4 sticky top-0 z-20 border-b border-slate-100 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
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
             </div>
             <div className="relative">
                <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hide pb-24 sm:pb-6">
        
        {/* DASHBOARD VIEW */}
        {view === AppView.DASHBOARD && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Status Card */}
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100 mb-6 sm:mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <h2 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Current Status</h2>
                   <div className="flex items-center gap-2">
                     <span className={`w-2.5 h-2.5 rounded-full ${hasClockedInToday && !hasClockedOutToday ? 'bg-green-500' : (isShiftComplete ? 'bg-brand-500' : 'bg-slate-300')}`}></span>
                     <span className="text-2xl font-bold text-slate-900">
                        {isShiftComplete ? 'Done' : (hasClockedInToday ? 'Active' : 'Not Started')}
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

              {isShiftComplete ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-green-900">Attendance Completed</h3>
                    <p className="text-green-700 text-sm mt-1">You have successfully clocked in and out for today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                    <Button 
                    onClick={() => handleStartCapture('CLOCK_IN')}
                    variant="primary"
                    className={!hasClockedInToday
                        ? "bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 py-4" 
                        : "bg-white text-slate-400 border border-slate-200 shadow-none hover:bg-slate-50"}
                    disabled={isProcessing || hasClockedInToday}
                    >
                    {hasClockedInToday ? 'Clocked In' : 'Clock In'}
                    </Button>
                    <Button 
                    onClick={() => handleStartCapture('CLOCK_OUT')}
                    variant="primary"
                    className={hasClockedInToday && !hasClockedOutToday
                        ? "bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 py-4" 
                        : "bg-white text-slate-400 border border-slate-200 shadow-none hover:bg-slate-50"}
                    disabled={isProcessing || !hasClockedInToday || hasClockedOutToday}
                    >
                    {hasClockedOutToday ? 'Clocked Out' : 'Clock Out'}
                    </Button>
                </div>
              )}
              
              {!isShiftComplete && (
                  <div className="mt-3 text-center">
                    <p className="text-[10px] text-slate-400">
                        * You can only Clock In and Clock Out once per day.
                    </p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                History
              </h3>
              <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{records.length} Records</span>
            </div>

            {isProcessing && (
               <div className="mb-4 p-4 bg-brand-50 border border-brand-100 text-brand-700 rounded-xl flex items-center justify-center gap-3 animate-pulse">
                  <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Processing...</span>
               </div>
            )}

            <AttendanceList records={records} />
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === AppView.CALENDAR && (
           <AttendanceCalendar records={records} />
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
                      <p className="text-sm font-medium">Updated successfully!</p>
                  </div>
               )}

               <form onSubmit={handleProfileSubmit} className="space-y-5">
                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                                {profileForm.avatar ? (
                                    <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <UserIcon className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-brand-600 text-white p-2 rounded-full shadow-md cursor-pointer hover:bg-brand-700 transition-colors">
                                <Plus className="w-4 h-4" />
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e, 'avatar')}
                                />
                            </label>
                        </div>
                    </div>

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
                                    className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IC / Passport</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    required
                                    value={profileForm.icNumber}
                                    onChange={(e) => setProfileForm({...profileForm, icNumber: e.target.value})}
                                    className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
                                    className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Emergency</label>
                            <div className="relative">
                                <input 
                                    type="tel"
                                    required
                                    value={profileForm.emergencyPhone}
                                    onChange={(e) => setProfileForm({...profileForm, emergencyPhone: e.target.value})}
                                    className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
                                    className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                                />
                                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        {/* Typhoid Vaccination Section */}
                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-brand-500" />
                                Typhoid Vaccination
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
                                    <input 
                                        type="date"
                                        value={profileForm.typhoidExpiryDate}
                                        onChange={(e) => setProfileForm({...profileForm, typhoidExpiryDate: e.target.value})}
                                        className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Certificate Image</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'typhoidCertificateUrl')}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {profileForm.typhoidCertificateUrl ? (
                                            <div className="relative">
                                                <img 
                                                    src={profileForm.typhoidCertificateUrl} 
                                                    alt="Typhoid Certificate" 
                                                    className="max-h-48 mx-auto rounded-lg shadow-sm"
                                                />
                                                <div className="mt-2 text-xs text-brand-600 font-medium">Click to replace</div>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <div className="w-10 h-10 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-600">Upload Certificate</p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        fullWidth 
                        isLoading={profileSaving}
                        className="mt-6"
                    >
                        Save Changes
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
                              <p className="text-sm font-semibold text-slate-900">Shift Reminders</p>
                              <p className="text-xs text-slate-500">Get notified before shift starts</p>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" defaultChecked />
                           <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                     </div>
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Bell className="w-5 h-5"/></div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">Announcements</p>
                              <p className="text-xs text-slate-500">Important company updates</p>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" defaultChecked />
                           <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
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
                              <p className="text-xs text-slate-500">Terms & conditions</p>
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

      {/* Navigation - Fixed Bottom with safe area padding */}
      <nav className="bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center text-slate-400 z-20 pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3 sm:absolute sm:bottom-0 sm:w-full">
         <button 
           onClick={() => setView(AppView.DASHBOARD)}
           className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.DASHBOARD ? 'text-brand-600' : 'hover:text-brand-600'}`}
         >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
         </button>
         <button 
            onClick={() => setView(AppView.CALENDAR)}
            className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.CALENDAR ? 'text-brand-600' : 'hover:text-brand-600'}`}
         >
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] font-medium">Calendar</span>
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