import React, { useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  loading: boolean;
  disabled: boolean;
  isDarkMode: boolean;
}

export default function InputBar({
  value,
  onChange,
  onSend,
  onKeyPress,
  loading,
  disabled,
  isDarkMode
}: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const newHeight = Math.min(140, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value]);
  
  return (
    <div className={`p-3 border-t flex items-end gap-2 ${
      isDarkMode 
        ? 'bg-gray-900 border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      <div 
        className={`flex-1 rounded-xl overflow-hidden transition-all ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700 focus-within:border-indigo-500' 
            : 'bg-gray-50 border border-gray-300 focus-within:border-indigo-400'
        } focus-within:ring-1 ${
          isDarkMode ? 'focus-within:ring-indigo-500/40' : 'focus-within:ring-indigo-400/40'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyPress}
          placeholder="Type a message..."
          className={`w-full resize-none p-3 outline-none max-h-[140px] ${
            isDarkMode 
              ? 'bg-gray-800 text-white placeholder-gray-500' 
              : 'bg-gray-50 text-gray-800 placeholder-gray-400'
          }`}
          rows={1}
          disabled={disabled || loading}
        />
      </div>
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => !loading && value.trim() && onSend()}
        disabled={loading || !value.trim() || disabled}
        className={`p-3 rounded-xl transition-colors ${
          isDarkMode 
            ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40' 
            : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400/40'
        } text-white disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label="Send message"
      >
        {loading ? (
          <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
        ) : (
          <Send size={20} />
        )}
      </motion.button>
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        className={`p-3 rounded-xl ${
          isDarkMode 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'bg-purple-500 hover:bg-purple-600 text-white'
        }`}
        aria-label="Get suggestions"
        title="Get suggestions"
      >
        <Sparkles size={20} />
      </motion.button>
    </div>
  );
} 