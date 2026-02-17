import React from 'react';
import { ChefHat, ArrowRight, Star, Clock, ShieldCheck, Users } from 'lucide-react';
import { Button } from './Button';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-brand-600 p-2 rounded-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Chef Ammar</span>
        </div>
        <Button onClick={onEnter} variant="ghost" className="hidden sm:inline-flex">
          Staff Portal
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Star className="w-4 h-4 fill-brand-700" />
          <span>Premier Culinary Services</span>
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 tracking-tight mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Excellence in <span className="text-brand-600">Taste</span> & Service
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          Welcome to the official staff management portal for Chef Ammar. 
          Streamlining operations to deliver the finest dining experience.
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <Button 
            onClick={onEnter} 
            className="rounded-full px-8 py-4 text-lg shadow-xl shadow-brand-500/20 hover:shadow-brand-500/30 transition-all transform hover:-translate-y-1"
          >
            Access Employee Portal <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-24 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 mx-auto text-brand-600">
                    <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Precise Scheduling</h3>
                <p className="text-slate-500 text-sm">Efficient time tracking for kitchen and service staff.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 mx-auto text-brand-600">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Verified Attendance</h3>
                <p className="text-slate-500 text-sm">Secure location-based clock-ins with AI verification.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 mx-auto text-brand-600">
                    <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Team Coordination</h3>
                <p className="text-slate-500 text-sm">Seamless management for our growing culinary family.</p>
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100">
        <p>&copy; {new Date().getFullYear()} Chef Ammar Group. All rights reserved.</p>
      </footer>
    </div>
  );
};
