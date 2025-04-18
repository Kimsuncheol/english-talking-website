import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';
import { Check, X, Trash2, BookmarkPlus, Copy, ArrowDown, Sun, Moon } from 'lucide-react';
import ChatMessageList from './ChatMessageList';
import ChatSkeleton from '../ChatSkeleton';
import InputBar from './InputBar';
import { Message } from './index';
import { db } from '@/firebase/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { FirebaseNote } from '@/types/notes';

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  isDarkMode: boolean;
  selectedMessages: Set<string>;
  onSendMessage: (text: string) => Promise<void>;
  onDeleteMessages: (user: User) => Promise<void>;
  onToggleSelection: (messageId: string) => void;
  onClearSelection: () => void;
  onClose: () => void;
  onShowSuccess: () => void;
  showSuccess: boolean;
  welcomeMessage: string;
  position: string;
  isMobile: boolean;
  user: User | null;
}

export default function ChatWindow({ 
  messages,
  loading,
  error,
  isDarkMode,
  selectedMessages,
  onSendMessage,
  onDeleteMessages,
  onToggleSelection,
  onClearSelection,
  onClose,
  onShowSuccess,
  showSuccess,
  welcomeMessage,
  position,
  isMobile,
  user
}: ChatWindowProps) {
  // Local state
  const [inputText, setInputText] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate window position
  const windowPosition = position.includes('right') ? 'right-6' : 'left-6';
  
  // Determine width classes
  const widthClasses = isMobile ? 'w-[92vw]' : 'w-[380px]';
  
  // Get classes for the message container
  const getContainerStyles = () => {
    return {
      light: 'bg-white border border-gray-200',
      dark: 'bg-gray-900 border border-gray-800'
    };
  };
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);
  
  // Handle scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      if (container.scrollTop + container.clientHeight < container.scrollHeight - 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Format message for export
  const formatMessageForExport = (text: string) => {
    return text.replace(/<[^>]*>/g, '');
  };
  
  // Save to notes
  const saveToNotes = async () => {
    if (selectedMessages.size === 0 || !user?.email) return;
    
    const selectedMessageItems = messages.filter(msg => selectedMessages.has(msg.id));
    const notesContent = selectedMessageItems.map(msg => {
      const prefix = msg.sender === 'user' ? '👤 Question: ' : '🤖 Answer: ';
      return `${prefix}${formatMessageForExport(msg.text)}`;
    }).join('\n\n');

    const firstUserMessage = selectedMessageItems.find(msg => msg.sender === 'user');
    const titleSource = firstUserMessage || selectedMessageItems[0];
    const title = formatMessageForExport(titleSource.text)
      .split('\n')[0]
      .substring(0, 100);
    
    try {
      const noteData: Omit<FirebaseNote, 'id'> = {
        timestamp: new Date().toLocaleString(),
        content: notesContent,
        title,
        folder: 'Unfiled',
        userEmail: user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'notes'), noteData);
      onShowSuccess();
      onClearSelection();
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = () => {
    if (selectedMessages.size === 0) return;
    
    const selectedMessageItems = messages.filter(msg => selectedMessages.has(msg.id));
    const clipboardContent = selectedMessageItems.map(msg => {
      const prefix = msg.sender === 'user' ? 'Question: ' : 'Answer: ';
      return `${prefix}${formatMessageForExport(msg.text)}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(clipboardContent)
      .then(() => {
        onShowSuccess();
        onClearSelection();
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Handle send message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const messageText = inputText;
    setInputText('');
    await onSendMessage(messageText);
  };
  
  // Handle keypress
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <motion.div
      className={`fixed bottom-20 ${windowPosition} ${widthClasses} z-40 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[75vh] ${
        isDarkMode ? getContainerStyles().dark : getContainerStyles().light
      }`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className={`p-4 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-indigo-800 to-indigo-700' 
          : 'bg-gradient-to-r from-indigo-600 to-indigo-500'
      } text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2 font-medium">
          <span className="text-sm">English Assistant</span>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Clear messages"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Selection toolbar */}
      <AnimatePresence>
        {selectedMessages.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`py-2 px-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-indigo-50'
            } flex items-center justify-between border-b ${
              isDarkMode ? 'border-gray-700' : 'border-indigo-100'
            }`}
          >
            <span className="text-sm font-medium">
              {selectedMessages.size} {selectedMessages.size === 1 ? 'message' : 'messages'} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-100'
                }`}
                aria-label="Copy to clipboard"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={saveToNotes}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-100'
                }`}
                aria-label="Save to notes"
              >
                <BookmarkPlus size={16} />
              </button>
              <button
                onClick={onClearSelection}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-100'
                }`}
                aria-label="Cancel selection"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Success toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md z-50 flex items-center gap-2 ${
              isDarkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 border border-green-200'
            }`}
          >
            <Check size={16} />
            <span className="text-sm font-medium">Saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Messages area */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto p-4 ${
          isDarkMode ? 'bg-gray-900 scrollbar-dark' : 'bg-white scrollbar-light'
        }`}
      >
        {loading ? (
          <ChatSkeleton darkMode={isDarkMode} messageCount={3} />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className={`p-6 rounded-xl max-w-xs ${
              isDarkMode ? 'bg-gray-800' : 'bg-indigo-50'
            }`}>
              <h4 className="mb-2 font-medium">Welcome!</h4>
              <p className={`text-sm mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {welcomeMessage}
              </p>
              <div className="flex flex-col gap-2 mt-4">
                {['How to improve my English?', 'What\'s the difference between "affect" and "effect"?'].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(suggestion)}
                    className={`text-xs p-2 rounded-lg text-left transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-white hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            selectedMessages={selectedMessages}
            onToggleSelection={onToggleSelection}
            isDarkMode={isDarkMode}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Scroll to bottom button */}
      <AnimatePresence>
        {isScrolled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute bottom-20 right-4 p-2 rounded-full shadow-md ${
              isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'
            } text-white`}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ArrowDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Errors */}
      {error && (
        <div className={`px-4 py-2 text-xs ${
          isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-500'
        }`}>
          {error}
        </div>
      )}
      
      {/* Input area */}
      <InputBar
        value={inputText}
        onChange={setInputText}
        onSend={handleSendMessage}
        onKeyPress={handleKeyPress}
        loading={loading}
        disabled={!user}
        isDarkMode={isDarkMode}
      />
      
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`p-6 rounded-lg max-w-[280px] ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <h4 className="mb-2 text-lg font-medium">Clear All Messages?</h4>
              <p className={`text-sm mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                This will permanently delete all your chat messages. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 rounded-md text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (user) {
                      await onDeleteMessages(user);
                      setShowDeleteConfirm(false);
                    }
                  }}
                  className="px-4 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 