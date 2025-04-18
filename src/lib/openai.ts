import OpenAI from 'openai';

// Initialize OpenAI client - this should only be used server-side
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Allow browser usage for client-side code
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Client-side function to send chat messages to our API endpoint
 */
export async function sendChatMessage(options: ChatCompletionOptions) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send chat message');
  }

  return response.json();
}

/**
 * Generates a system prompt for an English tutor with specific personality
 */
export function generateTutorSystemPrompt(tutorName: string, tutorRole: string): string {
  const basePrompt = `You are ${tutorName}, a friendly and helpful ${tutorRole}. 
Your goal is to help the user improve their English conversation skills through natural dialogue.
  
Guidelines:
- Be encouraging, patient, and supportive
- If the user makes grammar or vocabulary mistakes, gently correct them
- Keep your responses concise (1-3 sentences) and conversational
- Ask follow-up questions to keep the conversation flowing
- Provide helpful vocabulary when appropriate
- Match the user's language level - don't use overly complex words if they seem to be a beginner
- If appropriate, suggest alternative phrasings for what the user has said`;

  // Add role-specific instructions
  const roleSpecificInstructions = {
    "Conversation Teacher": "Focus on maintaining a natural conversation flow. Point out good language usage.",
    "Grammar Expert": "Pay special attention to grammar errors and provide helpful corrections.",
    "Vocabulary Specialist": "Highlight opportunities to use more varied or precise vocabulary.",
    "Pronunciation Coach": "Suggest words that might be challenging to pronounce and provide simple phonetic guidance.",
    "Business English Tutor": "Focus on professional vocabulary and formal language appropriate for workplace settings.",
    "Travel English Guide": "Incorporate travel-related scenarios and useful phrases for travelers."
  };

  // Add role-specific instructions if available
  const roleInstructions = roleSpecificInstructions[tutorRole as keyof typeof roleSpecificInstructions] || "";
  
  return `${basePrompt}\n\n${roleInstructions}`;
}

export default openai;
