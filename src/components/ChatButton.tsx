"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, ChevronDown, BookmarkPlus, Check, Copy, Sparkles } from 'lucide-react';
import { auth, db } from '@/firebase/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { useChatbot } from '@/lib/useApi';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { FirebaseNote } from '@/types/notes';
import { motion, AnimatePresence } from 'framer-motion';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import ChatBubble from './ChatBubble';

// Helper function to format text with markdown-style formatting
const formatMessage = (text: string) => {
  if (!text) return '';
  
  // Replace markdown bold with HTML bold
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace bullet points
  formattedText = formattedText.replace(/^• (.*)$/gm, '<li>$1</li>');
  formattedText = formattedText.replace(/^- (.*)$/gm, '<li>$1</li>');
  formattedText = formattedText.replace(/^[0-9]+\. (.*)$/gm, '<li>$1</li>');
  
  // Format definitions
  formattedText = formattedText.replace(/^Definition:?\s*(.*?)$/gmi, '<h4 class="font-bold mt-2 text-indigo-600 dark:text-indigo-400">Definition:</h4><p>$1</p>');
  formattedText = formattedText.replace(/^\s*(\d+)\)\s*((?:n|v|adj|adv)\.?)\s*(.*?)$/gmi, '<div class="ml-4 mb-1"><span class="font-medium">$1) $2</span> $3</div>');
  
  // Format examples
  formattedText = formattedText.replace(/^Example[s]?:?\s*$/gmi, '<h4 class="font-bold mt-3 text-green-600 dark:text-green-400">Examples:</h4>');
  formattedText = formattedText.replace(/^\s*(\d+)\)\s*(.*?)$/gmi, '<div class="ml-4 mb-1 italic text-gray-700 dark:text-gray-300">$1) $2</div>');
  
  // Wrap lists in <ul> tags
  if (formattedText.includes('<li>')) {
    formattedText = formattedText.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul class="pl-5 my-2 list-disc">$1</ul>');
  }
  
  // Add styling to headings if present (assumes simple headings like "Grammar:" or "Vocabulary:")
  formattedText = formattedText.replace(/^([A-Za-z]+):(?:\s|<br>)/gm, '<h4 class="font-bold mt-2 mb-1 text-blue-600 dark:text-blue-400">$1:</h4>');
  
  // Handle paragraphs and spacing
  formattedText = formattedText.replace(/<br><br>/g, '</p><p class="mb-2">');
  formattedText = `<p class="mb-2">${formattedText}</p>`;
  formattedText = formattedText.replace(/<p class="mb-2"><\/p>/g, '');
  
  // Convert line breaks to <br> tags
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  return formattedText;
};

// Helper to format message for notes (plain text without HTML)
const formatMessageForNotes = (text: string) => {
  if (!text) return '';
  
  // Convert markdown-style bold to text bold markers
  let plainText = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Clean up any HTML that might be in the text
  plainText = plainText.replace(/<[^>]*>/g, '');
  
  return plainText;
};

