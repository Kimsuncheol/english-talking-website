"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Search, Volume2, Book } from "lucide-react";
import { motion } from "framer-motion";
import BackButton from "@/components/BackButton";

interface DictionaryResult {
  word: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
}

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { language } = useSettings();

  const searchWord = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/${language || 'en'}/${encodeURIComponent(searchTerm.trim())}`
      );

      if (!response.ok) {
        throw new Error("Word not found");
      }

      const data = await response.json();
      setResult(data[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch definition");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className="min-h-screen">
      <div className="absolute top-4 left-4 z-50">
        <BackButton />
      </div>
      
      {/* Hero Section */}
      <div className="relative py-20 mb-12 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="absolute inset-0 bg-grid-white/[0.2] bg-grid-8" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Explore Words
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Discover definitions, examples, and pronunciations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchWord()}
                placeholder="Search for any word..."
                className="w-full px-6 py-4 pr-12 text-lg rounded-full border-2 border-white/20 bg-white/10 text-white placeholder-blue-200 focus:outline-none focus:border-white/40 transition-all"
              />
              <button
                onClick={searchWord}
                disabled={loading}
                className="absolute right-2 p-2 text-white hover:text-blue-200 transition-colors disabled:opacity-50"
                title="Search word"
                aria-label="Search word"
              >
                <Search size={24} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-red-50 rounded-xl mb-8 flex items-center gap-4 dark:bg-red-900/50"
          >
            <div className="p-3 bg-red-100 rounded-lg dark:bg-red-800">
              <Book className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-400">Word Not Found</h3>
              <p className="text-red-600 dark:text-red-300">{error}</p>
            </div>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden dark:bg-gray-800/50 backdrop-blur-xl"
          >
            <div className="p-8 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  {result.word}
                </h2>
                <div className="flex items-center gap-4">
                  {result.phonetics.map((phonetic, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {phonetic.text && (
                        <span className="text-lg text-gray-600 dark:text-gray-300 font-mono">
                          {phonetic.text}
                        </span>
                      )}
                      {phonetic.audio && (
                        <button
                          onClick={() => playAudio(phonetic.audio!)}
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          title="Play pronunciation"
                          aria-label="Play pronunciation"
                        >
                          <Volume2 className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8">
              {result.meanings.map((meaning, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mb-8 last:mb-0"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-4 py-1 rounded-full bg-blue-100 text-blue-600 font-medium dark:bg-blue-900/50 dark:text-blue-400">
                      {meaning.partOfSpeech}
                    </span>
                  </div>
                  <ul className="space-y-6">
                    {meaning.definitions.map((def, defIndex) => (
                      <li key={defIndex} className="pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                        <p className="text-lg text-gray-800 dark:text-gray-200 mb-2">
                          {def.definition}
                        </p>
                        {def.example && (
                          <p className="text-gray-600 dark:text-gray-400 italic mb-2">
                            &ldquo;{def.example}&rdquo;
                          </p>
                        )}
                        {def.synonyms && def.synonyms.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {def.synonyms.map((synonym, synIndex) => (
                              <span
                                key={synIndex}
                                className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              >
                                {synonym}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
} 