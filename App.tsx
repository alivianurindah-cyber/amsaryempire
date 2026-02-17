import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { StaffDashboard } from './components/StaffDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { User } from './types';
import { getSession, clearSession } from './services/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Check for existing session on boot
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
    }
    setLoading(false);
  }, []);

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full"></div>
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