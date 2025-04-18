"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, FilePlus, FileText, X, Loader2 } from 'lucide-react';
import { auth, db } from '@/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { NoteSession, ChatMessage, ChatbotRequest, NoteSummary, SummaryFormat } from '@/types/notes';
import jsPDF from 'jspdf';
import { Message } from "@/types";

interface NoteChatbotProps {
  sessions: NoteSession[];
  selectedFolder: string | null;
  selectedNoteIds: Set<string>;
  darkMode: boolean;
  onClearSelection: () => void;
}

export default function NoteChatbot({
  sessions,
  selectedFolder,
  selectedNoteIds,
  darkMode,
  onClearSelection
}: NoteChatbotProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chatbot is shown
  useEffect(() => {
    if (showChatbot) {
      inputRef.current?.focus();
    }
  }, [showChatbot]);

  // Initial greeting if notes are selected
  useEffect(() => {
    if (selectedNoteIds.size > 0 && messages.length === 0 && showChatbot) {
      setMessages([
        {
          id: Date.now().toString(),
          text: `You've selected ${selectedNoteIds.size} note${selectedNoteIds.size > 1 ? 's' : ''} from ${selectedFolder ? `the "${selectedFolder}" folder` : 'your notes'}. How would you like me to help with these notes?`,
          sender: 'bot',
          timestamp: new Date(),
        }
      ]);
    }
  }, [selectedNoteIds, sessions, selectedFolder, showChatbot, messages.length]);

  const toggleChatbot = () => {
    setShowChatbot(prev => !prev);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Parse the user's request
      const request = parseUserRequest(inputValue, selectedNoteIds);
      
      // Get selected notes content
      const selectedNotes = sessions.filter(note => selectedNoteIds.has(note.id));
      
      // Process the request
      const response = await processRequest(request, selectedNotes);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        relatedNotes: Array.from(selectedNoteIds),
        requestType: request.type
      }]);

      // If output was generated (like PDF), handle it
      if (response.output) {
        if (response.outputType === 'pdf') {
          // PDF already handled within processRequest
        }
      }

    } catch (error) {
      console.error('Error processing request:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseUserRequest = (input: string, noteIds: Set<string>): ChatbotRequest => {
    const inputLower = input.toLowerCase();
    
    // Default request
    const request: ChatbotRequest = {
      type: 'summarize',
      noteIds: Array.from(noteIds),
      options: {
        format: 'concise',
        outputType: 'text'
      }
    };

    // Check for summarization request
    if (inputLower.includes('summarize') || inputLower.includes('summary')) {
      request.type = 'summarize';
      
      // Check format
      if (inputLower.includes('bullet') || inputLower.includes('list')) {
        request.options!.format = 'bullets';
      } else if (inputLower.includes('detail')) {
        request.options!.format = 'detailed';
      } else if (inputLower.includes('study') || inputLower.includes('note')) {
        request.options!.format = 'study_notes';
      }
    }
    
    // Check for conversion request
    if (inputLower.includes('convert') || inputLower.includes('pdf') || inputLower.includes('download')) {
      request.type = 'convert';
      
      // Check output type
      if (inputLower.includes('pdf')) {
        request.options!.outputType = 'pdf';
      } else if (inputLower.includes('html')) {
        request.options!.outputType = 'html';
      }
    }
    
    // Check for analysis request
    if (inputLower.includes('analyze') || inputLower.includes('analysis')) {
      request.type = 'analyze';
    }
    
    // Add custom instructions if they exist
    request.options!.customInstructions = input;
    
    return request;
  };

  const processRequest = async (
    request: ChatbotRequest, 
    notes: NoteSession[]
  ): Promise<{ message: string; output?: string; outputType?: string }> => {
    if (!auth.currentUser?.email) {
      return { message: 'You must be logged in to process notes.' };
    }

    if (notes.length === 0) {
      return { message: 'No notes are selected. Please select at least one note.' };
    }

    const combinedText = notes.map(note => note.content).join('\n\n');
    const result = { message: '', output: '', outputType: '' };

    switch (request.type) {
      case 'summarize':
        const summary = createSummary(combinedText, request.options?.format || 'concise');
        
        // Ask for user consent before saving to Firebase
        const userConsent = window.confirm('Would you like to save this summary to your notes?');
        
        if (userConsent) {
          const summaryDoc: NoteSummary = {
            id: '',
            title: `Summary of ${notes.length} note${notes.length > 1 ? 's' : ''}${selectedFolder ? ` from ${selectedFolder}` : ''}`,
            summary,
            sourceNoteIds: notes.map(note => note.id),
            createdAt: new Date(),
            format: request.options?.format || 'concise',
            userEmail: auth.currentUser.email
          };
          
          // Save to Firebase
          await addDoc(collection(db, 'summaries'), {
            ...summaryDoc,
            createdAt: serverTimestamp(),
            userEmail: auth.currentUser.email
          });
          
          result.message = `I've created a summary of your notes and saved it to your account. Here it is:\n\n${summary}`;
        } else {
          result.message = `Here's a summary of your notes (not saved):\n\n${summary}`;
        }
        break;
        
      case 'convert':
        if (request.options?.outputType === 'pdf') {
          const doc = new jsPDF();
          
          // Add title
          doc.setFontSize(16);
          doc.text(`Notes from ${selectedFolder || 'All Folders'}`, 20, 20);
          
          // Add content
          doc.setFontSize(12);
          
          // Format content for PDF
          let yPos = 30;
          const margin = 20;
          const pageWidth = doc.internal.pageSize.getWidth();
          const maxWidth = pageWidth - 2 * margin;
          
          // Add each note with title and content
          for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            
            // Add note title
            doc.setFont('helvetica', 'bold');
            doc.text(`${i + 1}. ${note.title || 'Untitled Note'}`, margin, yPos);
            yPos += 10;
            
            // Add note timestamp
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.text(note.timestamp, margin, yPos);
            yPos += 7;
            
            // Add note content
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            
            const textLines = doc.splitTextToSize(note.content, maxWidth);
            for (const line of textLines) {
              // Check if we need a new page
              if (yPos > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPos = margin + 10;
              }
              
              doc.text(line, margin, yPos);
              yPos += 6;
            }
            
            // Add space between notes
            yPos += 10;
          }
          
          // Save the PDF
          doc.save(`english_notes_${new Date().toISOString().split('T')[0]}.pdf`);
          
          result.message = `I've converted your notes to a PDF file and started the download.`;
          result.output = 'pdf';
          result.outputType = 'pdf';
        } else {
          result.message = 'I can currently only convert notes to PDF format. Would you like to generate a PDF?';
        }
        break;
        
      case 'analyze':
        const analysis = analyzeNotes(notes);
        result.message = `Here's my analysis of your selected notes:\n\n${analysis}`;
        break;
        
      default:
        return { 
          message: "I didn't understand your request. Would you like me to summarize your notes, convert them to PDF, or analyze them?"
        };
    }
    
    return result;
  };

  const createSummary = (text: string, format: SummaryFormat): string => {
    // In a real implementation, this would use an LLM or more sophisticated summarization
    // For now, we'll do a simple version
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let summary = '';
    
    switch (format) {
      case 'concise':
        // Take first sentence and some keywords
        summary = sentences.slice(0, Math.min(3, sentences.length)).join('. ') + '.';
        break;
        
      case 'detailed':
        // Take more sentences
        summary = sentences.slice(0, Math.min(7, sentences.length)).join('. ') + '.';
        break;
        
      case 'bullets':
        // Create bullet points from key sentences
        const bulletPoints = sentences
          .slice(0, Math.min(5, sentences.length))
          .map(s => `• ${s.trim()}`);
        summary = bulletPoints.join('\n');
        break;
        
      case 'study_notes':
        // Create a study note format
        summary = `## Study Notes\n\n`;
        summary += `### Main Points\n`;
        
        const mainPoints = sentences
          .slice(0, Math.min(3, sentences.length))
          .map(s => `- ${s.trim()}`);
        summary += mainPoints.join('\n') + '\n\n';
        
        summary += `### Details\n`;
        const details = sentences
          .slice(3, Math.min(8, sentences.length))
          .map(s => `- ${s.trim()}`);
        summary += details.join('\n');
        break;
    }
    
    return summary;
  };

  const analyzeNotes = (notes: NoteSession[]): string => {
    // Simple analysis logic
    const totalCharacters = notes.reduce((sum, note) => sum + note.content.length, 0);
    const totalWords = notes.reduce((sum, note) => {
      return sum + note.content.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    
    const oldestNote = notes.reduce((oldest, note) => {
      const currentDate = new Date(note.timestamp);
      const oldestDate = new Date(oldest.timestamp);
      return currentDate < oldestDate ? note : oldest;
    }, notes[0]);
    
    const newestNote = notes.reduce((newest, note) => {
      const currentDate = new Date(note.timestamp);
      const newestDate = new Date(newest.timestamp);
      return currentDate > newestDate ? note : newest;
    }, notes[0]);
    
    return `Analysis of ${notes.length} notes:\n\n` +
      `- Total characters: ${totalCharacters}\n` +
      `- Total words: ${totalWords}\n` +
      `- Average words per note: ${Math.round(totalWords / notes.length)}\n` +
      `- Date range: From ${oldestNote.timestamp} to ${newestNote.timestamp}\n` +
      `- Most common topics: English practice, conversation notes`;
  };

  // Render suggestion buttons based on selected notes
  const renderSuggestions = () => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={() => {
            setInputValue('Summarize these notes briefly');
            inputRef.current?.focus();
          }}
          className={`px-3 py-1 text-xs rounded-full ${
            darkMode
              ? 'bg-blue-800 hover:bg-blue-700 text-white'
              : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
          }`}
        >
          Summarize briefly
        </button>
        <button
          onClick={() => {
            setInputValue('Create bullet point summary');
            inputRef.current?.focus();
          }}
          className={`px-3 py-1 text-xs rounded-full ${
            darkMode
              ? 'bg-purple-800 hover:bg-purple-700 text-white' 
              : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
          }`}
        >
          Bullet points
        </button>
        <button
          onClick={() => {
            setInputValue('Convert notes to PDF');
            inputRef.current?.focus();
          }}
          className={`px-3 py-1 text-xs rounded-full ${
            darkMode
              ? 'bg-green-800 hover:bg-green-700 text-white'
              : 'bg-green-100 hover:bg-green-200 text-green-800'
          }`}
        >
          Convert to PDF
        </button>
      </div>
    );
  };

  // Render selected notes count badge
  const renderSelectionBadge = () => {
    if (selectedNoteIds.size === 0) return null;
    
    return (
      <div 
        className={`fixed bottom-24 right-6 flex items-center ${
          darkMode
            ? 'bg-blue-700 text-white'
            : 'bg-blue-100 text-blue-800'
        } px-3 py-1.5 rounded-full shadow-lg cursor-pointer`}
        onClick={toggleChatbot}
      >
        <FileText size={16} className="mr-2" />
        <span>{selectedNoteIds.size} note{selectedNoteIds.size > 1 ? 's' : ''} selected</span>
      </div>
    );
  };

  // Only show chatbot if notes are selected
  if (selectedNoteIds.size === 0) {
    return null;
  }

  return (
    <>
      {renderSelectionBadge()}
      
      {showChatbot && (
        <div 
          className={`fixed bottom-4 right-4 w-96 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-xl border ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } flex flex-col max-h-[500px] z-50`}
        >
          {/* Header */}
          <div className={`px-4 py-3 flex justify-between items-center border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center">
              <FilePlus size={18} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h3 className="ml-2 font-medium">Notes Assistant</h3>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={onClearSelection}
                className={`p-1 rounded-md hover:${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}
                title="Clear selection"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 ${
            darkMode ? 'text-gray-200' : 'text-gray-800'
          }`}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText size={32} className={`mb-3 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  You've selected {selectedNoteIds.size} note{selectedNoteIds.size > 1 ? 's' : ''}.
                  <br />Ask me to summarize or convert them!
                </p>
                {renderSuggestions()}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`mb-4 ${
                      message.sender === 'user' ? 'ml-8' : 'mr-8'
                    }`}
                  >
                    <div className={`rounded-lg p-3 ${
                      message.sender === 'user'
                        ? darkMode
                          ? 'bg-blue-700 text-white ml-auto'
                          : 'bg-blue-100 text-blue-900 ml-auto'
                        : darkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </div>
                    <p className={`text-xs mt-1 ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    } ${message.sender === 'user' ? 'text-right' : ''}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {/* Input */}
          <div className={`p-3 border-t ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a request..."
                className={`flex-1 py-2 px-3 rounded-l-md outline-none ${
                  darkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-200'
                } border`}
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !inputValue.trim()}
                className={`px-3 rounded-r-md flex items-center justify-center ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-200 disabled:text-gray-400'
                }`}
              >
                {isProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            {!isProcessing && messages.length === 0 && renderSuggestions()}
          </div>
        </div>
      )}
    </>
  );
} 