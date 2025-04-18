"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { Trash2, Copy, Download } from 'lucide-react';
import { auth, db } from '@/firebase/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { NoteSession } from '@/types/notes';

export default function NoteDetailPage() {
  // Extract the ID from the pathname only
  const pathname = usePathname();
  const noteId = pathname.split('/').pop() || '';
  
  const router = useRouter();
  const [note, setNote] = useState<NoteSession | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    if (!noteId) {
      router.push('/notes');
      return;
    }

    const loadNote = async (userEmail: string) => {
      try {
        const noteRef = doc(db, 'notes', noteId);
        const noteDoc = await getDoc(noteRef);

        if (noteDoc.exists() && noteDoc.data().userEmail === userEmail) {
          const noteData = noteDoc.data();
          setNote({
            id: noteDoc.id,
            timestamp: noteData.timestamp,
            content: noteData.content,
            folder: noteData.folder,
            title: noteData.title
          });
        } else {
          router.push('/notes');
        }
      } catch (error) {
        console.error('Error loading note:', error);
        router.push('/notes');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        loadNote(user.email);
      } else {
        router.push('/notes');
      }
    });

    return () => unsubscribe();
  }, [noteId, router]);

  const deleteNote = async () => {
    if (!note || !auth.currentUser?.email) return;

    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'notes', note.id));
        router.push('/notes');
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const copyToClipboard = () => {
    if (!note) return;
    
    navigator.clipboard.writeText(note.content)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy note: ', err);
      });
  };

  const downloadNote = () => {
    if (!note) return;
    
    const element = document.createElement('a');
    const file = new Blob([note.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `english_note_${note.timestamp.replace(/[^0-9]/g, '')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`}>
        <div className="container px-4 py-8 mx-auto">
          <BackButton destination="/notes" />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`}>
        <div className="container px-4 py-8 mx-auto">
          <BackButton destination="/notes" />
          <p className="mt-4">Note not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`}>
      <div className="container max-w-4xl px-4 py-8 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BackButton destination="/notes" />
            <div className="ml-2">
              <h1 className="text-2xl font-bold">{note.title}</h1>
              <div className="flex items-center space-x-2">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {note.timestamp}
                </p>
                {note.folder && (
                  <>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                    <p className={`text-sm ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {note.folder}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={copyToClipboard}
              className={`p-2 rounded-md flex items-center space-x-1 ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Copy to clipboard"
            >
              <Copy size={16} />
              <span className="text-sm">Copy</span>
            </button>
            
            <button
              onClick={downloadNote}
              className={`p-2 rounded-md flex items-center space-x-1 ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Download as text file"
            >
              <Download size={16} />
              <span className="text-sm">Download</span>
            </button>
            
            <button
              onClick={deleteNote}
              className={`p-2 rounded-md flex items-center space-x-1 ${
                darkMode 
                  ? 'bg-red-900 hover:bg-red-800' 
                  : 'bg-red-100 hover:bg-red-200 text-red-800'
              }`}
              title="Delete note"
            >
              <Trash2 size={16} />
              <span className="text-sm">Delete</span>
            </button>
          </div>
        </div>
        
        {copySuccess && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded-md z-50 flex items-center space-x-2 ${
            darkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 border border-green-200'
          }`}>
            <span className="text-sm font-medium">Copied to clipboard!</span>
          </div>
        )}
        
        <div className={`border rounded-lg overflow-hidden ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <pre className={`p-6 whitespace-pre-wrap font-sans text-sm leading-relaxed ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            {note.content}
          </pre>
        </div>
      </div>
    </div>
  );
}