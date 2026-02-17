import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
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

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Camera and Location
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get Location
        setLoadingLocation(true);
        const locData = await getCurrentLocation();
        setLocation(locData);
        setLoadingLocation(false);

        // 2. Get Camera
        // Prefer rear camera on mobile for attendance proof if needed, but 'user' (front) is standard for selfie
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(err.message || 'Could not access camera or location.');
        setLoadingLocation(false);
      }
    };

    init();

    return () => {
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

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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
    // Mobile: Fixed full screen. Desktop: Relative card.
    <div className="fixed inset-0 w-full h-[100dvh] bg-black sm:relative sm:h-[850px] sm:max-w-md sm:mx-auto sm:rounded-3xl sm:overflow-hidden z-50 flex flex-col">
      {/* Video Stream */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Simple Guide Frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/30 rounded-full border-dashed"></div>
        </div>

        {/* Info Overlay */}
        <div className="absolute inset-x-0 top-0 p-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/50 to-transparent text-white">
             <div className="flex justify-between items-center">
                 <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                        {loadingLocation ? 'Locating...' : (location?.address ? location.address.split(',')[0] : 'GPS Fixed')}
                    </span>
                 </div>
             </div>
        </div>
      </div>

      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="bg-white p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] rounded-t-3xl -mt-6 relative z-10 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        
        <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-slate-900">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button 
            onClick={onCancel}
            className="p-3.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleCapture}
            disabled={loadingLocation || !location}
            className={clsx(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg relative overflow-hidden",
              mode === 'CLOCK_IN' ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30',
              (loadingLocation || !location) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
             <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
             </div>
          </button>

          <div className="w-12"></div> {/* Spacer for balance */}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-2 font-medium">
          {loadingLocation ? 'Acquiring precise location...' : 'Tap capture to confirm'}
        </p>
      </div>
    </div>
  );
};