"use client";

import { useState } from 'react';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, serverTimestamp, Timestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import OpenAI from 'openai';

// Define message interface
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Timestamp | null;
}

// Initialize Firestore
const db = getFirestore();

// Custom hook for chat functionality
export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  // Load chat messages for a specific user
  const loadMessages = (userEmail: string) => {
    try {
      const userDocRef = doc(db, 'questions', userEmail);
      const messagesQuery = query(
        collection(userDocRef, 'messages'),
        orderBy('timestamp', 'asc')
      );

      return onSnapshot(messagesQuery, (snapshot) => {
        const loadedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text || '',
          sender: doc.data().sender || 'user',
          timestamp: doc.data().timestamp,
        }));
        setMessages(loadedMessages);
      });
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
      return () => {};
    }
  };

  // Send a message and get AI response
  const sendMessage = async (user: User | null, message: string, language: string = 'english'): Promise<void> => {
    if (!message.trim() || !user?.email) {
      setError('You must be logged in to send messages');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Add user message to Firebase
      const userEmail = user.email || 'anonymous';
      const userDocRef = doc(db, 'questions', userEmail);
      const messagesCollectionRef = collection(userDocRef, 'messages');
      
      await addDoc(messagesCollectionRef, {
        text: message,
        sender: 'user',
        timestamp: serverTimestamp()
      });

      // Get AI response
      const response = await getAIResponse(message, language);
      
      // Add AI response to Firebase
      await addDoc(messagesCollectionRef, {
        text: response,
        sender: 'ai',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      setError('Failed to send message');
      console.error("Error sending message: ", err);
    } finally {
      setLoading(false);
    }
  };

  // Get AI response with language-specific handling
  const getAIResponse = async (userMessage: string, language: string = 'english'): Promise<string> => {
    try {
      const systemPrompt = `You are a helpful English language assistant that specializes in grammar, vocabulary, idioms, and slang. 
      Only answer questions related to these topics. If the user asks about anything else, politely explain that you can only 
      help with English language learning topics.
      
      When explaining grammar concepts, vocabulary, idioms, or slang:
      1. Format your response with clear structure using headings and paragraphs
      2. Use bullet points (•) for listing examples or related items
      3. Put important terms in **bold** (using markdown asterisks)
      4. For definitions, clearly separate the term from its explanation
      5. Always use headings like "Grammar:", "Vocabulary:", "Usage:", etc. to organize your response
      6. Break down complex explanations into simple parts
      7. For vocabulary, include at least one example sentence after each explanation
      8. Use spacing between sections for improved readability
      9. Start with a brief overview before going into details
      10. For grammar rules, clearly show correct and incorrect examples
      11. When providing examples, highlight key parts in **bold**
      
      Adapt your language complexity based on the apparent level of the user:
      - For beginners: Use simple vocabulary, short sentences, and basic grammar explanations
      - For intermediate learners: Provide more nuanced explanations with some technical terms
      - For advanced learners: Include detailed linguistic explanations and more complex examples
      
      ${language !== 'english' ? `Please provide answers in ${language} when possible. Keep explanations simple and direct in the target language.` : ''}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 800, // Increased token limit for better formatting
        temperature: 0.7,
      });

      return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
    } catch (err) {
      console.error("OpenAI API error:", err);
      return "Sorry, I encountered an error. Please try again later.";
    }
  };

  // Delete all messages for a user
  const deleteAllMessages = async (user: User | null): Promise<void> => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const userDocRef = doc(db, 'questions', user.email);
      const messagesCollectionRef = collection(userDocRef, 'messages');
      
      // Get all messages
      const messagesQuery = query(messagesCollectionRef);
      const snapshot = await getDocs(messagesQuery);
      
      // Delete each message
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to delete messages');
      console.error('Error deleting messages:', err);
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    error,
    loadMessages,
    sendMessage,
    deleteAllMessages
  };
} 