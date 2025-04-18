"use client";

import { useState, useEffect, useRef } from "react";

interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

interface VoicePlayerProps {
  audioUrl: string | Blob;
  autoPlay?: boolean;
  showWaveform?: boolean;
  size?: "small" | "medium" | "large";
  theme?: "default" | "minimal" | "gradient" | "dark";
  className?: string;
  onPlayComplete?: () => void;
}

export default function VoicePlayer({
  audioUrl,
  autoPlay = false,
  showWaveform = true,
  size = "medium",
  theme = "default",
  className = "",
  onPlayComplete,
}: VoicePlayerProps) {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [volume, setVolume] = useState(1);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  
  // Size classes
  const sizeClasses = {
    small: "h-10 text-xs",
    medium: "h-14 text-sm",
    large: "h-16 text-base",
  };

  // Theme classes
  const themeClasses = {
    default: "bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700",
    minimal: "bg-transparent border-none",
    gradient: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none",
    dark: "bg-gray-900 border border-gray-800 text-white shadow-md",
  };

  // Player classes
  const playerClasses = `relative flex items-center rounded-xl transition-all duration-300 p-1.5 ${sizeClasses[size]} ${themeClasses[theme]} ${className} ${isHovering ? 'ring-2 ring-blue-500/25 dark:ring-blue-400/20' : ''}`;

  // Initialize audio context and element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplaythrough', handleCanPlay);
    
    // Cleanup function
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (sourceRef.current && audioContextRef.current) {
        sourceRef.current.disconnect();
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Set source when audioUrl changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    
    if (typeof audioUrl === 'string') {
      audioRef.current.src = audioUrl;
    } else {
      const objectUrl = URL.createObjectURL(audioUrl);
      audioRef.current.src = objectUrl;
      
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
    
    if (autoPlay) {
      playAudio();
    }
  }, [audioUrl, autoPlay]);

  // Set up audio visualizer
  useEffect(() => {
    if (!audioRef.current || !showWaveform) return;

    const setupAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || 
          (window as unknown as WebkitWindow).webkitAudioContext)();
      }
      
      if (!analyserRef.current && audioContextRef.current && audioRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
      
      generateWaveform();
    };

    if (audioRef.current.readyState >= 2) {
      setupAudioContext();
    } else {
      audioRef.current.addEventListener('canplay', setupAudioContext, { once: true });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('canplay', setupAudioContext);
      }
    };
  }, [showWaveform]);

  // Apply volume and playback speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, playbackSpeed]);

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !showWaveform || waveformData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const drawWaveform = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      // Get theme colors
      let primaryColor, secondaryColor;
      if (theme === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#4F46E5');
        primaryColor = gradient;
        secondaryColor = 'rgba(255, 255, 255, 0.3)';
      } else if (theme === 'dark') {
        primaryColor = '#3b82f6';
        secondaryColor = 'rgba(75, 85, 99, 0.6)';
      } else {
        primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary') || '#3b82f6';
        secondaryColor = theme === 'minimal' ? 'rgba(203, 213, 225, 0.5)' : '#e5e7eb';
        
        if (document.documentElement.classList.contains('dark')) {
          secondaryColor = theme === 'minimal' ? 'rgba(71, 85, 105, 0.5)' : '#374151';
        }
      }
      
      // Calculate progress position
      const progressPosition = isNaN(currentTime) || isNaN(duration) || duration === 0 
        ? 0 
        : (currentTime / duration) * width;
      
      // Draw background bars
      waveformData.forEach((value, index) => {
        const x = index * (width / waveformData.length);
        const barWidth = (width / waveformData.length) * 0.8;
        const barHeight = Math.max(0.1, value * (height * 0.7));  // Ensure minimum height
        
        // Round the bars - ensure radius is always positive and at least 0.1
        const radius = Math.max(0.1, Math.min(barHeight / 2, barWidth / 2, 4));
        
        // Draw rounded rect for all bars
        ctx.beginPath();
        ctx.moveTo(x + radius, (height - barHeight) / 2);
        ctx.lineTo(x + barWidth - radius, (height - barHeight) / 2);
        ctx.arcTo(x + barWidth, (height - barHeight) / 2, x + barWidth, (height - barHeight) / 2 + radius, radius);
        ctx.lineTo(x + barWidth, (height - barHeight) / 2 + barHeight - radius);
        ctx.arcTo(x + barWidth, (height - barHeight) / 2 + barHeight, x + barWidth - radius, (height - barHeight) / 2 + barHeight, radius);
        ctx.lineTo(x + radius, (height - barHeight) / 2 + barHeight);
        ctx.arcTo(x, (height - barHeight) / 2 + barHeight, x, (height - barHeight) / 2 + barHeight - radius, radius);
        ctx.lineTo(x, (height - barHeight) / 2 + radius);
        ctx.arcTo(x, (height - barHeight) / 2, x + radius, (height - barHeight) / 2, radius);
        ctx.closePath();
        
        // Fill with appropriate color
        ctx.fillStyle = x < progressPosition ? primaryColor : secondaryColor;
        ctx.fill();
      });
    };
    
    drawWaveform();
  }, [waveformData, currentTime, duration, showWaveform, theme]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setIsVolumeOpen(false);
        setIsSpeedOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Event handlers
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      updateVisualization();
    }
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onPlayComplete?.();
  };
  
  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load audio");
  };
  
  const handleCanPlay = () => {
    setIsLoading(false);
  };

  // Control functions
  const playAudio = () => {
    if (!audioRef.current) return;
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(err => {
        console.error("Error playing audio:", err);
        setError("Failed to play audio");
      });
  };
  
  const pauseAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  };
  
  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  // Visualization functions
  const updateVisualization = () => {
    if (!analyserRef.current || !showWaveform || !isPlaying) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const normalizedData = Array.from(dataArray).map(value => value / 255);
    
    // Only update if values changed significantly
    const sum = normalizedData.reduce((acc, val) => acc + val, 0);
    
    if (Math.abs(sum - waveformData.reduce((acc, val) => acc + val, 0)) > 0.5) {
      setWaveformData(normalizedData);
    }
    
    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  };
  
  const generateWaveform = () => {
    if (!audioRef.current) return;
    
    const numBars = 40; // Increased bar count for more detailed visualization
    // Generate a more realistic-looking waveform with a more organic pattern
    const fakeWaveform = Array(numBars).fill(0).map((_, i) => {
      // Create a bell curve effect
      const x = i / (numBars - 1); // Normalize to 0-1
      const bellCurve = Math.sin(x * Math.PI); // Values are higher in the middle
      
      // Add some randomness but keep the bell shape
      // More controlled randomness for a smoother waveform
      const randomFactor = Math.sin(i * 0.5) * 0.25 + Math.random() * 0.25;
      return bellCurve * 0.6 + randomFactor;
    });
    setWaveformData(fakeWaveform);
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current play progress percentage
  const getPlayProgress = () => {
    if (isNaN(currentTime) || isNaN(duration) || duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  return (
    <div 
      className={playerClasses} 
      ref={playerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Loading or error overlay */}
      {(isLoading || error) && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/5 backdrop-blur-[1px] dark:bg-white/5 z-10">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <svg className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="mt-2 text-xs text-gray-600 dark:text-gray-400">Loading audio</span>
            </div>
          ) : (
            <div className="flex items-center text-red-500 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Failed to load</span>
            </div>
          )}
        </div>
      )}

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isLoading || !!error}
        className={`group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full 
          ${theme === 'gradient' || theme === 'dark'
            ? 'text-white bg-white/10 hover:bg-white/20' 
            : 'text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40'
          } transition-all duration-200 disabled:opacity-50`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        <span className={`absolute inset-0 rounded-full bg-current opacity-0 
          ${isPlaying ? 'animate-ping-slow opacity-20' : ''}`}></span>
        
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 ml-0.5">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      
      {/* Waveform visualization */}
      <div 
        className="relative h-full flex-1 cursor-pointer px-2 mx-1"
        onClick={seekAudio}
      >
        {showWaveform ? (
          <>
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              width={300}
              height={40}
            />
            <div 
              className={`absolute left-0 bottom-0 h-0.5 
                ${theme === 'gradient' ? 'bg-white/40' : theme === 'dark' ? 'bg-blue-500/40' : 'bg-blue-500/30 dark:bg-blue-400/30'} 
                transition-all duration-100 rounded-full`}
              style={{ width: `${getPlayProgress()}%` }}
            />
          </>
        ) : (
          // Simple progress bar (no waveform)
          <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div 
              className={`h-full rounded-full ${theme === 'gradient' ? 'bg-white' : theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600 dark:bg-blue-500'} transition-all duration-100`} 
              style={{ width: `${getPlayProgress()}%` }}
            />
          </div>
        )}
        
        {/* Timestamp marker (appears on hover) */}
        {isHovering && (
          <div className={`absolute bottom-0 px-1.5 py-0.5 rounded text-[10px] font-medium
            ${theme === 'gradient' ? 'bg-white/20 text-white' : 
             theme === 'dark' ? 'bg-gray-800 text-gray-200' : 
             'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
            {formatTime(currentTime)}
          </div>
        )}
        
        {/* Total duration display */}
        <div className={`absolute bottom-0 right-0 text-[10px] font-medium
          ${theme === 'gradient' ? 'text-white/80' : 
           theme === 'dark' ? 'text-gray-300' : 
           'text-gray-500 dark:text-gray-400'}`}>
          {formatTime(duration)}
        </div>
      </div>
      
      {/* Controls section */}
      <div className="flex items-center space-x-1">
        {/* Volume control */}
        <div className="relative">
          <button
            onClick={() => setIsVolumeOpen(!isVolumeOpen)}
            className={`flex h-8 w-8 items-center justify-center rounded-full 
              ${theme === 'gradient' || theme === 'dark'
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              } transition-colors duration-200`}
            aria-label="Adjust volume"
          >
            {volume === 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            )}
          </button>
          
          {isVolumeOpen && (
            <div className={`absolute bottom-full right-0 mb-2 rounded-lg p-3 shadow-lg
              ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-2 w-24 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700"
                style={{
                  backgroundImage: `linear-gradient(to right, ${theme === 'gradient' ? '#4F46E5' : theme === 'dark' ? '#3b82f6' : '#3b82f6'} 0%, ${theme === 'gradient' ? '#3B82F6' : theme === 'dark' ? '#3b82f6' : '#3b82f6'} ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
                }}
                aria-label="Adjust volume level"
              />
            </div>
          )}
        </div>
        
        {/* Playback speed control */}
        <div className="relative">
          <button
            onClick={() => setIsSpeedOpen(!isSpeedOpen)}
            className={`flex h-7 items-center justify-center rounded-full px-2.5
              ${theme === 'gradient' || theme === 'dark'
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              } transition-colors duration-200 text-xs font-medium`}
            aria-label="Change playback speed"
          >
            {playbackSpeed}×
          </button>
          
          {isSpeedOpen && (
            <div className={`absolute bottom-full right-0 mb-2 flex flex-col overflow-hidden rounded-lg shadow-lg z-10
              ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    setIsSpeedOpen(false);
                  }}
                  className={`px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700
                    ${playbackSpeed === speed ? 
                      theme === 'gradient' ? 'bg-blue-600 text-white hover:bg-blue-600' : 
                      theme === 'dark' ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/20' : 
                      'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
