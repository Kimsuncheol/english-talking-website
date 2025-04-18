export interface NoteSession {
  id: string;
  timestamp: string;
  content: string;
  folder?: string;
  title: string;
}

export interface FirebaseNote {
  id: string;
  timestamp: string;
  content: string;
  folder: string;
  title: string;
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotesFolderProps {
  sessions: NoteSession[];
  darkMode: boolean;
  selectedFolder: string | null;
  onFolderSelect: (folder: string | null) => void;
  selectedNotes: Set<string>;
  onNoteSelect: (noteId: string) => void;
  selectionMode: boolean;
}

export interface NoteSummary {
  id: string;
  title: string;
  summary: string;
  sourceNoteIds: string[];
  createdAt: Date;
  format: SummaryFormat;
  userEmail: string;
  folderPath?: string;
  contentType?: NoteContentType;
  extractedContent?: ExtractedContent;
}

export type NoteContentType = 'vocabulary' | 'grammar' | 'slang' | 'general';

export interface ExtractedContent {
  vocabularyItems?: VocabularyItem[];
  grammarRules?: GrammarRule[];
  slangTerms?: SlangTerm[];
  sentences?: string[];
}

export interface VocabularyItem {
  term: string;
  meaning: string;
  examples: string[];
}

export interface GrammarRule {
  rule: string;
  explanation: string;
  examples: string[];
}

export interface SlangTerm {
  term: string;
  meaning: string;
  examples: string[];
}

export type SummaryFormat = 'concise' | 'detailed' | 'bullets' | 'study_notes';

export interface ChatbotRequest {
  type: 'summarize' | 'analyze' | 'convert' | 'extract';
  format: SummaryFormat;
  noteIds: string[];
  extractType?: NoteContentType;
}

export interface NoteSelectionState {
  selectedFolder: string | null;
  selectedNoteIds: Set<string>;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  relatedNotes?: string[];
  requestType?: ChatbotRequest['type'];
  extractedContent?: ExtractedContent;
  contentType?: NoteContentType;
  html?: string;
} 