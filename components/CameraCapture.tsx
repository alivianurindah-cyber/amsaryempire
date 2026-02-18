import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, MapPin, RefreshCw, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from './Button';
import { LocationData } from '../types';
import { getCurrentLocation } from '../services/locationService';

interface CameraCaptureProps {
  onCapture: (imageSrc: string, location: LocationData) => void;
  onCancel: () => void;
  mode: 'CLOCK_IN' | 'CLOCK_OUT';
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel, mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Camera and Location
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // 1. Get Location
        if (mounted) setLoadingLocation(true);
        const locData = await getCurrentLocation();
        if (mounted) {
            setLocation(locData);
            setLoadingLocation(false);
        }

        // 2. Get Camera
        // iOS requires explicit audio: false if not needed to avoid interrupting background music/calls aggressively
        // We use { ideal: 720 } but iOS often chooses its own resolution close to this.
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
              facingMode: 'user', 
              width: { ideal: 1280 }, 
              height: { ideal: 720 } 
          },
          audio: false
        });
        
        if (mounted) {
            setStream(mediaStream);
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              // Explicitly play() for iOS compatibility
              videoRef.current.onloadedmetadata = () => {
                  videoRef.current?.play().catch(e => console.warn("Video play failed:", e));
              };
            }
        } else {
            // Clean up if component unmounted during async
            mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
        if (mounted) {
            setError(err.message || 'Could not access camera or location. Ensure permissions are granted.');
            setLoadingLocation(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !location) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match actual video stream dimension (handles iOS rotations)
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 1. Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Add Watermark Overlay
    // Gradient background for text legibility
    const gradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // Text Settings
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Draw Date & Time
    const dateStr = new Date().toLocaleString([], { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    // Dynamically size font based on image width
    const fontSize = Math.max(16, Math.floor(canvas.width / 25));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(dateStr, 20, canvas.height - (fontSize * 2));

    // Draw Location
    const locStr = location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
    ctx.font = `${Math.floor(fontSize * 0.7)}px sans-serif`;
    
    // Truncate if too long
    const maxTextWidth = canvas.width - 40;
    let truncatedLoc = locStr;
    if (ctx.measureText(truncatedLoc).width > maxTextWidth) {
        // Simple truncation to fit
        const charWidth = ctx.measureText("A").width;
        const maxChars = Math.floor(maxTextWidth / charWidth);
        truncatedLoc = locStr.substring(0, maxChars - 3) + '...';
    }
    ctx.fillText(truncatedLoc, 20, canvas.height - (fontSize * 0.8));

    // Draw "Verified" Badge
    ctx.fillStyle = mode === 'CLOCK_IN' ? '#4ade80' : '#f87171'; // Green or Red
    ctx.fillRect(20, canvas.height - (fontSize * 3.5), 10, 10);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(fontSize * 0.5)}px sans-serif`;
    ctx.fillText(mode.replace('_', ' '), 35, canvas.height - (fontSize * 3.1));

    // Generate image data
    const imageSrc = canvas.toDataURL('image/jpeg', 0.85);
    onCapture(imageSrc, location);
  }, [location, mode, currentTime, onCapture]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] w-full p-6 text-center bg-white sm:h-[850px] sm:max-w-md sm:mx-auto sm:rounded-3xl sm:border sm:border-slate-200">
        <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Camera Access Required</h3>
        <p className="text-slate-500 mb-6 text-sm max-w-xs">{error}</p>
        <Button onClick={onCancel} variant="secondary">Cancel Action</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-black sm:relative sm:h-[850px] sm:max-w-md sm:mx-auto sm:rounded-3xl sm:overflow-hidden z-50 flex flex-col">
      {/* Video Stream */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none" 
          /* scale-x-[-1] mirrors the user-facing camera for natural feel */
        />
        
        {/* Simple Guide Frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/30 rounded-full border-dashed"></div>
        </div>

        {/* Info Overlay */}
        <div className="absolute inset-x-0 top-0 p-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/50 to-transparent text-white">
             <div className="flex justify-between items-center">
                 <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                    <div className={clsx("w-2 h-2 rounded-full", loadingLocation ? "bg-yellow-400 animate-pulse" : "bg-green-400")}></div>
                    <span className="text-xs font-medium">
                        {loadingLocation ? 'Locating...' : 'GPS Locked'}
                    </span>
                 </div>
                 <button onClick={onCancel} className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-white hover:bg-black/50 transition-colors">
                    Cancel
                 </button>
             </div>
        </div>
      </div>

      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="bg-white p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] rounded-t-3xl -mt-6 relative z-10 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        
        {/* Location Verification Section */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-2">
             <div className="flex items-start gap-3 mb-3">
                <div className="bg-white p-2 rounded-lg shadow-sm text-brand-600 mt-1">
                    <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Location</p>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {loadingLocation ? 'Fetching precise address...' : (location?.address || 'Unknown Location')}
                    </p>
                    {location && !loadingLocation && (
                       <p className="text-xs text-slate-500 mt-1">Accuracy: ~{Math.round(location.accuracy)} meters</p>
                    )}
                </div>
             </div>

             {/* Confirmation Checkbox */}
             <button 
                onClick={() => !loadingLocation && setIsLocationConfirmed(!isLocationConfirmed)}
                disabled={loadingLocation || !location}
                className={clsx(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isLocationConfirmed 
                        ? "bg-green-50 border-green-200 text-green-800" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
             >
                {isLocationConfirmed ? (
                    <CheckSquare className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                    <Square className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-medium text-left">
                    I confirm this is my correct location
                </span>
             </button>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button 
            onClick={() => {
                setLoadingLocation(true);
                setLocation(null);
                getCurrentLocation().then(loc => {
                    setLocation(loc);
                    setLoadingLocation(false);
                });
            }}
            className="p-3.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Refresh Location"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleCapture}
            disabled={loadingLocation || !location || !isLocationConfirmed}
            className={clsx(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg relative overflow-hidden",
              mode === 'CLOCK_IN' ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30',
              (loadingLocation || !location || !isLocationConfirmed) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
             <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
             </div>
          </button>

          <div className="w-12"></div> {/* Spacer for balance */}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-2 font-medium">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {currentTime.toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};