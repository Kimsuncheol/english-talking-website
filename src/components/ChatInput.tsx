import React, { memo, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: (e: React.FormEvent) => void;
  loading: boolean;
  darkMode: boolean;
  disabled: boolean;
}

const ChatInput = memo(({
  message,
  setMessage,
  onSend,
  loading,
  darkMode,
  disabled
}: ChatInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize text input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(120, inputRef.current.scrollHeight);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  return (
    <motion.form 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      onSubmit={onSend} 
      className={`flex items-end p-3 border-t ${
        darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className={`flex-1 relative rounded-xl overflow-hidden ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'
      } transition-all focus-within:ring-2 ${
        darkMode ? 'focus-within:ring-indigo-500/50' : 'focus-within:ring-indigo-300/50'
      }`}>
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask about grammar, vocabulary..."
          className={`w-full p-3 pr-10 resize-none max-h-[120px] ${
            darkMode 
              ? 'bg-gray-800 text-white placeholder-gray-500' 
              : 'bg-white text-gray-800'
          } focus:outline-none`}
          rows={1}
          disabled={loading || disabled}
          style={{ minHeight: '44px' }}
        />
        <div className="absolute text-xs text-gray-500 bottom-1 right-2">
          {message.length > 0 && (
            <span className="mr-1" title="Press Enter to send">
              <CornerDownLeft size={14} className="inline-block mb-0.5" />
            </span>
          )}
        </div>
      </div>
      
      <button 
        type="submit" 
        className={`p-3 ml-2 rounded-xl ${
          darkMode 
            ? 'bg-indigo-600 hover:bg-indigo-700' 
            : 'bg-indigo-500 hover:bg-indigo-600'
        } text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${message.trim() ? 'scale-100' : 'scale-95 opacity-90'}`}
        disabled={loading || !message.trim() || disabled}
        title="Send message"
        aria-label="Send message"
      >
        {loading ? (
          <div className="h-[18px] w-[18px] rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <Send size={18} />
        )}
      </button>
      
      <button 
        type="button"
        className={`p-3 ml-2 rounded-xl ${
          darkMode 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'bg-purple-500 hover:bg-purple-600'
        } text-white transition-all`}
        title="Get suggestions"
        aria-label="Get suggestions"
      >
        <Sparkles size={18} />
      </button>
    </motion.form>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput; 