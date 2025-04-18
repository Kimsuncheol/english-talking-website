"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { useChatbot } from '@/lib/useApi';
import { useTheme } from '@/hooks/useTheme';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: any;
}

export interface ChatProps {
  position?: 'bottom-right' | 'bottom-left';
  welcomeMessage?: string;
  autoOpen?: boolean;
}

export default function Chat({
  position = 'bottom-right',
  welcomeMessage = "Hello! I'm your English assistant. How can I help you improve your language skills today?",
  autoOpen = false,
}: ChatProps) {
  // UI states
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [savedToNotesMessage, setSavedToNotesMessage] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Responsive handling
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Auth
  const { user } = useAuth();
  
  // Theme
  const { isDarkMode } = useTheme();
  
  // Chat API
  const {
    messages,
    loading,
    error,
    loadMessages,
    sendMessage,
    deleteAllMessages,
  } = useChatbot();

  // Load messages on mount
  useEffect(() => {
    if (user?.email) {
      loadMessages(user.email);
      setTimeout(() => setInitialLoad(false), 500);
    } else {
      setInitialLoad(false);
    }
  }, [user, loadMessages]);

  // Compute position classes
  const positionClasses = position === 'bottom-right'
    ? 'bottom-6 right-6'
    : 'bottom-6 left-6';

  // Handle toggles
  const toggleChat = () => setIsOpen(prev => !prev);
  
  // Handle selection
  const toggleMessageSelection = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };
  
  // Clear selection
  const clearSelection = () => setSelectedMessages(new Set());
  
  // Success message handler
  const showSuccess = () => {
    setSavedToNotesMessage(true);
    setTimeout(() => setSavedToNotesMessage(false), 2000);
  };

  // Message send handler
  const handleSendMessage = async (text: string) => {
    if (!user || !text.trim()) return;
    await sendMessage(user, text, 'en'); // Assuming English as default
  };

  return (
    <>
      {/* Chat button */}
      <ChatButton 
        isOpen={isOpen}
        onClick={toggleChat}
        position={positionClasses}
        isDarkMode={isDarkMode}
      />
      
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <ChatWindow
            messages={messages}
            loading={loading || initialLoad}
            error={error}
            isDarkMode={isDarkMode}
            selectedMessages={selectedMessages}
            onSendMessage={handleSendMessage}
            onDeleteMessages={deleteAllMessages}
            onToggleSelection={toggleMessageSelection}
            onClearSelection={clearSelection}
            onClose={toggleChat}
            onShowSuccess={showSuccess}
            showSuccess={savedToNotesMessage}
            welcomeMessage={welcomeMessage}
            position={positionClasses}
            isMobile={isMobile}
            user={user}
          />
        )}
      </AnimatePresence>
    </>
  );
} 