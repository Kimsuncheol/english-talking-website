"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'english' | 'spanish' | 'french' | 'german' | 'japanese' | 'korean' | 'chinese';
type LanguageLevel = 'beginner' | 'intermediate' | 'advanced';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  languageLevel: LanguageLevel;
  setLanguageLevel: (level: LanguageLevel) => void;
  // ISO language codes for API calls
  languageCode: string;
  // System message for the selected language
  getSystemMessage: () => string;
}

// Map languages to ISO codes for API calls
const languageCodeMap: Record<Language, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  japanese: 'ja',
  korean: 'ko',
  chinese: 'zh',
};

// Create the context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('english');
  const [languageLevel, setLanguageLevel] = useState<LanguageLevel>('beginner');
  
  // Get language code (ISO) for the selected language
  const languageCode = languageCodeMap[language];
  
  // Generate system message based on selected language and level
  const getSystemMessage = () => {
    const levelInstructions = {
      beginner: 'Use simple vocabulary and speak slowly with basic sentence structures.',
      intermediate: 'Use moderately complex vocabulary and natural speech pace.',
      advanced: 'Use advanced vocabulary, idioms, and speak at native pace.'
    };
    
    if (language === 'english') {
      return `You are a helpful AI English tutor. Your goal is to help the user improve their English language skills. ${levelInstructions[languageLevel]} Provide clear explanations. Be encouraging and patient.`;
    } else {
      return `You are a helpful AI language tutor. Respond ONLY in ${language}. ${levelInstructions[languageLevel]} Your goal is to help the user practice ${language}. Be encouraging and patient.`;
    }
  };
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', language);
      localStorage.setItem('preferredLanguageLevel', languageLevel);
    }
  }, [language, languageLevel]);
  
  // Load preferences from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
      const savedLevel = localStorage.getItem('preferredLanguageLevel') as LanguageLevel;
      
      if (savedLanguage) setLanguage(savedLanguage);
      if (savedLevel) setLanguageLevel(savedLevel);
    }
  }, []);
  
  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      languageLevel, 
      setLanguageLevel, 
      languageCode,
      getSystemMessage
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 