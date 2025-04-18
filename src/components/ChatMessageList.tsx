import React, { memo } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Check } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Timestamp | null;
}

interface MessageGroup {
  sender: 'user' | 'ai';
  messages: Message[];
  timestamp: Timestamp | null;
}

interface MessageItemProps {
  group: MessageGroup;
  style: React.CSSProperties;
  selectedMessages: Set<string>;
  toggleMessageSelection: (messageId: string) => void;
  darkMode: boolean;
  formatMessage: (text: string) => string;
}

interface ChatMessageListProps {
  groupedMessages: MessageGroup[];
  selectedMessages: Set<string>;
  toggleMessageSelection: (messageId: string) => void;
  darkMode: boolean;
  formatMessage: (text: string) => string;
}

const MessageItem = memo(({ 
  group, 
  style, 
  selectedMessages, 
  toggleMessageSelection, 
  darkMode, 
  formatMessage 
}: MessageItemProps) => (
  <div style={style}>
    <div className={`flex ${group.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] rounded-lg overflow-hidden ${
        group.sender === 'user' 
          ? `${darkMode ? 'bg-indigo-600' : 'bg-indigo-100 text-indigo-900'}`
          : `${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`
      }`}>
        {group.messages.map((msg, msgIndex) => (
          <div 
            key={msg.id} 
            className={`relative p-3 ${msgIndex > 0 ? 'pt-1' : ''} ${
              selectedMessages.has(msg.id) ? 
                (darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50') : ''
            } hover:cursor-pointer transition-colors`}
            onClick={() => toggleMessageSelection(msg.id)}
          >
            {selectedMessages.has(msg.id) && (
              <div className={`absolute top-2 right-2 rounded-full p-0.5 ${
                darkMode ? 'bg-indigo-400' : 'bg-indigo-500 text-white'
              }`}>
                <Check size={12} />
              </div>
            )}
            
            {group.sender === 'user' ? (
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            ) : (
              <div 
                className="text-sm ai-message message-content"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
));

MessageItem.displayName = 'MessageItem';

const ChatMessageList = memo(({
  groupedMessages,
  selectedMessages,
  toggleMessageSelection,
  darkMode,
  formatMessage
}: ChatMessageListProps) => {
  const getItemSize = (index: number) => {
    const group = groupedMessages[index];
    // Estimate height based on content length and number of messages
    const baseHeight = 80; // Base height for a message
    const contentLength = group.messages.reduce((acc, msg) => acc + msg.text.length, 0);
    const messageCount = group.messages.length;
    
    // Rough estimation: 20px per 100 characters + base height per message
    return Math.max(baseHeight, (contentLength / 100) * 20 + messageCount * baseHeight);
  };

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <List
            height={height}
            itemCount={groupedMessages.length}
            itemSize={getItemSize}
            width={width}
            overscanCount={5}
          >
            {({ index, style }: { index: number; style: React.CSSProperties }) => (
              <MessageItem
                group={groupedMessages[index]}
                style={style}
                selectedMessages={selectedMessages}
                toggleMessageSelection={toggleMessageSelection}
                darkMode={darkMode}
                formatMessage={formatMessage}
              />
            )}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

ChatMessageList.displayName = 'ChatMessageList';

export default ChatMessageList; 