export default function ChatButton() {
  // Core state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [height, setHeight] = useState(500);
  const [width, setWidth] = useState(360);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showSaveNotesButton, setShowSaveNotesButton] = useState(false);
  const [savedToNotesMessage, setSavedToNotesMessage] = useState(false);
  
  // Refs
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
  // Context
  const { language: appLanguage } = useLanguage();
  
  // Hooks
  const { messages, loading, error, loadMessages, sendMessage, deleteAllMessages } = useChatbot();
  
  // UI states
  const [darkMode, setDarkMode] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartDims, setResizeStartDims] = useState({ width: 0, height: 0 });

  // Check for dark mode preference
  useEffect(() => {
    const storedTheme = localStorage.getItem('preferredTheme');
    if (storedTheme === 'dark') {
      setDarkMode(true);
    } else if (storedTheme === 'light') {
      setDarkMode(false);
    } else {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
    }

    const handleStorageChange = () => {
      const updatedTheme = localStorage.getItem('preferredTheme');
      if (updatedTheme === 'dark') {
        setDarkMode(true);
      } else if (updatedTheme === 'light') {
        setDarkMode(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Responsive dimensions
  useEffect(() => {
    const setResponsiveDimensions = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      const calculatedWidth = Math.min(450, Math.max(320, screenWidth * 0.3));
      const calculatedHeight = Math.min(600, Math.max(450, screenHeight * 0.6));
      
      setWidth(calculatedWidth);
      setHeight(calculatedHeight);
    };
    
    setResponsiveDimensions();
    window.addEventListener('resize', setResponsiveDimensions);
    
    return () => window.removeEventListener('resize', setResponsiveDimensions);
  }, []);

  // Authentication listener
  useEffect(() => {
    let isComponentMounted = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && isComponentMounted) {
        // No longer treating loadMessages as returning a Promise
        loadMessages(currentUser.email || 'anonymous');
      }
    });

    return () => {
      isComponentMounted = false;
      unsubscribe();
    };
  }, [loadMessages]);

  // Track scroll position and detect user scrolling
  useEffect(() => {
    const chatContainer = chatMessagesRef.current;
    if (!chatContainer) return;
    
    const handleScroll = () => {
      // Check if user is near bottom (within 20px)
      const isNearBottom = Math.abs(
        (chatContainer.scrollHeight - chatContainer.scrollTop) - chatContainer.clientHeight
      ) < 20;
      
      setIsAtBottom(isNearBottom);
      setShowScrollButton(!isNearBottom);
      
      // If user manually scrolls up, mark as user scrolled
      if (!isNearBottom) {
        setUserScrolled(true);
      }
    };
    
    chatContainer.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();
    
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Conditional auto-scrolling for new messages
  useEffect(() => {
    // Only run if we have messages
    if (messages.length === 0) return;
    
    const currentLastMessageId = messages[messages.length - 1]?.id;
    
    // If this is a new message (ID changed)
    if (lastMessageId !== currentLastMessageId) {
      const lastMessage = messages[messages.length - 1];
      
      // Auto-scroll conditions:
      // 1. User is already at the bottom before new message OR
      // 2. User just sent a message (always scroll to see response)
      const shouldAutoScroll = isAtBottom || 
                              (lastMessage.sender === 'user') || 
                              (!userScrolled);
      
      if (shouldAutoScroll && messagesEndRef.current) {
        // Use a small timeout to ensure the DOM has updated
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
      
      // Update last message ID
      setLastMessageId(currentLastMessageId);
    }
  }, [messages, isAtBottom, userScrolled, lastMessageId]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      // Reset user scrolled state when opening chat
      setUserScrolled(false);
      
      // Small delay to ensure render is complete
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen]);

  // Window resize handling
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizing) return;
      
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      const newWidth = Math.min(500, Math.max(300, resizeStartDims.width + deltaX));
      const newHeight = Math.min(700, Math.max(400, resizeStartDims.height + deltaY));
      
      setWidth(newWidth);
      setHeight(newHeight);
    };

    const handleResizeEnd = () => {
      setResizing(false);
    };

    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizing, resizeStartPos, resizeStartDims]);

  // Handlers
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    
    const messageToSend = message.trim();
    setMessage('');
    
    // Reset scroll state when user sends message
    setUserScrolled(false);
    
    // Check if the message is about vocabulary, slang, or idioms
    const lowerCaseMessage = messageToSend.toLowerCase();
    if ((lowerCaseMessage.includes('what is') || lowerCaseMessage.includes('define') || 
         lowerCaseMessage.includes('explain') || lowerCaseMessage.includes('meaning of')) &&
        (lowerCaseMessage.includes('word') || lowerCaseMessage.includes('vocab') || 
         lowerCaseMessage.includes('slang') || lowerCaseMessage.includes('idiom'))) {
      
      // Extract the potential word/slang/idiom
      let term = '';
      
      // Different regex patterns to extract the term
      const patterns = [
        /what is (?:the meaning of |the |an? )?['"]([^'"]+)['"]/i,
        /define (?:the |an? )?['"]([^'"]+)['"]/i,
        /explain (?:the |an? )?['"]([^'"]+)['"]/i,
        /what does ['"]([^'"]+)['"] mean/i,
        /meaning of ['"]([^'"]+)['"]/i,
        /what is (?:the meaning of |the |an? )?(\w+)/i,
        /define (?:the |an? )?(\w+)/i
      ];
      
      for (const pattern of patterns) {
        const match = messageToSend.match(pattern);
        if (match && match[1]) {
          term = match[1].trim();
          break;
        }
      }
      
      if (term) {
        // Check if this term exists in Firestore
        try {
          const vocabRef = collection(db, 'vocabulary');
          const termQuery = query(vocabRef, where('term', '==', term.toLowerCase()));
          const querySnapshot = await getDocs(termQuery);
          
          // If the term exists, use the stored definition
          if (!querySnapshot.empty) {
            const vocabData = querySnapshot.docs[0].data();
            
            // First send the user's original message
            await sendMessage(user, messageToSend, appLanguage);
            
            // Format the response in the desired structure
            let formattedResponse = `I found "${term}" in our database:\n\nDefinition:\n`;
            
            // Add definitions with part of speech
            if (vocabData.partOfSpeech && Array.isArray(vocabData.partOfSpeech)) {
              formattedResponse += vocabData.partOfSpeech.map((pos: string, i: number) => {
                return `${i+1}) ${pos} ${vocabData.definitions?.[i] || ''}`;
              }).join('\n');
            } else {
              formattedResponse += `1) ${vocabData.definition || 'No definition available.'}`;
            }
            
            // Add examples
            formattedResponse += '\n\nExamples:\n';
            if (vocabData.examples && Array.isArray(vocabData.examples)) {
              formattedResponse += vocabData.examples.map((ex: string, i: number) => {
                return `${i+1}) ${ex}`;
              }).join('\n');
            } else {
              formattedResponse += `1) ${vocabData.example || 'No example available.'}`;
            }
            
            // Send the formatted response as a separate message
            // Use a small delay to ensure messages appear in correct order
            setTimeout(async () => {
              await sendMessage(user, formattedResponse, appLanguage);
            }, 500);
            
            return;
          }
          
          // If term not found in database, just send the regular message
          // but with a hint to the AI to format responses properly
          const enhancedMessage = `${messageToSend} (Please format your response with Definition section showing part of speech, and Examples section with numbered examples)`;
          await sendMessage(user, enhancedMessage, appLanguage);
          
        } catch (error) {
          console.error('Error checking vocabulary database:', error);
          // Proceed with normal message if database check fails
          await sendMessage(user, messageToSend, appLanguage);
        }
        
        return;
      }
    }
    
    // Default behavior for other types of messages
    await sendMessage(user, messageToSend, appLanguage);
  }, [message, user, sendMessage, appLanguage]);

  const toggleChat = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartDims({ width, height });
  }, [width, height]);

  const toggleMessageSelection = useCallback((messageId: string) => {
    const newSelected = new Set(selectedMessages);
    
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    
    setSelectedMessages(newSelected);
    setShowSaveNotesButton(newSelected.size > 0);
  }, [selectedMessages]);

  const clearSelectedMessages = useCallback(() => {
    setSelectedMessages(new Set());
    setShowSaveNotesButton(false);
  }, []);

  const saveMessagesToNotes = useCallback(async () => {
    if (selectedMessages.size === 0 || !user?.email) return;
    
    const selectedMessageItems = messages.filter(msg => selectedMessages.has(msg.id));
    const notesContent = selectedMessageItems.map(msg => {
      const prefix = msg.sender === 'user' ? '👤 Question: ' : '🤖 Answer: ';
      return `${prefix}${formatMessageForNotes(msg.text)}`;
    }).join('\n\n');

    const firstUserMessage = selectedMessageItems.find(msg => msg.sender === 'user');
    const titleSource = firstUserMessage || selectedMessageItems[0];
    const title = formatMessageForNotes(titleSource.text)
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
      
      setSavedToNotesMessage(true);
      setTimeout(() => {
        setSavedToNotesMessage(false);
      }, 2000);
      
      clearSelectedMessages();
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }, [selectedMessages, messages, user, clearSelectedMessages]);

  const copySelectedMessages = useCallback(() => {
    if (selectedMessages.size === 0) return;
    
    const selectedMessageItems = messages.filter(msg => selectedMessages.has(msg.id));
    const clipboardContent = selectedMessageItems.map(msg => {
      const prefix = msg.sender === 'user' ? 'Question: ' : 'Answer: ';
      return `${prefix}${formatMessageForNotes(msg.text)}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(clipboardContent)
      .then(() => {
        setSavedToNotesMessage(true);
        setTimeout(() => {
          setSavedToNotesMessage(false);
        }, 2000);
        
        clearSelectedMessages();
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  }, [selectedMessages, messages, clearSelectedMessages]);

  // Render message list
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center h-full p-4"
        >
          <div className={`p-6 text-center max-w-xs rounded-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-indigo-50'
          } shadow-sm`}>
            <div className="flex justify-center mb-3">
              <Sparkles className={`${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} size={22} />
            </div>
            <h4 className="mb-2 font-medium">Welcome to English Assistant</h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Ask me anything about English grammar, vocabulary, idioms or slang!
            </p>
            
            <div className="mt-4 space-y-2">
              {['How to improve my English?', 'What is the difference between "affect" and "effect"?', 'Can you explain the present perfect tense?'].map((suggestion, index) => (
                <button 
                  key={index}
                  onClick={() => {
                    setMessage(suggestion);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs text-left rounded-xl transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      );
    }
    
    return (
      <div className="px-2 py-4">
        {messages.map((message, index) => (
          <ChatBubble
            key={message.id}
            message={message}
            isSelected={selectedMessages.has(message.id)}
            onSelect={toggleMessageSelection}
            darkMode={darkMode}
            formatMessage={formatMessage}
            animationDelay={index * 0.05}
          />
        ))}
      </div>
    );
  };
  
  // Add ref for suggestions
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-xl z-50 ${
          darkMode 
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
            : 'bg-indigo-500 hover:bg-indigo-600 text-white'
        }`}
        aria-label="Open chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            ref={chatWindowRef}
            className={`fixed bottom-20 right-6 rounded-xl shadow-2xl overflow-hidden z-40 flex flex-col ${
              darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'
            } border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
            style={{
              width: `${width}px`,
              height: isMinimized ? '48px' : `${height}px`,
            }}
          >
            <ChatHeader
              darkMode={darkMode}
              hasMessages={messages.length > 0}
              showClearConfirm={showClearConfirm}
              isMinimized={isMinimized}
              onClearClick={() => setShowClearConfirm(true)}
              onMinimizeClick={toggleMinimize}
              onCloseClick={toggleChat}
            />

            {/* Save to Notes Toolbar */}
            <AnimatePresence>
              {showSaveNotesButton && !isMinimized && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center justify-between px-4 py-2 ${
                    darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-indigo-50 border-b border-indigo-100'
                  }`}>
                  <div className="text-sm font-medium">
                    {selectedMessages.size} {selectedMessages.size === 1 ? 'message' : 'messages'} selected
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={copySelectedMessages}
                      className={`p-1.5 rounded-lg ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-100'
                      } transition-colors`}
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={saveMessagesToNotes}
                      className={`p-1.5 rounded-lg ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-100'
                      } transition-colors`}
                      title="Save to notes"
                    >
                      <BookmarkPlus size={16} />
                    </button>
                    <button
                      onClick={clearSelectedMessages}
                      className={`p-1.5 rounded-lg ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-100'
                      } transition-colors`}
                      title="Cancel selection"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isMinimized && (
              <>
                {/* Confirmation Dialog */}
                <AnimatePresence>
                  {showClearConfirm && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-0 flex items-center justify-center z-50 ${
                        darkMode ? 'bg-gray-900/90' : 'bg-black/50'
                      }`}
                    >
                      <motion.div 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        className={`p-6 rounded-lg shadow-lg max-w-[280px] ${
                          darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                      >
                        <h4 className="mb-3 text-lg font-medium">Clear All Messages?</h4>
                        <p className={`text-sm mb-4 ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          This will permanently delete all your chat messages. This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className={`px-4 py-2 rounded-md text-sm ${
                              darkMode 
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (user) {
                                await deleteAllMessages(user);
                                setShowClearConfirm(false);
                                setUserScrolled(false);
                                setIsAtBottom(true);
                                setShowScrollButton(false);
                                setLastMessageId(null);
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

                {/* Success Message */}
                <AnimatePresence>
                  {savedToNotesMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`absolute top-12 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md z-50 flex items-center space-x-2 ${
                        darkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 border border-green-200'
                      }`}
                    >
                      <Check size={16} />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Messages */}
                <div 
                  ref={chatMessagesRef}
                  className={`flex-1 overflow-y-auto ${
                    darkMode ? 'bg-gray-900 scrollbar-dark' : 'bg-gray-50 scrollbar-light'
                  }`}
                >
                  {renderMessages()}
                  
                  {/* This is the invisible element that we scroll to */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button */}
                <AnimatePresence>
                  {showScrollButton && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        setShowScrollButton(false);
                        setIsAtBottom(true);
                        setUserScrolled(false);
                      }}
                      className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 px-3 py-1.5 rounded-full ${
                        darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
                      } shadow-md flex items-center space-x-1.5 text-xs font-medium transition-all hover:bg-opacity-90`}
                    >
                      <ChevronDown size={14} />
                      <span>New messages</span>
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Error display */}
                {error && (
                  <div className={`px-3 py-1.5 text-xs ${
                    darkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-500 border-t border-red-100'
                  }`}>
                    {error}
                  </div>
                )}

                {/* Chat Input */}
                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  onSend={handleSendMessage}
                  loading={loading}
                  darkMode={darkMode}
                  disabled={!user}
                />

                {/* Resize handle */}
                <div
                  className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize ${
                    darkMode ? 'text-gray-700' : 'text-gray-400'
                  }`}
                  onMouseDown={handleResizeStart}
                >
                  ⋱
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 