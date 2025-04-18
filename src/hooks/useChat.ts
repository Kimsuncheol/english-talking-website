import { useState, useCallback, useEffect, useRef } from 'react';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: number;
  isLoading?: boolean;
  error?: string;
}

interface ChatOptions {
  apiEndpoint?: string;
  apiKey?: string;
  initialMessages?: Message[];
  systemMessage?: string;
  maxMessagesToStore?: number;
  onError?: (error: string) => void;
  onMessageResponse?: (message: Message) => void;
  streamingEnabled?: boolean;
}

interface ChatResponse {
  messages: Message[];
  addMessage: (content: string, role?: MessageRole) => Promise<void>;
  updateMessage: (id: string, updates: Partial<Omit<Message, 'id'>>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
  abortRequest: () => void;
  setSystemMessage: (message: string) => void;
}

export function useChat({
  apiEndpoint = '/api/chat',
  apiKey,
  initialMessages = [],
  systemMessage = '',
  maxMessagesToStore = 100,
  onError,
  onMessageResponse,
  streamingEnabled = true,
}: ChatOptions = {}): ChatResponse {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSystemMessage, setCurrentSystemMessage] = useState<string>(systemMessage);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Generate a unique ID
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);
  
  // Create a new message
  const createMessage = useCallback((content: string, role: MessageRole): Message => {
    return {
      id: generateId(),
      content,
      role,
      timestamp: Date.now(),
    };
  }, [generateId]);
  
  // Add a message and optionally generate a response
  const addMessage = useCallback(async (content: string, role: MessageRole = 'user') => {
    if (!content.trim()) return;
    
    const newMessage = createMessage(content, role);
    
    setMessages((prevMessages) => {
      // Ensure we don't exceed max messages to store
      const truncatedMessages = [...prevMessages];
      if (truncatedMessages.length >= maxMessagesToStore) {
        // Keep system message if it exists
        const systemMessageIndex = truncatedMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex >= 0) {
          truncatedMessages.splice(1, 1); // Remove the oldest non-system message
        } else {
          truncatedMessages.shift(); // Remove the oldest message
        }
      }
      return [...truncatedMessages, newMessage];
    });
    
    // If it's a user message, automatically generate assistant response
    if (role === 'user') {
      // Create a placeholder for assistant response
      const assistantPlaceholder = createMessage('', 'assistant');
      assistantPlaceholder.isLoading = true;
      
      setMessages((prevMessages) => [...prevMessages, assistantPlaceholder]);
      setIsLoading(true);
      setError(null);
      
      // Prepare messages for API
      const messagesToSend = [...messages, newMessage]
        .filter(m => m.role !== 'assistant' || !m.isLoading); // Filter out loading assistant messages
      
      // Add system message if it exists
      if (currentSystemMessage) {
        messagesToSend.unshift(createMessage(currentSystemMessage, 'system'));
      }
      
      // Format for API
      const apiMessages = messagesToSend.map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      try {
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;
        
        if (streamingEnabled) {
          // Streaming approach
          await handleStreamingRequest(apiMessages, assistantPlaceholder.id, signal);
        } else {
          // Standard request approach
          await handleStandardRequest(apiMessages, assistantPlaceholder.id, signal);
        }
      } catch (error) {
        let errorMessage = 'Failed to communicate with the server';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          errorMessage = 'Request was cancelled';
        }
        
        setMessages((prevMessages) => 
          prevMessages.map(m => 
            m.id === assistantPlaceholder.id 
              ? { ...m, error: errorMessage, isLoading: false } 
              : m
          )
        );
        
        setError(errorMessage);
        if (onError) onError(errorMessage);
      }
      
      setIsLoading(false);
    }
  }, [messages, createMessage, maxMessagesToStore, currentSystemMessage, streamingEnabled, onError]);
  
  // Handle streaming request for chat completion
  const handleStreamingRequest = useCallback(async (
    apiMessages: { role: string; content: string }[],
    assistantId: string,
    signal: AbortSignal
  ) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages: apiMessages, stream: true }),
      signal,
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    // Set up streaming response handling
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedContent = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the received chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse and process the chunk
        try {
          // Content may come in as JSON or plaintext depending on the API
          let content = '';
          
          try {
            const parsed = JSON.parse(chunk);
            content = parsed.content || parsed.choices?.[0]?.delta?.content || '';
          } catch (e) {
            // If not valid JSON, try to extract content from text format
            // This handling depends on your specific API's streaming format
            content = chunk;
          }
          
          accumulatedContent += content;
          
          // Update the assistant message with the accumulated content
          setMessages((prevMessages) =>
            prevMessages.map(m =>
              m.id === assistantId
                ? { ...m, content: accumulatedContent, isLoading: false }
                : m
            )
          );
        } catch (e) {
          console.error('Error processing stream chunk:', e);
        }
      }
      
      // Final message is complete
      const finalMessage: Message = {
        id: assistantId,
        content: accumulatedContent,
        role: 'assistant',
        timestamp: Date.now(),
      };
      
      if (onMessageResponse) onMessageResponse(finalMessage);
      
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error;
      }
    }
  }, [apiEndpoint, apiKey, onMessageResponse]);
  
  // Handle standard (non-streaming) request for chat completion
  const handleStandardRequest = useCallback(async (
    apiMessages: { role: string; content: string }[],
    assistantId: string,
    signal: AbortSignal
  ) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages: apiMessages }),
      signal,
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract content based on API response structure
    const content = data.content || data.choices?.[0]?.message?.content || '';
    
    // Update the assistant message with the response
    setMessages((prevMessages) =>
      prevMessages.map(m =>
        m.id === assistantId
          ? { ...m, content, isLoading: false }
          : m
      )
    );
    
    // Notify about the new message
    const finalMessage: Message = {
      id: assistantId,
      content,
      role: 'assistant',
      timestamp: Date.now(),
    };
    
    if (onMessageResponse) onMessageResponse(finalMessage);
  }, [apiEndpoint, apiKey, onMessageResponse]);
  
  // Update an existing message
  const updateMessage = useCallback((id: string, updates: Partial<Omit<Message, 'id'>>) => {
    setMessages((prevMessages) =>
      prevMessages.map(m =>
        m.id === id
          ? { ...m, ...updates }
          : m
      )
    );
  }, []);
  
  // Delete a message
  const deleteMessage = useCallback((id: string) => {
    setMessages((prevMessages) => prevMessages.filter(m => m.id !== id));
  }, []);
  
  // Clear all messages (optionally keep system message)
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  // Abort the current request
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  // Set system message
  const setSystemMessage = useCallback((message: string) => {
    setCurrentSystemMessage(message);
  }, []);
  
  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    isLoading,
    error,
    resetError,
    abortRequest,
    setSystemMessage,
  };
}

export default useChat;
