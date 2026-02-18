import React, { useState } from 'react';
import { ArrowRight, Lock, User as UserIcon, Briefcase, AtSign, ChefHat, ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { login, register, setSession } from '../services/auth';
import { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (!isLogin && !fullName.trim()) {
      setError('Name is required for registration');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let user: User;
      if (isLogin) {
        user = await login(username, password);
      } else {
        user = await register(username, password, fullName, department);
      }
      
      setSession(user);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-slate-50 relative">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 p-2 rounded-full bg-white text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div className="flex flex-col gap-6 w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-brand-600 px-8 py-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 p-3 rounded-xl mb-4 backdrop-blur-sm shadow-inner">
                   <ChefHat className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Chef Ammar</h1>
                <p className="text-brand-100 text-sm mt-1 font-medium">Internal Staff Portal</p>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-slate-800">
                  {isLogin ? 'Welcome Back' : 'Join the Team'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {isLogin ? 'Please sign in to access your dashboard' : 'Register your employee account'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Registration Fields */}
                {!isLogin && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jane Doe"
                          className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                        />
                        <div className="absolute left-3 top-3.5 text-slate-400">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role / Department</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Sous Chef"
                          className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                        />
                        <div className="absolute left-3 top-3.5 text-slate-400">
                          <Briefcase className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute left-3 top-3.5 text-slate-400">
                      <AtSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-base px-4 py-3 pl-11 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute left-3 top-3.5 text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  fullWidth 
                  isLoading={isLoading}
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-semibold shadow-lg shadow-brand-500/20"
                >
                  {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')} 
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-sm">
                  {isLogin ? "New staff member?" : "Already registered?"}
                  <button 
                    onClick={toggleMode}
                    className="ml-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors"
                  >
                    {isLogin ? "Register now" : "Sign in"}
                  </button>
                </p>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};