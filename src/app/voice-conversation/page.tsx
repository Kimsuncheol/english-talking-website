"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageCircle, BrainCog, Volume, Smile } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useLanguage } from '@/lib/LanguageContext';
import { auth } from '@/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { saveTalkHistory } from '@/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function VoiceConversationPage() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const { language, languageLevel, languageCode, getSystemMessage } = useLanguage();
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on first load and check system color scheme
  useEffect(() => {
    let welcomeMessage = "";
    
    // Set welcome message based on the selected language
    switch(language) {
      case 'spanish':
        welcomeMessage = "¡Hola! Soy tu compañero de conversación AI. Estoy aquí para hablar sobre cualquier tema que desees. ¡Toca el círculo y podemos empezar a chatear!";
        break;
      case 'french':
        welcomeMessage = "Bonjour ! Je suis votre compagnon de conversation IA. Je suis là pour parler de tout ce dont vous aimeriez discuter. Appuyez sur le cercle et nous pourrons commencer à discuter !";
        break;
      case 'german':
        welcomeMessage = "Hallo! Ich bin dein KI-Gesprächspartner. Ich bin hier, um über alles zu sprechen, was du möchtest. Tippe auf den Kreis und wir können anfangen zu chatten!";
        break;
      case 'japanese':
        welcomeMessage = "こんにちは！私はあなたのAIチャット相手です。あなたが話したいことについて話し合うためにここにいます。円をタップして、チャットを始めましょう！";
        break;
      case 'korean':
        welcomeMessage = "안녕하세요! 저는 당신의 AI 대화 상대입니다. 원하는 어떤 주제에 대해서도 대화할 수 있습니다. 원을 탭하면 채팅을 시작할 수 있습니다!";
        break;
      case 'chinese':
        welcomeMessage = "你好！我是你的AI聊天伙伴。我可以和你聊任何你想聊的话题。点击圆圈，我们就可以开始聊天了！";
        break;
      default:
        welcomeMessage = "Hi there! I'm your friendly AI chat companion. I'm here to talk about anything you'd like. Just tap the circle and we can start chatting!";
    }
    
    const message = {
      id: Date.now().toString(),
      role: 'assistant' as const,
      content: welcomeMessage,
      timestamp: new Date()
    };
    setMessages([message]);
    
    // Check system preference for dark mode
    if (typeof window !== 'undefined') {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
      
      // Listen for changes in system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [language]);

  // Handle audio playback and events
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    const handleEnded = () => {
      setIsSpeaking(false);
      setAudioSrc(null);
      
      // Add a more natural pause before listening again
      if (!isFirstInteraction) {
        setTimeout(() => {
          startRecording();
        }, 1000); // Slightly longer pause for more natural conversation rhythm
      }
    };
    
    const handleCanPlay = () => {
      audioElement.play().catch(err => {
        console.error('Failed to play audio:', err);
        setIsSpeaking(false);
      });
    };
    
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('canplay', handleCanPlay);
    
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [isFirstInteraction]);
  
  // When audioSrc changes, update speaking state
  useEffect(() => {
    if (audioSrc) {
      setIsSpeaking(true);
    }
  }, [audioSrc]);

  // Manage the pulse animation based on isListening/isSpeaking
  useEffect(() => {
    if (isListening || isSpeaking) {
      // Start dynamic pulse animation
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
      
      pulseIntervalRef.current = setInterval(() => {
        // Create a dynamic pulsing effect
        const baseIntensity = isListening ? 20 : 10;
        const randomizer = Math.random() * 15;
        setPulseIntensity(baseIntensity + randomizer);
      }, 150);
    } else {
      // Clean up pulse animation
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
      setPulseIntensity(0);
    }
    
    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, [isListening, isSpeaking]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      stopRecording();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
      }
    };
  }, []);
  
  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        // Option 1: Redirect to login
        // router.push('/login');
        
        // Option 2: Allow anonymous use but show a login prompt
        // We'll use option 2 here
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Toggle recording when circle is clicked
  const handleCircleClick = async () => {
    if (isSpeaking || isLoading) return;
    
    if (isListening) {
      stopRecording();
    } else {
      if (isFirstInteraction) {
        setIsFirstInteraction(false);
        // Set start time for tracking conversation duration
        setStartTime(new Date());
        
        // Add a friendly transition message
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Great! I'm listening now. What would you like to talk about?",
            timestamp: new Date()
          }
        ]);
      }
      await startRecording();
    }
  };
  
  // Start recording from microphone
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processRecording(audioBlob);
        
        // Stop and release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Set a timer to auto-stop after silence (similar to MicButton)
      const silenceTimer = setTimeout(() => {
        if (isListening && mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 5000); // Auto-stop after 5 seconds
      
      mediaRecorderRef.current.start();
      setIsListening(true);
      
      return () => clearTimeout(silenceTimer);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Please enable microphone permissions.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };
  
  // Process the recording once complete
  const processRecording = async (recordingBlob: Blob) => {
    setIsLoading(true);
    
    try {
      // Create a user message placeholder with a more natural indicator
      const tempId = Date.now().toString();
      setMessages(prev => [
        ...prev,
        {
          id: tempId,
          role: 'user',
          content: "...",  // Simpler placeholder that feels more natural
          timestamp: new Date()
        }
      ]);

      // 1. Convert speech to text using a speech recognition API
      const audioFile = new File([recordingBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Create form data to send to OpenAI's Whisper API
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', languageCode); // Use the language code from context
      
      // Get transcription from OpenAI
      const transcriptionResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!transcriptionResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const { text: transcription } = await transcriptionResponse.json();
      
      // Check if transcription is empty or just whitespace
      if (!transcription || transcription.trim() === '') {
        // Handle empty transcription based on language
        let emptyMessage = "I didn't quite catch that. Could you say something when you click the button?";
        
        switch(language) {
          case 'spanish':
            emptyMessage = "No te entendí bien. ¿Podrías decir algo cuando hagas clic en el botón?";
            break;
          case 'french':
            emptyMessage = "Je n'ai pas bien compris. Pourriez-vous dire quelque chose quand vous cliquez sur le bouton ?";
            break;
          case 'german':
            emptyMessage = "Ich habe das nicht ganz verstanden. Könntest du etwas sagen, wenn du auf den Knopf klickst?";
            break;
          case 'japanese':
            emptyMessage = "よく聞き取れませんでした。ボタンをクリックする時に何か話してもらえますか？";
            break;
          case 'korean':
            emptyMessage = "잘 듣지 못했습니다. 버튼을 클릭할 때 뭔가 말씀해 주시겠어요?";
            break;
          case 'chinese':
            emptyMessage = "我没听清楚。点击按钮时能说点什么吗？";
            break;
        }
        
        // Remove the temporary user message since it was empty
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        
        // Add a gentle prompt from the assistant
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: emptyMessage,
            timestamp: new Date()
          }
        ]);
        
        // Auto-restart listening after a brief pause
        if (!isFirstInteraction) {
          setTimeout(() => {
            startRecording();
          }, 2000);
        }
        
        return;
      }
      
      // Update user message with actual transcription
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, content: transcription } 
            : msg
        )
      );

      // 2. Get AI response from OpenAI with instructions to be more human-like
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            // Add system message based on language context
            { 
              role: 'system', 
              content: getSystemMessage()
            },
            ...messages, 
            { role: 'user', content: transcription }
          ].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });
      
      if (!chatResponse.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const { message: aiResponse } = await chatResponse.json();
      
      // Add AI response to messages
      const newMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: aiResponse.content,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);

      // Save conversation after 3 exchanges (6 messages including welcome and prompt)
      if (messages.length >= 5) {
        saveConversationToFirebase();
      }

      // 3. Convert AI text response to speech
      const speechResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: aiResponse.content,
          language: languageCode // Use the language code from context
        })
      });
      
      if (!speechResponse.ok) {
        throw new Error('Failed to generate speech');
      }
      
      // Get audio data and create blob URL for playback
      const audioData = await speechResponse.arrayBuffer();
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      
      // Set audio source to trigger playback
      setAudioSrc(url);
      
    } catch (err) {
      console.error('Error processing voice conversation:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      // Error message based on selected language
      let errorMessage = "Oops, I didn't catch that properly. Would you mind trying again?";
      
      switch(language) {
        case 'spanish':
          errorMessage = "Ups, no entendí eso correctamente. ¿Te importaría intentarlo de nuevo?";
          break;
        case 'french':
          errorMessage = "Oups, je n'ai pas bien compris. Pourriez-vous réessayer ?";
          break;
        case 'german':
          errorMessage = "Hoppla, das habe ich nicht richtig verstanden. Würde es dir etwas ausmachen, es noch einmal zu versuchen?";
          break;
        case 'japanese':
          errorMessage = "おっと、うまく聞き取れませんでした。もう一度試していただけますか？";
          break;
        case 'korean':
          errorMessage = "앗, 제대로 듣지 못했습니다. 다시 시도해 주시겠어요?";
          break;
        case 'chinese':
          errorMessage = "哎呀，我没听清楚。能请你再试一次吗？";
          break;
      }
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        }
      ]);
      
      // Auto-restart listening after error
      if (!isFirstInteraction) {
        setTimeout(() => {
          startRecording();
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save conversation history to Firebase
  const saveConversationToFirebase = async () => {
    if (!isAuthenticated || !startTime || messages.length < 3) return;
    
    try {
      // Extract potential topics from conversation using keywords
      const allText = messages.map(msg => msg.content).join(' ');
      const topics = extractTopics(allText);
      
      // Calculate conversation duration
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Calculate a simple engagement score based on message count and duration
      // This is a basic algorithm; could be improved with ML
      const scoreBase = Math.min(100, messages.length * 10);
      const score = Math.max(50, Math.min(100, scoreBase));
      
      await saveTalkHistory({
        userId: auth.currentUser?.uid || 'anonymous',
        date: Timestamp.now(),
        duration: durationSeconds,
        topics: topics,
        score: score,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: Timestamp.fromDate(msg.timestamp)
        })),
        language: language,
        languageLevel: languageLevel
      });
      
    } catch (err) {
      console.error('Error saving conversation history:', err);
    }
  };
  
  // Extract potential topics from conversation text
  const extractTopics = (text: string): string[] => {
    // Common topics to look for
    const topicKeywords: Record<string, string[]> = {
      "Weather": ["weather", "rain", "sunny", "cold", "hot", "temperature", "wind", "forecast"],
      "Food": ["food", "eat", "restaurant", "cooking", "recipe", "delicious", "meal", "dinner", "lunch"],
      "Travel": ["travel", "trip", "vacation", "visit", "country", "city", "journey", "tourist", "destination"],
      "Hobbies": ["hobby", "interest", "collection", "activity", "leisure", "free time", "playing", "reading"],
      "Movies": ["movie", "film", "actor", "actress", "cinema", "watch", "director", "scene"],
      "Music": ["music", "song", "listen", "artist", "band", "concert", "album", "genre"],
      "Books": ["book", "read", "author", "novel", "story", "literature", "character"],
      "Sports": ["sports", "game", "team", "play", "athlete", "fitness", "exercise", "training"],
      "Technology": ["technology", "computer", "internet", "app", "phone", "device", "digital", "software"],
      "Family": ["family", "parent", "child", "mother", "father", "sister", "brother"],
      "Education": ["education", "school", "college", "university", "learn", "study", "student", "teacher"],
      "Work": ["work", "job", "career", "office", "business", "professional", "company"],
      "Health": ["health", "doctor", "medical", "symptom", "disease", "medicine", "treatment", "healthy"],
      "Culture": ["culture", "tradition", "custom", "heritage", "belief", "celebration", "festival"]
    };
    
    // Convert text to lowercase for case-insensitive matching
    const lowercaseText = text.toLowerCase();
    
    // Find matching topics
    const matchedTopics = Object.entries(topicKeywords)
      .filter(([topic, keywords]) => 
        keywords.some(keyword => lowercaseText.includes(keyword.toLowerCase()))
      )
      .map(([topic]) => topic);
    
    // Return unique topics, limited to 5
    return [...new Set(matchedTopics)].slice(0, 5);
  };

  return (
    <div className={`w-screen min-h-screen flex flex-col justify-center items-center p-4 gap-y-16 transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'
    }`}>
      {/* Back Button */}
      <div className="absolute z-10 top-4 left-4">
        <BackButton 
          destination="/" 
          variant={darkMode ? "secondary" : "ghost"}
          size="medium"
        />
      </div>
      
      {/* Hidden audio element for automatic playback */}
      <audio 
        ref={audioRef} 
        src={audioSrc || undefined} 
        className="hidden"
      />
      
      <header className={`w-full max-w-2xl text-center mb-8 ${
        darkMode ? 'text-white' : 'text-gray-800'
      }`}>
        <h1 className="text-2xl font-bold">Chat With Me</h1>
        <p className={`mt-2 ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {isFirstInteraction ? 
            "Let's have a conversation! Tap the circle to start." : 
            "I'm here to chat whenever you're ready."}
        </p>
      </header>

      <main className="flex flex-col items-center w-full max-w-2xl gap-y-24">
        {/* Redesigned Circle Component with more human-friendly indicator */}
        <div className="relative flex items-center justify-center gap-y-10">
          {/* Background glow effect */}
          <AnimatePresence>
            {(isListening || isSpeaking || isLoading) && (
              <motion.div 
                className={`absolute rounded-full blur-xl opacity-30 ${
                  isListening 
                    ? darkMode ? 'bg-red-400' : 'bg-red-300'
                    : isSpeaking 
                      ? darkMode ? 'bg-green-400' : 'bg-green-300'
                      : darkMode 
                        ? 'bg-purple-400' 
                        : 'bg-purple-300'
                }`}
                initial={{ width: '75vw', height: '75vw', maxWidth: 300, maxHeight: 300 }}
                animate={{ 
                  width: `calc(75vw + ${pulseIntensity * 3}px)`, 
                  height: `calc(75vw + ${pulseIntensity * 3}px)`,
                  maxWidth: `${300 + pulseIntensity * 3}px`,
                  maxHeight: `${300 + pulseIntensity * 3}px`,
                  opacity: isListening ? 0.7 : 0.5
                }}
                exit={{ width: 200, height: 200, opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
          
          {/* Audio visualization bars - only visible during listening/speaking */}
          <AnimatePresence>
            {(isListening || isSpeaking) && (
              <div className="absolute flex items-center justify-center w-60 h-60">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-1 rounded-full ${
                      isListening 
                        ? darkMode ? 'bg-red-400' : 'bg-red-500'
                        : darkMode ? 'bg-green-400' : 'bg-green-500'
                    }`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: Math.random() * 30 + 5,
                      opacity: 0.6,
                      rotateZ: i * 12 // Distribute bars in a circle
                    }}
                    transition={{ 
                      duration: 0.2, 
                      repeat: Infinity, 
                      repeatType: 'mirror',
                      delay: i * 0.01
                    }}
                    style={{ 
                      transformOrigin: 'bottom',
                      transform: `rotate(${i * 12}deg) translate(0, -60px)` 
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
          
          {/* Main circle */}
          <motion.div 
            className={`relative w-48 h-48 lg:w-72 lg:h-72 rounded-full ${
              isFirstInteraction 
                ? 'cursor-pointer hover:scale-105'
                : ''
            } transition-all duration-300 shadow-2xl`}
            animate={{ 
              scale: [1, isFirstInteraction && !isListening && !isSpeaking && !isLoading ? 1.02 : 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
            onClick={handleCircleClick}
            style={{
              background: isListening
                ? darkMode 
                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : isSpeaking
                  ? darkMode
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : isLoading
                    ? darkMode
                      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                      : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    : darkMode
                      ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
          >
            {/* Subtle inner circle animation */}
            <motion.div 
              className="absolute bg-white rounded-full inset-1 opacity-20"
              animate={{ 
                scale: [0.9, 1],
                opacity: [0.1, 0.3]
              }}
              transition={{ 
                duration: isListening || isSpeaking ? 0.8 : 2, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            
            {/* Icon Container */}
            <div className="absolute flex items-center justify-center overflow-hidden rounded-full shadow-inner inset-3"
              style={{
                background: darkMode 
                  ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Switch between icons based on state - use Smile icon when ready for more friendly appearance */}
              {isListening ? (
                <Mic 
                  className={`h-24 w-24 ${darkMode ? 'text-red-400' : 'text-red-500'}`} 
                  stroke="currentColor" 
                  strokeWidth={1.5} 
                />
              ) : isSpeaking ? (
                <Volume 
                  className={`h-24 w-24 ${darkMode ? 'text-green-400' : 'text-green-500'}`} 
                  stroke="currentColor" 
                  strokeWidth={1.5} 
                />
              ) : isLoading ? (
                <BrainCog 
                  className={`h-24 w-24 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} 
                  stroke="currentColor" 
                  strokeWidth={1.5} 
                />
              ) : (
                <Smile 
                  className={`h-24 w-24 ${darkMode ? 'text-green-400' : 'text-green-500'}`} 
                  stroke="currentColor" 
                  strokeWidth={1.5} 
                />
              )}
            </div>
            
            {/* Status Indicator with more human-friendly messages */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-medium shadow-lg"
              style={{
                background: darkMode 
                  ? 'linear-gradient(to right, #1e293b, #334155)'
                  : 'linear-gradient(to right, #ffffff, #f8fafc)',
                boxShadow: darkMode 
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
              }}
            >
              <span className={`${
                isListening ? 'text-red-500' : 
                isSpeaking ? 'text-green-500' : 
                isLoading ? 'text-purple-500' : 
                darkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {isFirstInteraction && !isListening && !isSpeaking && !isLoading ? 
                  "Let's chat!" : 
                  isListening ? 
                    "I'm listening..." : 
                    isSpeaking ? 
                      "Talking to you..." : 
                      isLoading ? 
                        "Thinking..." : 
                        "Ready to chat"}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Conversation Messages - style adjustments for more human-friendly appearance */}
        <div className={`w-full p-4 rounded-lg shadow-md mb-6 max-h-[400px] overflow-y-auto ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        style={{
          boxShadow: darkMode 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
        }}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                message.role === 'user'
                  ? `ml-auto ${darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900'}`
                  : `mr-auto ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-900'}`
              } ${message.content === "..." ? "animate-pulse" : ""}`}
              style={{
                boxShadow: darkMode 
                  ? '0 1px 2px rgba(0, 0, 0, 0.2)'
                  : '0 1px 2px rgba(0, 0, 0, 0.1)',
                borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
              }}
            >
              <p>{message.content}</p>
              <div className={`text-xs mt-1 ${
                darkMode ? 'opacity-60' : 'opacity-50'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display with friendlier message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full p-3 rounded-lg mb-4 ${
              darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'
            }`}
            style={{
              boxShadow: darkMode 
                ? '0 1px 2px rgba(0, 0, 0, 0.2)'
                : '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}
          >
            Hmm, something went wrong. Let's try again? {error}
          </motion.div>
        )}
      </main>
    </div>
  );
}