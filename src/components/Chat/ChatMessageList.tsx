import React from 'react';
import { Message } from './index';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface ChatMessageListProps {
  messages: Message[];
  selectedMessages: Set<string>;
  onToggleSelection: (id: string) => void;
  isDarkMode: boolean;
}

// Helper to format messages with HTML
const formatMessageContent = (text: string): string => {
  if (!text) return '';
  
  // Replace markdown bold
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace bullet points
  formatted = formatted.replace(/^• (.*)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^- (.*)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^[0-9]+\. (.*)$/gm, '<li>$1</li>');
  
  // Wrap lists
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul class="pl-5 my-2 list-disc">$1</ul>');
  }
  
  // Format headings
  formatted = formatted.replace(/^([A-Za-z]+):(?:\s|<br>)/gm, '<h4 class="font-bold mt-2 mb-1">$1:</h4>');
  
  // Handle paragraphs
  formatted = formatted.replace(/<br><br>/g, '</p><p class="mb-2">');
  formatted = `<p class="mb-2">${formatted}</p>`;
  formatted = formatted.replace(/<p class="mb-2"><\/p>/g, '');
  
  // Convert line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
};

export default function ChatMessageList({
  messages,
  selectedMessages,
  onToggleSelection,
  isDarkMode
}: ChatMessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isUser = message.sender === 'user';
        const isSelected = selectedMessages.has(message.id);
        const formattedTime = message.timestamp 
          ? formatDistance(new Date(message.timestamp.seconds * 1000), new Date(), { addSuffix: true })
          : '';
        
        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * index }}
            className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex flex-col max-w-[85%]">
              <div 
                className={`relative rounded-2xl overflow-hidden shadow-sm transition-all ${
                  isSelected ? 'ring-2 ring-offset-1' : ''
                } ${
                  isUser 
                    ? (isDarkMode 
                        ? 'bg-indigo-600 text-white ring-indigo-400' 
                        : 'bg-indigo-100 text-indigo-900 ring-indigo-300')
                    : (isDarkMode 
                        ? 'bg-gray-800 text-gray-100 ring-gray-600' 
                        : 'bg-white text-gray-800 border border-gray-200 ring-gray-300')
                } cursor-pointer hover:shadow-md`}
                onClick={() => onToggleSelection(message.id)}
              >
                {isSelected && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute top-2 right-2 z-10 rounded-full p-0.5 ${
                      isDarkMode ? 'bg-indigo-400' : 'bg-indigo-500 text-white'
                    }`}
                  >
                    <Check size={12} />
                  </motion.div>
                )}
                
                <div className="p-3 text-sm">
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{message.text}</div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.text) }} />
                  )}
                </div>
              </div>
              
              <div className={`text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                isUser ? 'text-right' : 'text-left'
              } ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {formattedTime}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
} 