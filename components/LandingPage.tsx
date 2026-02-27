import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, ArrowRight, Star, Clock, ShieldCheck, Users, Music, Volume2, VolumeX } from 'lucide-react';
import { Button } from './Button';
import { getMusicTracks } from '../services/music';
import { MusicTrack } from '../types';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compliance
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const loadTracks = async () => {
      const t = await getMusicTracks();
      if (t.length > 0) {
        setTracks(t);
        setIsPlaying(true);
      }
    };
    loadTracks();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Autoplay prevented:", error);
                setIsPlaying(false);
            });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const currentTrack = tracks[currentTrackIndex];

  return (
    <div className="min-h-[100dvh] bg-white font-sans text-slate-900 flex flex-col relative overflow-hidden">
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20 pt-8 sm:pt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Star className="w-4 h-4 fill-brand-700" />
          <span>Premier Culinary Services</span>
        </div>
        
        <h1 className="text-4xl sm:text-7xl font-bold text-slate-900 tracking-tight mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 sm:mt-24 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
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

      {/* Music Player Overlay */}
      {currentTrack && (
        <div className="fixed bottom-6 left-6 z-50 max-w-xs w-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom-10 duration-700 hidden sm:block">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 animate-pulse">
                    <Music className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{currentTrack.title}</h3>
                    <p className="text-xs text-slate-500 truncate">{currentTrack.artist}</p>
                </div>
                <button 
                    onClick={() => {
                        setIsMuted(!isMuted);
                        if (!isPlaying) setIsPlaying(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>
            
            {/* Lyrics Scroll */}
            <div className="h-32 overflow-y-auto text-xs text-slate-600 space-y-2 pr-2 custom-scrollbar bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                {currentTrack.lyrics ? (
                    <p className="whitespace-pre-line leading-relaxed font-medium">{currentTrack.lyrics}</p>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <Music className="w-4 h-4" />
                        <span className="italic">Instrumental</span>
                    </div>
                )}
            </div>

            <audio 
                ref={audioRef}
                src={currentTrack.url}
                muted={isMuted}
                onEnded={() => setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)}
                className="hidden"
            />
        </div>
      )}
    </div>
  );
};