import OpenAI from 'openai';
import { ChatCompletionOptions } from './openai';

// Initialize OpenAI client - this should only be used server-side
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
});

/**
 * Send a chat completion request to OpenAI (server-side only)
 */
export async function sendChatCompletion({
  messages,
  model = 'gpt-3.5-turbo',
  temperature = 0.7,
  max_tokens = 1000,
  stream = false,
}: ChatCompletionOptions) {
  try {
    if (!openai.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    if (stream) {
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens,
        stream: true,
      });

      return response;
    } else {
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens,
      });

      return response.choices[0].message.content;
    }
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    throw error;
  }
}

export default openai; 