import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions for the Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  onend: () => void;
}

// Type definitions for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoStart?: boolean;
  onError?: (error: string) => void;
}

interface UseSpeechToTextReturn {
  text: string;
  interimText: string;
  isListening: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetText: () => void;
  supported: boolean;
}

export function useSpeechToText({
  language = 'en-US',
  continuous = false,
  interimResults = true,
  autoStart = false,
  onError,
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [text, setText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean>(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Check if browser supports Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setSupported(false);
      setError('Speech recognition is not supported in this browser');
      if (onError) onError('Speech recognition is not supported in this browser');
      return;
    }
  }, [onError]);
  
  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) return null;
    
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = event.error;
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsListening(false);
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += ' ' + transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setText((prev) => prev + finalTranscript);
      }
      
      setInterimText(interimTranscript);
    };
    
    return recognition;
  }, [language, continuous, interimResults, onError]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (!supported) return;
    
    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        // Handles cases where recognition has already started
        console.error('Speech recognition error:', error);
      }
    }
  }, [supported, initializeRecognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);
  
  // Reset text
  const resetText = useCallback(() => {
    setText('');
    setInterimText('');
  }, []);
  
  // Auto start if enabled
  useEffect(() => {
    if (autoStart) {
      startListening();
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [autoStart, startListening]);
  
  return {
    text,
    interimText,
    isListening,
    error,
    startListening,
    stopListening,
    resetText,
    supported,
  };
}

export default useSpeechToText;
