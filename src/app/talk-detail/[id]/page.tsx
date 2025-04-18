"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, Calendar, MessageSquare, Timer, Star, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { TalkHistoryItem } from '@/firebase/firestore';

function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(timestamp: any): string {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0 min';
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default function TalkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [conversation, setConversation] = useState<TalkHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get conversation ID from params
  const conversationId = params?.id as string;
  
  // Load conversation data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      setLoading(true);
      try {
        const docRef = doc(db, 'talk_history', conversationId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as TalkHistoryItem;
          
          // Check if this conversation belongs to the current user
          if (data.userId === user.uid) {
            setConversation(data);
          } else {
            setError("You don't have permission to view this conversation");
          }
        } else {
          setError("Conversation not found");
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
        setError("Failed to load conversation details");
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [conversationId, router]);
  
  // Download conversation as text file
  const downloadConversation = () => {
    if (!conversation) return;
    
    const date = formatDate(conversation.date);
    const content = conversation.messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const text = `Conversation from ${date}\n\n${content}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading conversation...</p>
      </div>
    );
  }
  
  if (error || !conversation) {
    return (
      <div className="min-h-screen p-4">
        <Link href="/talk-history" className="inline-flex items-center text-primary hover:underline mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Link>
        
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error || "Conversation not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      <Link href="/talk-history" className="inline-flex items-center text-primary hover:underline">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to History
      </Link>
      
      <div className="bg-card rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Conversation Details</h1>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="mr-3">{formatDate(conversation.date)}</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTime(conversation.date)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Timer className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{formatDuration(conversation.duration)}</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1 text-yellow-500" />
              <span className="text-sm font-medium">{conversation.score}/100</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {conversation.topics.map((topic) => (
            <span
              key={topic}
              className="bg-primary/10 text-xs px-2 py-1 rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
        
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            <span className="mr-4">Language: {conversation.language}</span>
            <span>Level: {conversation.languageLevel}</span>
          </div>
        </div>
        
        <button
          onClick={downloadConversation}
          className="flex items-center text-sm text-primary hover:underline mb-6"
        >
          <Download className="h-4 w-4 mr-1" />
          Download conversation
        </button>
        
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-semibold border-b pb-2">Conversation</h2>
          
          {conversation.messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-[80%] ${
                message.role === 'user'
                  ? 'ml-auto bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-white'
                  : 'mr-auto bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              }`}
              style={{
                borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
              }}
            >
              <p>{message.content}</p>
              <div className="text-xs mt-1 opacity-60">
                {message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 