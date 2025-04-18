"use client";

import React, { useState, useEffect, useRef } from 'react';
import BackButton from '@/components/BackButton';
import { Trash2, MessageSquare, X, FileText, FolderIcon, MinusIcon, Maximize2, Import, GripVertical, Minimize2 } from 'lucide-react';
import NotesFolder from '@/components/NotesFolder';
import { auth, db } from '@/firebase/firebase';
import { collection, query, where, getDocs, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { NoteSession, NoteSummary, SummaryFormat, ChatMessage, NoteContentType } from '@/types/notes';
import { serverTimestamp } from 'firebase/firestore';

export default function NotesPage() {
  const [sessions, setSessions] = useState<NoteSession[]>([]);
  const [summaries, setSummaries] = useState<Partial<NoteSummary>[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [contentType, setContentType] = useState<NoteContentType>('general');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [messageToSave, setMessageToSave] = useState<ChatMessage | null>(null);
  const [activeFolderType, setActiveFolderType] = useState<'notes' | 'summaries'>('notes');
  const [chatSize, setChatSize] = useState<'normal' | 'minimized' | 'maximized'>('normal');
  const [isDragging, setIsDragging] = useState(false);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUserData = async (userEmail: string) => {
      try {
        setLoading(true);
        
        // Load notes
        const notesRef = collection(db, 'notes');
        const notesQuery = query(notesRef, where('userEmail', '==', userEmail), orderBy('timestamp', 'desc'));
        const notesSnapshot = await getDocs(notesQuery);
        
        const loadedNotes: NoteSession[] = notesSnapshot.docs.map(doc => ({
          id: doc.id,
          timestamp: doc.data().timestamp,
          content: doc.data().content,
          folder: doc.data().folder,
          title: doc.data().title
        }));
        
        // Load summaries
        const summariesRef = collection(db, 'note_summaries');
        const summariesQuery = query(summariesRef, where('userEmail', '==', userEmail), orderBy('timestamp', 'desc'));
        const summariesSnapshot = await getDocs(summariesQuery);
        
        const loadedSummaries = summariesSnapshot.docs.map(doc => ({
          id: doc.id,
          timestamp: doc.data().timestamp,
          summary: doc.data().content || doc.data().summary,
          title: doc.data().title,
          sourceNoteIds: doc.data().sourceNoteIds || [],
          contentType: doc.data().category || doc.data().contentType || 'general',
          format: doc.data().format || 'concise',
          createdAt: doc.data().timestamp || new Date(),
          userEmail: doc.data().userEmail
        }));

        setSessions(loadedNotes);
        setSummaries(loadedSummaries);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        loadUserData(user.email);
      } else {
        setSessions([]);
        setSummaries([]);
        setLoading(false);
      }
    });

    // Check theme preference
    const storedTheme = localStorage.getItem('preferredTheme');
    if (storedTheme === 'dark') {
      setDarkMode(true);
    } else if (storedTheme === 'light') {
      setDarkMode(false);
    } else {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
    }

    return () => unsubscribe();
  }, []);

  const clearAllNotes = async () => {
    if (!auth.currentUser?.email) return;
    
    if (window.confirm('Are you sure you want to clear all your notes? This action cannot be undone.')) {
      try {
        const notesRef = collection(db, 'notes');
        const q = query(notesRef, where('userEmail', '==', auth.currentUser.email));
        const querySnapshot = await getDocs(q);
        
        // Delete each note document
        await Promise.all(
          querySnapshot.docs.map(doc => deleteDoc(doc.ref))
        );

        setSessions([]);
      } catch (error) {
        console.error('Error clearing notes:', error);
      }
    }
  };

  const clearAllSummaries = async () => {
    if (!auth.currentUser?.email) return;
    
    if (window.confirm('Are you sure you want to clear all your note summaries? This action cannot be undone.')) {
      try {
        const summariesRef = collection(db, 'note_summaries');
        const q = query(summariesRef, where('userEmail', '==', auth.currentUser.email));
        const querySnapshot = await getDocs(q);
        
        // Delete each summary document
        await Promise.all(
          querySnapshot.docs.map(doc => deleteDoc(doc.ref))
        );

        setSummaries([]);
      } catch (error) {
        console.error('Error clearing summaries:', error);
      }
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelection = new Set(selectedNotes);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNotes(newSelection);
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || processingRequest) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      sender: 'user',
      timestamp: new Date(),
      relatedNotes: Array.from(selectedNotes)
    };

    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setProcessingRequest(true);

    try {
      // Process user request
      const botResponse = await processUserRequest(userMessage);
      setChatMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error processing request:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setProcessingRequest(false);
    }
  };

  const processUserRequest = async (userMessage: ChatMessage): Promise<ChatMessage> => {
    const selectedNoteIds = Array.from(selectedNotes);
    
    if (selectedNoteIds.length === 0) {
      return {
        id: Date.now().toString(),
        text: 'Please select one or more notes first. You can click on notes in the folders to select them.',
        sender: 'bot',
        timestamp: new Date()
      };
    }

    const selectedNotesData = sessions.filter(note => selectedNoteIds.includes(note.id));
    const userText = userMessage.text.toLowerCase();
    
    // Determine request type and format
    let requestType: ChatbotRequest['type'] = 'summarize';
    let format: SummaryFormat = 'concise';
    let extractType: NoteContentType = 'general';
    
    // Check for extraction request
    if (userText.includes('extract') || userText.includes('vocabulary') || 
        userText.includes('grammar') || userText.includes('slang')) {
      requestType = 'extract';
      
      if (userText.includes('vocabulary') || userText.includes('vocab') || userText.includes('word')) {
        extractType = 'vocabulary';
      } else if (userText.includes('grammar') || userText.includes('rule')) {
        extractType = 'grammar';
      } else if (userText.includes('slang') || userText.includes('idiom')) {
        extractType = 'slang';
      }
    } else if (userText.includes('convert') || userText.includes('pdf')) {
      requestType = 'convert';
    } else if (userText.includes('analyze')) {
      requestType = 'analyze';
    }
    
    if (userText.includes('detail')) {
      format = 'detailed';
    } else if (userText.includes('bullet') || userText.includes('list')) {
      format = 'bullets';
    } else if (userText.includes('study') || userText.includes('note')) {
      format = 'study_notes';
    }

    // Simulate AI processing - In a real implementation, call OpenAI API here
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let response: ChatMessage;
    
    if (requestType === 'extract') {
      const { content, extractedContent } = extractContent(selectedNotesData, extractType);
      response = {
        id: Date.now().toString(),
        text: content,
        sender: 'bot',
        timestamp: new Date(),
        relatedNotes: selectedNoteIds,
        requestType,
        extractedContent,
        contentType: extractType,
        html: formatExtractedContent(extractedContent, extractType)
      };
    } else {
      // Generate a simple summary based on the notes
      const summary = generateSummary(selectedNotesData, format);
      response = {
        id: Date.now().toString(),
        text: summary,
        sender: 'bot',
        timestamp: new Date(),
        relatedNotes: selectedNoteIds,
        requestType
      };
    }
    
    return response;
  };

  const extractContent = (notes: NoteSession[], type: NoteContentType): { content: string, extractedContent: ExtractedContent } => {
    const extractedContent: ExtractedContent = {
      vocabularyItems: [],
      grammarRules: [],
      slangTerms: [],
      sentences: []
    };
    
    let content = "";
    
    switch (type) {
      case 'vocabulary':
        content = "I've extracted vocabulary items from your notes:\n\n";
        
        // Simulate vocabulary extraction - in a real app, use NLP or regex patterns
        notes.forEach(note => {
          const sentences = note.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
          
          // Extract potential vocabulary (simple simulation)
          const vocab = note.content.match(/\b[A-Z][a-z]{2,}\b: [^.!?]+/g) || [];
          
          vocab.forEach(item => {
            const [term, meaning] = item.split(/: (.+)/);
            
            if (term && meaning) {
              // Find examples containing this word
              const examples = sentences.filter(s => 
                s.toLowerCase().includes(term.toLowerCase())
              ).map(s => s.trim());
              
              extractedContent.vocabularyItems?.push({
                term: term.trim(),
                meaning: meaning.trim(),
                examples: examples.slice(0, 2) // Limit to 2 examples
              });
              
              content += `• ${term.trim()}: ${meaning.trim()}\n`;
              if (examples.length > 0) {
                content += `  Example: ${examples[0].trim()}\n\n`;
              } else {
                content += "\n";
              }
            }
          });
        });
        
        // If no vocabulary found, create some simulated items
        if (extractedContent.vocabularyItems?.length === 0) {
          const combinedText = notes.map(n => n.content).join(' ');
          const words = combinedText.match(/\b[A-Z][a-z]{5,}\b/g) || [];
          
          [...new Set(words)].slice(0, 5).forEach(term => {
            extractedContent.vocabularyItems?.push({
              term,
              meaning: `Meaning of ${term.toLowerCase()}`,
              examples: ['Example sentence containing ' + term.toLowerCase()]
            });
            
            content += `• ${term}: Meaning of ${term.toLowerCase()}\n`;
            content += `  Example: Example sentence containing ${term.toLowerCase()}\n\n`;
          });
        }
        
        content += "\nNote: This is a simple extraction. For more accurate results, try using properly formatted vocabulary in your notes.";
        break;
        
      case 'grammar':
        content = "I've extracted grammar rules from your notes:\n\n";
        
        notes.forEach(note => {
          // Look for patterns like "Rule:" or sentences containing "grammar rule"
          const rules = note.content.match(/[^.!?]*(?:grammar rule|rule:)[^.!?]+[.!?]/gi) || [];
          
          rules.forEach(rule => {
            const cleanRule = rule.trim();
            const sentences = note.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            
            extractedContent.grammarRules?.push({
              rule: cleanRule,
              explanation: "Extracted from your notes",
              examples: sentences.slice(0, 2)
            });
            
            content += `• ${cleanRule}\n\n`;
          });
        });
        
        // If no grammar rules found, create dummy content
        if (extractedContent.grammarRules?.length === 0) {
          content = "I couldn't find explicit grammar rules in your notes. Here's the content I analyzed:\n\n";
          
          notes.forEach(note => {
            content += `${note.title}:\n${note.content.substring(0, 150)}...\n\n`;
          });
          
          content += "\nTip: For better grammar extraction, try structuring your notes with clear 'Rule:' labels or explicit grammar points.";
        }
        break;
        
      case 'slang':
        content = "I've extracted slang terms from your notes:\n\n";
        
        notes.forEach(note => {
          // Look for patterns like "Slang:" or quotes that might contain slang
          const slangTerms = note.content.match(/\b[A-Za-z'-]+\b\s*\(slang\)[^.!?]+[.!?]/gi) || 
                           note.content.match(/"[^"]+"\s*-\s*[^.!?]+[.!?]/g) || [];
          
          slangTerms.forEach(term => {
            const parts = term.split(/\s*-\s*|\s*\(slang\)\s*/);
            
            if (parts.length >= 2) {
              const slangTerm = parts[0].replace(/"/g, '').trim();
              const meaning = parts[1].trim();
              
              extractedContent.slangTerms?.push({
                term: slangTerm,
                meaning: meaning,
                examples: [term]
              });
              
              content += `• "${slangTerm}" - ${meaning}\n\n`;
            }
          });
        });
        
        // If no slang terms found, provide a message
        if (extractedContent.slangTerms?.length === 0) {
          content = "I couldn't find explicit slang terms in your notes. Here's the content I analyzed:\n\n";
          
          notes.forEach(note => {
            const sentences = note.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            extractedContent.sentences = [...(extractedContent.sentences || []), ...sentences];
            
            content += `${note.title}:\n${note.content.substring(0, 150)}...\n\n`;
          });
          
          content += "\nTip: For better slang extraction, try formatting slang terms like: \"cool\" - very good or impressive.";
        }
        break;
        
      default:
        content = "I've reviewed your notes but couldn't determine what to extract. Please specify if you want vocabulary, grammar rules, or slang terms.";
        
        // Extract all sentences as a fallback
        notes.forEach(note => {
          const sentences = note.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
          extractedContent.sentences = [...(extractedContent.sentences || []), ...sentences];
        });
    }
    
    return { content, extractedContent };
  };

  const formatExtractedContent = (content: ExtractedContent, type: NoteContentType): string => {
    let html = '';
    
    switch (type) {
      case 'vocabulary':
        html = '<div class="extracted-vocabulary">';
        content.vocabularyItems?.forEach(item => {
          html += `<div class="vocab-item">
            <h3 class="vocab-term" style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">${item.term}</h3>
            <p class="vocab-meaning" style="margin-bottom: 4px;">${item.meaning}</p>
            ${item.examples.map(ex => 
              `<p class="vocab-example" style="font-style: italic; color: #6b7280; margin-left: 12px;">${ex}</p>`
            ).join('')}
          </div>`;
        });
        html += '</div>';
        break;
        
      case 'grammar':
        html = '<div class="extracted-grammar">';
        content.grammarRules?.forEach(rule => {
          html += `<div class="grammar-item">
            <h3 class="grammar-rule" style="color: #10b981; font-weight: bold; margin-bottom: 4px;">${rule.rule}</h3>
            <p class="grammar-explanation" style="margin-bottom: 4px;">${rule.explanation}</p>
            ${rule.examples.map(ex => 
              `<p class="grammar-example" style="font-style: italic; color: #6b7280; margin-left: 12px;">${ex}</p>`
            ).join('')}
          </div>`;
        });
        html += '</div>';
        break;
        
      case 'slang':
        html = '<div class="extracted-slang">';
        content.slangTerms?.forEach(term => {
          html += `<div class="slang-item">
            <h3 class="slang-term" style="color: #8b5cf6; font-weight: bold; margin-bottom: 4px;">${term.term}</h3>
            <p class="slang-meaning" style="margin-bottom: 4px;">${term.meaning}</p>
            ${term.examples.map(ex => 
              `<p class="slang-example" style="font-style: italic; color: #6b7280; margin-left: 12px;">${ex}</p>`
            ).join('')}
          </div>`;
        });
        html += '</div>';
        break;
        
      default:
        if (content.sentences && content.sentences.length > 0) {
          html = '<div class="extracted-sentences">';
          content.sentences.forEach(sentence => {
            html += `<p class="sentence" style="margin-bottom: 8px;">${sentence}</p>`;
          });
          html += '</div>';
        }
    }
    
    return html;
  };

  const generateSummary = (notes: NoteSession[], format: SummaryFormat): string => {
    if (notes.length === 0) return "No notes selected to summarize.";
    
    let summary = "";
    
    switch (format) {
      case 'bullets':
        summary = "Here's a bullet-point summary of your selected notes:\n\n";
        notes.forEach(note => {
          const title = note.title || `Note from ${new Date(note.timestamp).toLocaleDateString()}`;
          summary += `• ${title}: ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}\n`;
        });
        break;
      
      case 'detailed':
        summary = "Here's a detailed summary of your selected notes:\n\n";
        notes.forEach(note => {
          const title = note.title || `Note from ${new Date(note.timestamp).toLocaleDateString()}`;
          summary += `${title}:\n${note.content}\n\n`;
        });
        break;
      
      case 'study_notes':
        summary = "📚 STUDY NOTES 📚\n\n";
        notes.forEach(note => {
          const title = note.title || `Session from ${new Date(note.timestamp).toLocaleDateString()}`;
          summary += `Topic: ${title}\n`;
          summary += `Key points: ${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}\n\n`;
        });
        break;
      
      default: // concise
        summary = `I've reviewed ${notes.length} note${notes.length > 1 ? 's' : ''} (${notes.reduce((acc, note) => acc + note.content.length, 0)} characters total).\n\n`;
        summary += "Main topics include: ";
        summary += notes.map(note => note.title || `Note from ${new Date(note.timestamp).toLocaleDateString()}`).join(", ");
        summary += "\n\nWould you like me to create a more detailed summary or convert this to another format?";
    }
    
    return summary;
  };

  const initiateNoteSave = (message: ChatMessage) => {
    setMessageToSave(message);
    setFolderName(message.contentType || 'general');
    setContentType(message.contentType || 'general');
    setShowSaveDialog(true);
  };

  const closeDialog = () => {
    setShowSaveDialog(false);
    setMessageToSave(null);
    setFolderName('');
  };

  const saveSummary = async (message: ChatMessage) => {
    if (!auth.currentUser?.email || !message) return;
    
    try {
      const summary = {
        userEmail: auth.currentUser.email,
        summary: message.text,
        timestamp: serverTimestamp(),
        title: `Summary ${new Date().toLocaleString()}`,
        sourceNoteIds: message.relatedNotes || [],
        contentType: message.contentType || 'general',
        format: message.requestType === 'summarize' ? 'concise' : 'detailed',
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'note_summaries'), summary);
      
      // Refresh summaries
      const summariesRef = collection(db, 'note_summaries');
      const q = query(summariesRef, where('userEmail', '==', auth.currentUser.email), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const loadedSummaries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        timestamp: doc.data().timestamp,
        summary: doc.data().content || doc.data().summary,
        title: doc.data().title,
        sourceNoteIds: doc.data().sourceNoteIds || [],
        contentType: doc.data().category || doc.data().contentType || 'general',
        format: doc.data().format || 'concise',
        createdAt: doc.data().timestamp || new Date(),
        userEmail: doc.data().userEmail
      }));
      
      setSummaries(loadedSummaries);
      
      // Close save dialog
      setShowSaveDialog(false);
      setMessageToSave(null);
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const deleteMessage = (id: string) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAllMessages = () => {
    setChatMessages([]);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (!selectionMode) {
      setSelectedNotes(new Set());
    }
  };

  // Function to toggle chat size
  const toggleChatSize = () => {
    setChatSize(prev => prev === 'normal' ? 'maximized' : 'normal');
  };

  // Handle start of dragging
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.target === dragHandleRef.current || dragHandleRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      setStartDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse movement during drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startDragPos.x;
      const deltaY = e.clientY - startDragPos.y;
      
      setChatPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setStartDragPos({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startDragPos]);

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`}>
        <div className="container max-w-4xl px-4 py-8 mx-auto">
          <div className="flex items-center">
            <BackButton />
            <h1 className="ml-2 text-2xl font-bold">Loading notes...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container px-4 py-8 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold">My Notes</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFolderType('notes')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeFolderType === 'notes' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <FileText size={18} />
              Notes
            </button>
            <button
              onClick={() => setActiveFolderType('summaries')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeFolderType === 'summaries' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <FolderIcon size={18} />
              Summaries
            </button>
            <button
              onClick={toggleChat}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                chatOpen
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {chatOpen ? (
                <>
                  <X size={18} />
                  Close Chat
                </>
              ) : (
                <>
                  <MessageSquare size={18} />
                  AI Assistant
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div>
            {activeFolderType === 'notes' ? (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={clearAllNotes}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Trash2 size={16} />
                    Clear All Notes
                  </button>
                </div>
                <NotesFolder 
                  sessions={sessions} 
                  darkMode={darkMode}
                  selectedFolder={selectedFolder}
                  onFolderSelect={setSelectedFolder}
                  selectedNotes={selectedNotes}
                  onNoteSelect={toggleNoteSelection}
                  selectionMode={selectionMode}
                />
              </>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={clearAllSummaries}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Trash2 size={16} />
                    Clear All Summaries
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {summaries.length > 0 ? (
                    summaries.map((summary) => (
                      <div 
                        key={summary.id}
                        className="p-4 transition-shadow bg-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg"
                      >
                        <h3 className="mb-2 text-lg font-bold line-clamp-1">{summary.title}</h3>
                        <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                          {summary.timestamp ? new Date(summary.timestamp.toDate()).toLocaleString() : 'Date unknown'}
                        </p>
                        <div className="mb-3 text-gray-700 line-clamp-3 dark:text-gray-300">
                          {summary.summary}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900/50 dark:text-blue-300">
                            {summary.contentType || 'General'}
                          </span>
                          <button 
                            onClick={() => {/* Implement view detail function */}}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 col-span-full dark:text-gray-400">
                      No summaries found. Create summaries by using the note chat assistant.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat Panel - centered, draggable and resizable */}
        {chatOpen && (
          <div 
            ref={chatRef}
            className={`fixed z-50 ${
              chatSize === 'maximized' 
                ? 'inset-4 max-w-none' 
                : 'w-[500px] max-w-[90vw] h-[600px] max-h-[80vh]'
            } overflow-hidden transition-all duration-200 ease-in-out`}
            style={{
              transform: chatSize === 'normal' ? `translate(${chatPosition.x}px, ${chatPosition.y}px)` : 'none',
              top: chatSize === 'normal' ? '50%' : undefined,
              left: chatSize === 'normal' ? '50%' : undefined,
              marginTop: chatSize === 'normal' ? '-300px' : undefined,
              marginLeft: chatSize === 'normal' ? '-250px' : undefined,
            }}
          >
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl h-full flex flex-col overflow-hidden relative`}>
              {/* Drag handle */}
              <div 
                ref={dragHandleRef}
                className={`cursor-move flex items-center justify-between p-3 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                onMouseDown={handleDragStart}
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-gray-500" />
                  <h3 className="text-lg font-bold">AI Notes Assistant</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={toggleChatSize} 
                    className="p-1 transition-colors rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                    title={chatSize === 'maximized' ? 'Minimize' : 'Maximize'}
                    aria-label={chatSize === 'maximized' ? 'Minimize' : 'Maximize'}
                  >
                    {chatSize === 'maximized' ? 
                      <Minimize2 size={16} /> : 
                      <Maximize2 size={16} />
                      // <MinusIcon size={16} /> : 
                      // <Maximize2 size={16} />
                    }
                  </button>
                  <button 
                    onClick={toggleChat}
                    className="p-1 transition-colors rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Close"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Note import section */}
              <div className={`p-3 border-b ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Selected Notes: {selectedNotes.size}</h4>
                  <button 
                    onClick={toggleSelectionMode}
                    className={`px-2 py-1 rounded text-xs ${
                      selectionMode 
                        ? 'bg-blue-600 text-white' 
                        : darkMode 
                          ? 'bg-gray-600 text-gray-200' 
                          : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {selectionMode ? 'Done Selecting' : 'Select Notes'}
                  </button>
                </div>
                {selectedNotes.size > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Array.from(selectedNotes).map(noteId => {
                      const note = sessions.find(s => s.id === noteId);
                      return note ? (
                        <div 
                          key={noteId}
                          className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="truncate max-w-[100px]">{note.title}</span>
                          <button 
                            onClick={() => toggleNoteSelection(noteId)}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            aria-label={`Remove ${note.title} from selection`}
                            title={`Remove ${note.title} from selection`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Chat content */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedNotes.size === 0 
                        ? "Select notes first, then ask me questions about them." 
                        : "What would you like to know about your selected notes?"}
                    </p>
                    
                    {selectedNotes.size > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        <button
                          onClick={() => setChatInput("Summarize these notes")}
                          className={`px-3 py-1.5 rounded-md flex items-center space-x-1 ${
                            darkMode 
                              ? 'bg-blue-800 hover:bg-blue-700 text-white' 
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                          }`}
                        >
                          <FileText size={16} />
                          <span>Summarize</span>
                        </button>
                        
                        <button
                          onClick={() => setChatInput("Extract vocabulary from these notes")}
                          className={`px-3 py-1.5 rounded-md flex items-center space-x-1 ${
                            darkMode 
                              ? 'bg-green-800 hover:bg-green-700 text-white' 
                              : 'bg-green-100 hover:bg-green-200 text-green-800'
                          }`}
                        >
                          <FileText size={16} />
                          <span>Extract Vocabulary</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`relative ${msg.sender === 'user' 
                        ? darkMode ? 'bg-blue-900' : 'bg-blue-100 text-gray-800' 
                        : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                      } p-3 rounded-lg max-w-[85%] ${
                        msg.sender === 'user' ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      {/* Delete message button */}
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className={`absolute -top-2 -right-2 p-1 rounded-full ${
                          darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        title="Delete message"
                      >
                        <X size={12} />
                      </button>
                      
                      {msg.html ? (
                        <div 
                          className="whitespace-pre-line" 
                          dangerouslySetInnerHTML={{ __html: msg.html }} 
                        />
                      ) : (
                        <p className="whitespace-pre-line">{msg.text}</p>
                      )}
                      
                      {msg.sender === 'bot' && (msg.requestType === 'summarize' || msg.requestType === 'extract') && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button 
                            onClick={() => initiateNoteSave(msg)}
                            className={`text-xs px-2 py-1 rounded-md flex items-center space-x-1 ${
                              darkMode ? 'bg-blue-800 hover:bg-blue-700' : 'bg-blue-200 hover:bg-blue-300'
                            }`}
                          >
                            <span>Save Summary</span>
                          </button>
                          
                          {!msg.html && msg.requestType === 'summarize' && (
                            <button 
                              onClick={() => setChatInput(`Extract vocabulary from these notes`)}
                              className={`text-xs px-2 py-1 rounded-md flex items-center space-x-1 ${
                                darkMode ? 'bg-green-800 hover:bg-green-700' : 'bg-green-200 hover:bg-green-300'
                              }`}
                            >
                              <span>Extract Content</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {processingRequest && (
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} p-3 rounded-lg max-w-[85%] mr-auto`}>
                    <p>Thinking...</p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-600">
                <div className="flex">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your notes..."
                    className={`flex-1 p-2 rounded-l-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-800'
                    } border`}
                    disabled={processingRequest}
                  />
                  <button
                    type="submit"
                    disabled={processingRequest || selectedNotes.size === 0}
                    className={`px-4 py-2 rounded-r-md ${
                      darkMode 
                        ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } ${(processingRequest || selectedNotes.size === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-96 max-w-full`}>
              <h3 className="mb-4 text-lg font-bold">Save to Notes</h3>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">
                  Folder Name
                </label>
                <input 
                  type="text" 
                  value={folderName} 
                  onChange={e => setFolderName(e.target.value)}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g., Vocabulary, Grammar, etc."
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={e => setContentType(e.target.value as NoteContentType)}
                  className={`w-full p-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                  aria-label="Content Type"
                >
                  <option value="vocabulary">Vocabulary</option>
                  <option value="grammar">Grammar</option>
                  <option value="slang">Slang</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeDialog}
                  className={`px-4 py-2 border rounded-md ${
                    darkMode 
                      ? 'border-gray-600 hover:bg-gray-700' 
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveSummary(messageToSave!)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 