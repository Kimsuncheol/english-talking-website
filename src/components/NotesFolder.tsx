import React from 'react';
import { Folder, ChevronRight, FolderOpen, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NoteSession, NotesFolderProps } from '@/types/notes';

export default function NotesFolder({
  sessions,
  darkMode,
  onFolderSelect,
  selectedFolder,
  selectedNotes,
  onNoteSelect,
  selectionMode
}: NotesFolderProps) {
  const router = useRouter();

  // Get unique folders from sessions
  const folders = Array.from(
    new Set(sessions.map(session => session.folder || 'Unfiled'))
  ).sort();

  // Group sessions by folder
  const sessionsByFolder = sessions.reduce((acc, session) => {
    const folderName = session.folder || 'Unfiled';
    if (!acc[folderName]) {
      acc[folderName] = [];
    }
    acc[folderName].push(session);
    return acc;
  }, {} as Record<string, NoteSession[]>);

  const getPreviewText = (content: string, maxLength: number = 150) => {
    const cleanText = content.replace(/👤 Question: |🤖 Answer: /g, '');
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  const handleNoteClick = (session: NoteSession, e: React.MouseEvent) => {
    e.stopPropagation();

    if (selectionMode) {
      // In selection mode, toggle note selection
      onNoteSelect(session.id);
    } else {
      // In navigation mode, go to note detail
      router.push(`/notes/${session.id}`);
    }
  };

  return (
    <div className="space-y-4">
      {selectionMode && (
        <div className={`mb-4 p-3 rounded-md ${
          darkMode ? 'bg-blue-900/30 text-blue-100' : 'bg-blue-50 text-blue-800'
        }`}>
          <p className="text-sm">
            {selectedNotes.size === 0 
              ? "Tap notes to select them for the AI assistant" 
              : `${selectedNotes.size} note${selectedNotes.size > 1 ? 's' : ''} selected`}
          </p>
        </div>
      )}
      
      {/* Folder List */}
      <div className={`rounded-lg overflow-hidden ${
        darkMode ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {folders.map((folder) => (
            <div key={folder}>
              <button
                onClick={() => onFolderSelect(folder === selectedFolder ? null : folder)}
                className={`w-full p-4 flex items-center justify-between ${
                  darkMode
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-100'
                } ${
                  folder === selectedFolder
                    ? darkMode
                      ? 'bg-gray-700'
                      : 'bg-gray-100'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  {folder === selectedFolder ? (
                    <FolderOpen size={20} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                  ) : (
                    <Folder size={20} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                  <span className={`font-medium ${
                    darkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {folder}
                  </span>
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    ({sessionsByFolder[folder]?.length || 0})
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className={`transform transition-transform ${
                    folder === selectedFolder ? 'rotate-90' : ''
                  } ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                />
              </button>

              {/* Notes in selected folder */}
              {folder === selectedFolder && sessionsByFolder[folder]?.map((session) => (
                <div
                  key={session.id}
                  onClick={(e) => handleNoteClick(session, e)}
                  className={`p-4 pl-12 flex items-center justify-between cursor-pointer ${
                    darkMode
                      ? `hover:bg-gray-700 ${selectedNotes.has(session.id) ? 'bg-blue-900/30' : 'bg-gray-750'}`
                      : `hover:bg-gray-100 ${selectedNotes.has(session.id) ? 'bg-blue-50' : 'bg-gray-50'}`
                  } transition-colors duration-150`}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center mb-1">
                      {selectedNotes.has(session.id) && (
                        <CheckCircle size={16} className={`mr-2 ${
                          darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                      )}
                      <p className={`text-sm font-medium ${
                        darkMode ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {session.title}
                      </p>
                    </div>
                    <div className="flex items-center text-sm space-x-2">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {session.timestamp}
                      </span>
                      <span className={`truncate ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {getPreviewText(session.content)}
                      </span>
                    </div>
                  </div>
                  {selectionMode ? (
                    selectedNotes.has(session.id) ? (
                      <div className={`h-5 w-5 flex items-center justify-center rounded-full ${
                        darkMode ? 'bg-blue-500' : 'bg-blue-500'
                      }`}>
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    ) : (
                      <div className={`h-5 w-5 rounded-full border ${
                        darkMode ? 'border-gray-500' : 'border-gray-400'
                      }`} />
                    )
                  ) : (
                    <ChevronRight size={16} className={
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    } />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 