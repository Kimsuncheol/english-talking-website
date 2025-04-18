"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Volume2, Languages, Lock, Trash2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useLanguage } from '@/lib/LanguageContext';
import { auth } from '@/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserSettings, saveUserSettings, deleteUserData } from '@/firebase/firestore';
import { deleteUserAccount } from '@/lib/firebaseUtils';

export default function Settings() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const { language, setLanguage, languageLevel, setLanguageLevel } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState('alloy');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  // Check for user authentication and load settings
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(false);
        try {
          // Load user settings from Firebase
          const settings = await getUserSettings(user);
          if (settings) {
            // Apply saved settings if available
            if (settings.language) setLanguage(settings.language as any);
            if (settings.languageLevel) setLanguageLevel(settings.languageLevel as any);
            if (settings.voice) setVoice(settings.voice);
            if (settings.theme) {
              if (settings.theme === 'dark') setDarkMode(true);
              else if (settings.theme === 'light') setDarkMode(false);
              else {
                // Check system preference for dark mode
                const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setDarkMode(prefersDarkMode);
              }
            }
          }
        } catch (err) {
          console.error('Error loading settings:', err);
        }
      } else {
        // Redirect to login page if not authenticated
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, setLanguage, setLanguageLevel]);
  
  // Save settings to Firebase whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      if (loading) return; // Don't save during initial load
      if (!auth.currentUser) return; // Don't save if not logged in
      
      try {
        await saveUserSettings(auth.currentUser, {
          language,
          languageLevel,
          voice,
          theme: darkMode ? 'dark' : 'light',
          updatedAt: new Date() as any,
        });
      } catch (err) {
        console.error('Error saving settings:', err);
      }
    };
    
    saveSettings();
  }, [language, languageLevel, voice, darkMode, loading]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        // Only update if theme preference is set to system
        if (auth.currentUser) {
          getUserSettings(auth.currentUser).then(settings => {
            if (settings?.theme === 'system') {
              setDarkMode(e.matches);
            }
          });
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Handlers for language and level changes
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as any);
  };

  const handleLevelChange = (level: string) => {
    setLanguageLevel(level as any);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice(e.target.value);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }
    
    if (!deletePassword) {
      setError('Please enter your password');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Delete Firestore data
      if (auth.currentUser) {
        await deleteUserData(auth.currentUser);
      }
      
      // Delete Firebase Auth account
      await deleteUserAccount(deletePassword);
      
      // Redirect to homepage after successful deletion
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={`w-screen min-h-screen flex flex-col p-6 transition-colors duration-300 ${
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
      
      <header className="w-full max-w-2xl mx-auto mt-8 mb-8 text-center">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Customize your experience
        </p>
      </header>

      {error && (
        <div className="w-full max-w-2xl p-3 mx-auto mb-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto">
        <div className={`rounded-lg shadow-md p-6 mb-6 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          
          {/* 1. Change AI chatbot voice */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Volume2 className={`mr-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <h2 className="text-xl font-semibold">AI Voice</h2>
            </div>
            <div className="pl-9">
              <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Select the voice for your AI tutor</p>
              <select 
                className={`w-full p-2 rounded-md border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                value={voice}
                onChange={handleVoiceChange}
                aria-label="AI voice selection"
              >
                <option value="alloy">Alloy (Balanced)</option>
                <option value="echo">Echo (Male)</option>
                <option value="fable">Fable (Female)</option>
                <option value="onyx">Onyx (Deep Male)</option>
                <option value="nova">Nova (Soft Female)</option>
              </select>
            </div>
          </div>
          
          {/* 2. Change AI chatbot language */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Globe className={`mr-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <h2 className="text-xl font-semibold">AI Language</h2>
            </div>
            <div className="pl-9">
              <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Set your AI tutor&apos;s primary language</p>
              <select 
                className={`w-full p-2 rounded-md border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                value={language}
                onChange={handleLanguageChange}
                aria-label="AI language selection"
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
                <option value="japanese">Japanese</option>
                <option value="korean">Korean</option>
                <option value="chinese">Chinese</option>
              </select>
            </div>
          </div>
          
          {/* 3. Change language mode */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Languages className={`mr-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              <h2 className="text-xl font-semibold">Language Mode</h2>
            </div>
            <div className="pl-9">
              <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Choose how you want to learn</p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="language-mode" 
                    checked={languageLevel === 'beginner'}
                    onChange={() => handleLevelChange('beginner')}
                    className="mr-2" 
                  />
                  <span>Beginner - Simple vocabulary and slower speech</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="language-mode" 
                    checked={languageLevel === 'intermediate'}
                    onChange={() => handleLevelChange('intermediate')}
                    className="mr-2" 
                  />
                  <span>Intermediate - Mixed vocabulary and natural speed</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="language-mode" 
                    checked={languageLevel === 'advanced'}
                    onChange={() => handleLevelChange('advanced')}
                    className="mr-2" 
                  />
                  <span>Advanced - Complex vocabulary and native speed</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* 4. Theme Selection */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Lock className={`mr-3 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
              <h2 className="text-xl font-semibold">Theme</h2>
            </div>
            <div className="pl-9">
              <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Choose your preferred theme</p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="theme" 
                    checked={!darkMode}
                    onChange={() => setDarkMode(false)}
                    className="mr-2" 
                  />
                  <span>Light Mode</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="theme" 
                    checked={darkMode}
                    onChange={() => setDarkMode(true)}
                    className="mr-2" 
                  />
                  <span>Dark Mode</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* 5. Delete user email */}
          <div className="mb-4">
            <div className="flex items-center mb-4">
              <Trash2 className={`mr-3 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
              <h2 className="text-xl font-semibold">Delete Account</h2>
            </div>
            <div className="pl-9">
              <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                This action cannot be undone. It will permanently delete your account and remove your data from our servers.
              </p>
              
              {isDeleting ? (
                <div className="p-4 mt-4 border border-red-300 rounded-md">
                  <p className="mb-3 font-medium text-red-600">Please confirm account deletion</p>
                  
                  <div className="mb-3">
                    <label className="block mb-1 text-sm">
                      Type &quot;DELETE&quot; to confirm
                    </label>
                    <input 
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block mb-1 text-sm">
                      Enter your password
                    </label>
                    <input 
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 text-white transition-colors bg-red-500 rounded-md hover:bg-red-600"
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsDeleting(false);
                        setDeleteConfirmation('');
                        setDeletePassword('');
                      }}
                      className="px-4 py-2 text-gray-700 transition-colors bg-gray-200 rounded-md hover:bg-gray-300"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsDeleting(true)}
                  className="px-4 py-2 text-white transition-colors bg-red-500 rounded-md hover:bg-red-600"
                >
                  Delete My Account
                </button>
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}