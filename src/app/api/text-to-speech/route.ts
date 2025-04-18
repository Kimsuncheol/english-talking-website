import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Voice selection based on language
const getVoiceForLanguage = (language: string, defaultVoice: string): string => {
  // OpenAI TTS doesn't have language-specific voices yet, but this function
  // allows us to select different voices for different languages in the future
  // For now, we just return the provided default voice
  return defaultVoice;
};

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy', language = 'en' } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Select voice based on language
    const selectedVoice = getVoiceForLanguage(language, voice);

    // Call OpenAI's TTS API
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: text,
    });

    // Get audio as arrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    // Return the audio as a stream
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 