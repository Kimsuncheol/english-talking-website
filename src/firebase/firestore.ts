import { firebaseApp } from './firebase';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, orderBy, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

// Initialize Firestore
const db = getFirestore(firebaseApp);

// User-related collections
const USERS_COLLECTION = 'users';
const TALK_HISTORY_COLLECTION = 'talk_history';

// User settings interface
export interface UserSettings {
  language?: string;
  languageLevel?: string;
  voice?: string;
  theme?: 'light' | 'dark' | 'system';
  createdAt?: Timestamp;
  updatedAt: Timestamp;
}

// Talk history interface
export interface TalkHistoryItem {
  id: string;
  userId: string;
  date: Timestamp;
  duration: number; // in seconds
  topics: string[];
  score: number;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
  }[];
  language: string;
  languageLevel: string;
}

// Save user settings to Firestore
export const saveUserSettings = async (user: User, settings: Partial<UserSettings>): Promise<void> => {
  if (!user) throw new Error('No user logged in');
  
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userDoc = await getDoc(userRef);
  
  const updatedSettings: UserSettings = {
    ...userDoc.exists() ? userDoc.data() as UserSettings : {},
    ...settings,
    updatedAt: Timestamp.now(),
  };
  
  // If this is a new document, add createdAt
  if (!userDoc.exists()) {
    updatedSettings.createdAt = Timestamp.now();
  }
  
  return setDoc(userRef, updatedSettings);
};

// Get user settings from Firestore
export const getUserSettings = async (user: User): Promise<UserSettings | null> => {
  if (!user) return null;
  
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return userDoc.data() as UserSettings;
  }
  
  return null;
};

// Delete user account and all associated data
export const deleteUserData = async (user: User): Promise<void> => {
  if (!user) throw new Error('No user logged in');
  
  // Delete user settings
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await deleteDoc(userRef);
  
  // Delete talk history
  const historyQuery = query(
    collection(db, TALK_HISTORY_COLLECTION),
    where('userId', '==', user.uid)
  );
  
  const historyDocs = await getDocs(historyQuery);
  const deletePromises = historyDocs.docs.map(doc => deleteDoc(doc.ref));
  
  await Promise.all(deletePromises);
};

// Save talk history to Firestore
export const saveTalkHistory = async (historyItem: Omit<TalkHistoryItem, 'id'>): Promise<string> => {
  const historyRef = doc(collection(db, TALK_HISTORY_COLLECTION));
  const id = historyRef.id;
  
  await setDoc(historyRef, {
    ...historyItem,
    id,
  });
  
  return id;
};

// Get user's talk history from Firestore
export const getUserTalkHistory = async (userId: string): Promise<TalkHistoryItem[]> => {
  const historyQuery = query(
    collection(db, TALK_HISTORY_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  
  const historyDocs = await getDocs(historyQuery);
  return historyDocs.docs.map(doc => doc.data() as TalkHistoryItem);
};

export default db; 