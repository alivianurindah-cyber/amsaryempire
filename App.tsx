import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { StaffDashboard } from './components/StaffDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { User } from './types';
import { getSession, clearSession } from './services/auth';
import { initDB } from './services/migrations';
import { getDbStatus } from './services/db';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';
import { Button } from './components/Button';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Initialize DB and Check for existing session on boot
  const boot = async () => {
    setLoading(true);
    setDbError(null);
    
    // 1. Ensure DB tables exist
    try {
        await initDB();
    } catch (e: any) {
        console.error("Boot error during initDB:", e);
        // Error is already handled by getDbStatus check below
    }
    
    const status = getDbStatus();
    if (status.status === 'ERROR') {
        setDbError(status.error);
    }

    // 2. Check Session
    const session = getSession();
    if (session) {
      setUser(session);
    }
    setLoading(false);
    setIsRetrying(false);
  };

  useEffect(() => {
    boot();
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    boot();
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowLogin(false); // Reset for when they logout
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setShowLogin(false); // Go back to landing page on logout
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full"></div>
            <p className="text-slate-400 text-sm font-medium animate-pulse">Starting System...</p>
        </div>
    );
  }

  // Database Connection Error View
  if (dbError) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-red-100 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-red-600 p-6 flex flex-col items-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Database className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold">Connection Failed</h1>
                    <p className="text-red-100 text-sm text-center mt-1">Database authentication error</p>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-800">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold">Authentication Failed</p>
                            <p className="text-xs leading-relaxed opacity-90">{dbError}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Current Connection Info:</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-400">Database URL:</span>
                                    <span className="font-mono text-slate-600 break-all text-right ml-4">
                                        {process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@') || 
                                         (import.meta as any).env?.VITE_DATABASE_URL?.replace(/:([^@]+)@/, ':****@') || 
                                         'Not Set'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">How to fix this:</p>
                            <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                                <li>Go to your <b>Neon Console</b> (neon.tech)</li>
                                <li>Find your <b>Connection String</b> in the Dashboard</li>
                                <li>Copy the URL (ensure it starts with <code className="bg-white px-1">postgresql://</code>)</li>
                                <li>Update your <code className="bg-white px-1">VITE_DATABASE_URL</code> in the environment settings</li>
                                <li><b>Important:</b> Check for extra spaces or quotes at the start/end</li>
                            </ol>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Common Mistake:</p>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                                Ensure you replaced <code className="bg-white px-1 italic">YOUR_PASSWORD_HERE</code> with your actual password from Neon.
                            </p>
                        </div>
                        
                        <div className="pt-2 flex flex-col gap-2">
                            <Button 
                                fullWidth 
                                onClick={handleRetry} 
                                isLoading={isRetrying}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                                Retry Connection
                            </Button>
                            
                            <Button 
                                fullWidth 
                                variant="secondary" 
                                onClick={() => setDbError(null)}
                            >
                                Continue in Offline Mode
                            </Button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Chef Ammar Attendance System</p>
                </div>
            </div>
        </div>
    );
  }

  // Authenticated Views
  if (user) {
    if (user.role === 'ADMIN') {
      return <AdminDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    }
    return <StaffDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
  }

  // Public Views
  if (showLogin) {
    return <LoginPage onLogin={handleLogin} onBack={() => setShowLogin(false)} />;
  }

  return <LandingPage onEnter={() => setShowLogin(true)} />;
}

export default App;