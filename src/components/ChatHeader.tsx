import React, { memo } from 'react';
import { Trash2, Minimize2, Maximize2, X, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  darkMode: boolean;
  hasMessages: boolean;
  showClearConfirm: boolean;
  isMinimized: boolean;
  onClearClick: () => void;
  onMinimizeClick: (e: React.MouseEvent) => void;
  onCloseClick: () => void;
}

const ChatHeader = memo(({
  darkMode,
  hasMessages,
  showClearConfirm,
  isMinimized,
  onClearClick,
  onMinimizeClick,
  onCloseClick
}: ChatHeaderProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      className={`flex items-center justify-between p-4 ${hasMessages ? 'pt-5' : ''} ${
        darkMode 
          ? 'bg-gradient-to-r from-indigo-700 to-indigo-600 text-white' 
          : 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white'
      } rounded-t-xl`}
    >
      <div className="flex items-center space-x-2">
        <MessageCircle size={18} className="text-indigo-200" />
        <h3 className="text-sm font-medium">English Language Assistant</h3>
      </div>
      
      <div className="flex items-center space-x-1.5">
        {hasMessages && !showClearConfirm && (
          <button
            onClick={onClearClick}
            className="p-1.5 rounded-full transition-colors text-indigo-200 hover:text-white hover:bg-indigo-800/20"
            aria-label="Clear messages"
            title="Clear all messages"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button 
          onClick={onMinimizeClick} 
          className="p-1.5 rounded-full transition-colors text-indigo-200 hover:text-white hover:bg-indigo-800/20"
          aria-label={isMinimized ? "Maximize" : "Minimize"}
          title={isMinimized ? "Maximize" : "Minimize"}
        >
          {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
        <button 
          onClick={onCloseClick} 
          className="p-1.5 rounded-full transition-colors text-indigo-200 hover:text-white hover:bg-indigo-800/20"
          aria-label="Close"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader; 