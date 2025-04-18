"use client";

import { useState, useEffect, useRef } from "react";

// Add proper type for WebkitAudioContext
interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

interface MicButtonProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingCancel?: () => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "primary" | "secondary" | "outline";
  maxDuration?: number; // Maximum recording duration in seconds
  className?: string;
  isRecording?: boolean; // Add this prop to sync recording state from parent
  autoStopSilence?: number; // Silence duration in ms before auto-stop (default 2000ms)
  onBeforeRecording?: () => void; // Add a callback to execute before recording starts
}

export default function MicButton({
  onRecordingComplete,
  onRecordingStart,
  onRecordingCancel,
  onBeforeRecording,
  disabled = false,
  size = "medium",
  variant = "primary",
  maxDuration = 60,
  className = "",
  isRecording: externalIsRecording,
  autoStopSilence = 2000, // Default 2 seconds of silence
}: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [hasSpeechStarted, setHasSpeechStarted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioLevelRef = useRef<number>(0);

  // Sync internal state with external state if provided
  useEffect(() => {
    if (externalIsRecording !== undefined && externalIsRecording !== isRecording) {
      if (externalIsRecording) {
        startRecording();
      } else {
        stopRecording();
      }
    }
  }, [externalIsRecording]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Size classes
  const sizeClasses = {
    small: "h-8 w-8 text-sm",
    medium: "h-10 w-10 text-base",
    large: "h-12 w-12 text-lg",
  };

  // Variant classes
  const variantClasses = {
    primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300 focus:ring-gray-300",
    outline: "bg-transparent text-gray-700 border-gray-300 hover:bg-gray-100 focus:ring-gray-300 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700",
  };

  // Recording state classes
  const recordingStateClasses = isRecording
    ? "bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500 animate-pulse"
    : variantClasses[variant];

  const buttonClasses = `relative flex items-center justify-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${sizeClasses[size]} ${recordingStateClasses} ${className}`;

  const startRecording = async () => {
    if (disabled || isRecording || isPermissionDenied) return;

    // Execute any pre-recording actions (like stopping AI speech)
    if (onBeforeRecording) {
      onBeforeRecording();
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Initialize audio context and analyser for visualizing audio levels
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as WebkitWindow).webkitAudioContext)();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        onRecordingComplete?.(audioBlob);
        setIsRecording(false);
        setRecordingDuration(0);
        setHasSpeechStarted(false);

        // Stop the visualizer
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // Stop the timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Clear silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        // Stop and release microphone
        stream.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      onRecordingStart?.();

      // Start timer
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(seconds);

        if (seconds >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Start visualizer
      visualizeAudio();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setIsPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    // Stop recording but don't save
    mediaRecorderRef.current.stop();
    onRecordingCancel?.();
  };

  // Check for silence and auto-stop
  const checkSilence = (audioLevel: number) => {
    const SILENCE_THRESHOLD = 0.05; // Adjust based on testing
    const MIN_SPEECH_LEVEL = 0.1; // Level needed to consider speech has started

    // Consider speech started if audio level is above threshold
    if (audioLevel > MIN_SPEECH_LEVEL) {
      setHasSpeechStarted(true);
      lastAudioLevelRef.current = audioLevel;

      // Clear any existing timeout when we detect speech
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }

    // Only check for silence if speech has started
    if (hasSpeechStarted) {
      // If audio level is below threshold, start silence timer
      if (audioLevel < SILENCE_THRESHOLD && lastAudioLevelRef.current > SILENCE_THRESHOLD) {
        // Start timeout for silence
        if (silenceTimeoutRef.current === null) {
          silenceTimeoutRef.current = setTimeout(() => {
            // Auto stop recording after silence period
            if (isRecording) {
              stopRecording();
            }
          }, autoStopSilence);
        }
      }
      // If audio level rises above threshold, clear the timeout
      else if (audioLevel >= SILENCE_THRESHOLD && silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }

    // Save current level for next comparison
    lastAudioLevelRef.current = audioLevel;
  };

  const visualizeAudio = () => {
    if (!analyserRef.current || !isRecording) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      analyserRef.current?.getByteFrequencyData(dataArray);

      // Calculate average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;

      // Normalize to 0-1
      const level = Math.min(1, avg / 128);
      setRecordingLevel(level);

      // Check for silence to auto-stop
      checkSilence(level);

      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isPermissionDenied}
        className={buttonClasses}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          // Stop icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
            />
          </svg>
        ) : (
          // Microphone icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        )}

        {/* Audio level visualization ring */}
        {isRecording && (
          <span
            className="absolute inset-0 rounded-full border-2 border-white dark:border-gray-800 transition-transform duration-75"
            style={{
              transform: `scale(${1 + recordingLevel * 0.5})`,
              opacity: 0.6 - recordingLevel * 0.4,
            }}
          />
        )}
      </button>

      {/* Timer display */}
      {isRecording && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white">
          {formatTime(recordingDuration)}
          {recordingDuration >= maxDuration - 10 && (
            <span className="ml-1 text-red-400">{maxDuration - recordingDuration}s</span>
          )}
        </div>
      )}

      {/* Cancel button when recording */}
      {isRecording && (
        <button
          onClick={cancelRecording}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:bg-red-700"
          aria-label="Cancel recording"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3 w-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Permission denied state */}
      {isPermissionDenied && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Microphone access denied
        </div>
      )}
    </div>
  );
}
