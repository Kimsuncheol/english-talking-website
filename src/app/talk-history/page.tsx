"use client";

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, MessageSquare, Timer, Star } from 'lucide-react';
import Link from 'next/link';
import BackButton from "@/components/BackButton";
import { auth } from '@/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserTalkHistory, TalkHistoryItem } from '@/firebase/firestore';
import { useRouter } from 'next/navigation';

// Define types for our topic counts
interface TopicCount {
  [key: string]: number;
}

interface TopicItem {
  topic: string;
  count: number;
}

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

function TalkHistoryPage() {
  const router = useRouter();
  const [talkHistory, setTalkHistory] = useState<TalkHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostTalkedTopics, setMostTalkedTopics] = useState<TopicItem[]>([]);
  
  // Check authentication and load talk history
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(false);
        try {
          // Load talk history from Firebase
          const history = await getUserTalkHistory(user.uid);
          setTalkHistory(history);
          
          // Calculate most talked topics
          calculateMostTalkedTopics(history);
        } catch (err) {
          console.error('Error loading talk history:', err);
        }
      } else {
        // Redirect to login page if not authenticated
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  // Calculate most talked topics from history
  const calculateMostTalkedTopics = (history: TalkHistoryItem[]) => {
    const topicCount: TopicCount = history.reduce((acc: TopicCount, talk) => {
      talk.topics.forEach((topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
      });
      return acc;
    }, {});
    
    const topics: TopicItem[] = Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
    
    setMostTalkedTopics(topics);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-2xl font-bold ml-4">Talk History</h1>
      </div>

      {talkHistory.length > 0 ? (
        <>
          <div className="bg-card rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Most Talked Topics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {mostTalkedTopics.map((item) => (
                <div key={item.topic} className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="font-medium">{item.topic}</p>
                  <p className="text-sm text-muted-foreground">{item.count} times</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Conversations</h2>
            {talkHistory.map((talk) => (
              <div key={talk.id} className="bg-card rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mr-3">{formatDate(talk.date)}</span>
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{formatTime(talk.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Timer className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mr-3">{formatDuration(talk.duration)}</span>
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    <span className="text-sm font-medium">{talk.score}/100</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {talk.topics.map((topic) => (
                    <span
                      key={topic}
                      className="bg-primary/10 text-xs px-2 py-1 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-muted-foreground">Language: {talk.language}</span>
                  </div>
                  <Link
                    href={`/talk-detail/${talk.id}`}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No conversations yet</h2>
          <p className="text-muted-foreground mb-4">
            You haven&apos;t had any conversations. Start talking to see your history.
          </p>
          <Link
            href="/voice-conversation"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
          >
            Start a Conversation
          </Link>
        </div>
      )}
    </div>
  );
}

export default TalkHistoryPage;