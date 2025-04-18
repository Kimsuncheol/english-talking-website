import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistance } from 'date-fns';

interface ChatBubbleProps {
  message: {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: any;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
  darkMode: boolean;
  formatMessage: (text: string) => string;
  animationDelay?: number;
}

const ChatBubble = memo(({
  message,
  isSelected,
  onSelect,
  darkMode,
  formatMessage,
  animationDelay = 0
}: ChatBubbleProps) => {
  const isUser = message.sender === 'user';
  
  // Format relative time (e.g., "5 minutes ago")
  const formattedTime = message.timestamp ? 
    formatDistance(
      new Date(message.timestamp.seconds * 1000),
      new Date(),
      { addSuffix: true }
    ) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      className={`group relative px-1 py-0.5 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}
    >
      <div 
        onClick={() => onSelect(message.id)}
        className={`relative max-w-[85%] rounded-2xl overflow-hidden transition-all 
          ${isSelected ? 'ring-2 ring-offset-1' : 'hover:brightness-95 dark:hover:brightness-110'}
          ${isUser 
            ? `${darkMode 
                ? 'bg-indigo-600 text-white ring-indigo-400' 
                : 'bg-indigo-100 text-indigo-900 ring-indigo-300'}`
            : `${darkMode 
                ? 'bg-gray-800 text-gray-100 ring-gray-600' 
                : 'bg-white text-gray-800 shadow-sm border border-gray-200 ring-gray-300'}`
          }
          cursor-pointer`}
      >
        {isSelected && (
          <span className={`absolute top-2 right-2 z-10 p-0.5 rounded-full ${
            darkMode ? 'bg-indigo-400' : 'bg-indigo-500 text-white'
          }`}>
            <Check size={10} />
          </span>
        )}

        <div className="p-3">
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          ) : (
            <div 
              className="text-sm ai-message message-content"
              dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
            />
          )}
        </div>
      </div>
      
      {/* Time indicator */}
      <div className={`text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
        isUser ? 'text-right mr-2' : 'text-left ml-2'
      } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {formattedTime}
      </div>
    </motion.div>
  );
});

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble; 