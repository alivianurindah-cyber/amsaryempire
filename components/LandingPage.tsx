import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, ArrowRight, Star, Clock, ShieldCheck, Users, Music, Volume2, VolumeX, ListMusic, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
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
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
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

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

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
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate text-sm">{currentTrack.title}</h3>
                    <p className="text-xs text-slate-500 truncate">{currentTrack.artist}</p>
                </div>
                <button 
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={`p-1.5 hover:bg-slate-100 rounded-full transition-colors ${showPlaylist ? 'text-brand-600 bg-brand-50' : 'text-slate-400'}`}
                    title="Playlist"
                >
                    <ListMusic className="w-4 h-4" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 0} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
                 {/* Volume */}
                 <div className="flex items-center gap-2 group">
                    <button 
                        onClick={() => setIsMuted(!isMuted)} 
                        className="text-slate-400 hover:text-slate-600"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={isMuted ? 0 : volume} 
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                 </div>

                 {/* Playback */}
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Previous"
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 flex items-center justify-center bg-brand-600 text-white rounded-full hover:bg-brand-700 shadow-md transition-transform active:scale-95"
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button 
                        onClick={() => setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Next"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                 </div>
            </div>
            
            {/* Playlist View or Lyrics */}
            {showPlaylist ? (
                <div className="h-32 overflow-y-auto custom-scrollbar bg-slate-50/50 rounded-lg border border-slate-100">
                    {tracks.map((track, idx) => (
                        <div 
                            key={track.id}
                            onClick={() => {
                                setCurrentTrackIndex(idx);
                                setIsPlaying(true);
                            }}
                            className={`p-2 text-xs flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors ${currentTrackIndex === idx ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600'}`}
                        >
                            <div className="w-4 text-center opacity-50">
                                {currentTrackIndex === idx && isPlaying ? (
                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse mx-auto" />
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <div className="truncate flex-1">
                                {track.title}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Lyrics Scroll */
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
            )}

            <audio 
                ref={audioRef}
                src={currentTrack.url}
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)}
                className="hidden"
            />
        </div>
      )}
    </div>
  );
};