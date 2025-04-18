"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Edit2, Camera, Lock, User, Mail } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { 
  getUserProfile, 
  updateUserProfile, 
  changeUserPassword,
  logoutUser
} from '@/lib/firebaseUtils';
import { auth } from '@/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    bio: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Check system preference for dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Check authentication and load user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (user) {
        setUserInfo({
          name: user.displayName || 'User',
          email: user.email || '',
          bio: localStorage.getItem(`bio_${user.uid}`) || 'No bio yet'
        });
      } else {
        // Redirect to login page if not authenticated
        router.push('/login');
      }
    });

    return unsubscribe;
  }, [router]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await updateUserProfile(userInfo.name);
      
      // Save bio to localStorage (could use Firestore in a real app)
      const user = auth.currentUser;
      if (user) {
        localStorage.setItem(`bio_${user.uid}`, userInfo.bio);
      }
      
      setIsEditingInfo(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    try {
      setError(null);
      await changeUserPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <p>Loading...</p>
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
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Manage your personal information
        </p>
      </header>

      {error && (
        <div className="w-full max-w-2xl p-3 mx-auto mb-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto">
        <div className={`rounded-lg shadow-md overflow-hidden ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          
          {/* Profile Image Section */}
          <div className="relative">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <div className="absolute transform -translate-x-1/2 -bottom-16 left-1/2">
              <div className="relative group">
                <div className="w-32 h-32 overflow-hidden bg-gray-200 border-4 border-white rounded-full">
                  <Image 
                    src={auth.currentUser?.photoURL || "/images/profile-placeholder.jpg"} 
                    alt="Profile" 
                    width={128} 
                    height={128}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/128";
                    }}
                  />
                </div>
                <button 
                  className="absolute bottom-0 right-0 p-2 text-white transition-colors bg-blue-500 rounded-full hover:bg-blue-600"
                  aria-label="Change profile picture"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {/* User Info Section */}
          <div className="px-6 pt-20 pb-6">
            {isEditingInfo ? (
              <form onSubmit={handleInfoSubmit} className="space-y-4">
                <div>
                  <label className={`block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <User size={16} className="inline mr-2" />
                    Name
                  </label>
                  <input 
                    type="text"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    aria-label="Name"
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Mail size={16} className="inline mr-2" />
                    Email
                  </label>
                  <input 
                    type="email"
                    value={userInfo.email}
                    disabled
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white opacity-70' : 'bg-gray-100 border-gray-300 opacity-70'
                    }`}
                    aria-label="Email"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div>
                  <label className={`block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Bio</label>
                  <textarea 
                    value={userInfo.bio}
                    onChange={(e) => setUserInfo({...userInfo, bio: e.target.value})}
                    rows={3}
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    aria-label="Bio"
                  />
                </div>
                <div className="flex space-x-2">
                  <button 
                    type="submit"
                    className="px-4 py-2 text-white transition-colors bg-blue-500 rounded-md hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{userInfo.name}</h2>
                  <button 
                    onClick={() => setIsEditingInfo(true)}
                    className={`p-2 rounded-md ${
                      darkMode 
                        ? 'hover:bg-gray-700 text-gray-300' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    aria-label="Edit profile information"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <Mail size={16} className="inline mr-2" />
                  {userInfo.email}
                </p>
                <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {userInfo.bio}
                </p>
              </div>
            )}
            
            {/* Change Password Section */}
            <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Lock className={`mr-3 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                  <h2 className="text-xl font-semibold">Password Security</h2>
                </div>
                <button 
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  {isChangingPassword ? 'Cancel' : 'Change Password'}
                </button>
              </div>
              
              {isChangingPassword && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className={`block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Password</label>
                    <input 
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className={`block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>New Password</label>
                    <input 
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className={`block mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Confirm New Password</label>
                    <input 
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button 
                    type="submit"
                    className={`px-4 py-2 rounded-md font-medium ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                    } text-white transition-colors`}
                  >
                    Update Password
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}