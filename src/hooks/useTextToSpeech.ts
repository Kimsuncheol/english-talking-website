import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseTextToSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  status: 'idle' | 'speaking' | 'paused' | 'ended' | 'error';
  error: string | null;
}

export function useTextToSpeech({
  voice = null,
  rate = 1,
  pitch = 1,
  volume = 1,
  onEnd,
  onError,
}: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(voice);
  const [currentRate, setCurrentRate] = useState<number>(rate);
  const [currentPitch, setCurrentPitch] = useState<number>(pitch);
  const [currentVolume, setCurrentVolume] = useState<number>(volume);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'speaking' | 'paused' | 'ended' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Check if browser supports speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      setError('Speech synthesis is not supported in this browser');
      if (onError) onError('Speech synthesis is not supported in this browser');
      return;
    }
    
    // Load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        
        // Set default voice if not specified
        if (!currentVoice) {
          // Try to find a voice for the user's language or default to the first voice
          const defaultVoice = availableVoices.find(
            voice => voice.default
          ) || availableVoices[0];
          
          setCurrentVoice(defaultVoice);
        }
      }
    };
    
    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Cleanup
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentVoice, onError]);
  
  // Create utterance with current settings
  const createUtterance = useCallback((text: string): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (currentVoice) {
      utterance.voice = currentVoice;
    }
    
    utterance.rate = currentRate;
    utterance.pitch = currentPitch;
    utterance.volume = currentVolume;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setStatus('speaking');
      setError(null);
    };
    
    utterance.onpause = () => {
      setIsPaused(true);
      setStatus('paused');
    };
    
    utterance.onresume = () => {
      setIsPaused(false);
      setStatus('speaking');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setStatus('ended');
      if (onEnd) onEnd();
    };
    
    utterance.onerror = (event) => {
      const errorMessage = event.error || 'An unknown error occurred';
      setError(errorMessage);
      setStatus('error');
      setIsSpeaking(false);
      setIsPaused(false);
      if (onError) onError(errorMessage);
    };
    
    return utterance;
  }, [currentVoice, currentRate, currentPitch, currentVolume, onEnd, onError]);
  
  // Speak text
  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;
    
    try {
      // Stop any current speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      const utterance = createUtterance(text);
      utteranceRef.current = utterance;
      
      window.speechSynthesis.speak(utterance);
    } catch (_: unknown) {
      setError('Error speaking text');
      setStatus('error');
      if (onError) onError('Error speaking text');
    }
  }, [isSupported, createUtterance, onError]);
  
  // Stop speaking
  const stop = useCallback(() => {
    if (!isSupported) return;
    
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setStatus('idle');
  }, [isSupported]);
  
  // Pause speaking
  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking || isPaused) return;
    
    window.speechSynthesis.pause();
    setIsPaused(true);
    setStatus('paused');
  }, [isSupported, isSpeaking, isPaused]);
  
  // Resume speaking
  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    
    window.speechSynthesis.resume();
    setIsPaused(false);
    setStatus('speaking');
  }, [isSupported, isPaused]);
  
  // Set voice
  const setVoice = useCallback((newVoice: SpeechSynthesisVoice) => {
    setCurrentVoice(newVoice);
  }, []);
  
  // Set rate
  const setRate = useCallback((newRate: number) => {
    if (newRate < 0.1) newRate = 0.1;
    if (newRate > 10) newRate = 10;
    setCurrentRate(newRate);
  }, []);
  
  // Set pitch
  const setPitch = useCallback((newPitch: number) => {
    if (newPitch < 0) newPitch = 0;
    if (newPitch > 2) newPitch = 2;
    setCurrentPitch(newPitch);
  }, []);
  
  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    if (newVolume < 0) newVolume = 0;
    if (newVolume > 1) newVolume = 1;
    setCurrentVolume(newVolume);
  }, []);
  
  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    status,
    error,
  };
}

export default useTextToSpeech;
