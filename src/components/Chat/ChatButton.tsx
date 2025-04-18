import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  position: string;
  isDarkMode: boolean;
}

export default function ChatButton({ 
  isOpen, 
  onClick,
  position,
  isDarkMode 
}: ChatButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`fixed ${position} shadow-lg z-50 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode 
          ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500' 
          : 'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-400'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <span className="sr-only">{isOpen ? 'Close chat' : 'Open chat'}</span>
      
      {/* Button content with animations */}
      <div className="relative p-3 flex items-center justify-center">
        <motion.span
          initial={false}
          animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <MessageCircle size={24} strokeWidth={2} />
        </motion.span>
        
        <motion.span
          initial={false}
          animate={{ rotate: isOpen ? 0 : -90, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <X size={24} strokeWidth={2} />
        </motion.span>
      </div>
      
      {/* Notification dot when new messages arrive (could be controlled by a prop) */}
      {!isOpen && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
        />
      )}
    </motion.button>
  );
} 