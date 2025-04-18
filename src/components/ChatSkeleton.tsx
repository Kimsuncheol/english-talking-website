import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ChatSkeletonProps {
  darkMode: boolean;
  messageCount?: number;
}

const ChatSkeleton = ({ darkMode, messageCount = 3 }: ChatSkeletonProps) => {
  // Pre-compute random widths for better performance
  const randomWidths = useMemo(() => {
    return Array.from({ length: messageCount * 3 }, () => {
      const baseWidth = Math.floor(Math.random() * 100) + 80;
      return `${baseWidth}px`;
    });
  }, [messageCount]);

  // Staggered animation for bubbles
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="flex flex-col space-y-6 w-full p-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {Array.from({ length: messageCount }).map((_, i) => {
        const isUser = i % 2 === 0;
        const widthIdx = i * 3;
        
        return (
          <motion.div 
            key={i} 
            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            variants={item}
          >
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
              {/* Avatar for AI messages */}
              {!isUser && (
                <div className={`absolute -left-1 -top-1 w-7 h-7 rounded-full ${
                  darkMode ? 'bg-indigo-700' : 'bg-indigo-100'
                } flex-shrink-0 animate-pulse hidden`} />
              )}
              
              {/* Message bubble */}
              <div className={`relative rounded-2xl overflow-hidden ${
                darkMode 
                  ? (isUser ? 'bg-indigo-700/40' : 'bg-gray-800/70')
                  : (isUser ? 'bg-indigo-100/80' : 'bg-gray-200/70')
              } p-3 shadow-sm`}>
                <div className="flex flex-col gap-2">
                  <div 
                    className={`h-3 rounded-full animate-pulse ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                    style={{ width: randomWidths[widthIdx] }}
                  />
                  <div 
                    className={`h-3 rounded-full animate-pulse ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                    style={{ width: randomWidths[widthIdx + 1] }}
                  />
                  {Math.random() > 0.3 && (
                    <div 
                      className={`h-3 rounded-full animate-pulse ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                      style={{ width: randomWidths[widthIdx + 2] }}
                    />
                  )}
                </div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="skeleton-shine" />
                </div>
              </div>
              
              {/* Timestamp */}
              <div 
                className={`h-2 w-12 mt-2 rounded-full ${
                  darkMode ? 'bg-gray-700/40' : 'bg-gray-200/70'
                } animate-pulse`}
              />
            </div>
          </motion.div>
        );
      })}
      
      {/* Typing indicator for the last message if it's from AI */}
      {messageCount % 2 === 1 && (
        <motion.div 
          className="flex w-full justify-start mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className={`inline-flex items-center px-3 py-2 rounded-full ${
            darkMode ? 'bg-gray-800' : 'bg-gray-200'
          }`}>
            <div className="flex space-x-1">
              <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'} animate-typing`} />
              <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'} animate-typing-2`} />
              <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-500'} animate-typing-3`} />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ChatSkeleton; 