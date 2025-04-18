import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define an interface for error types
interface ApiError extends Error {
  status?: number;
}

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
});

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!openai.apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Call Whisper API with the file directly
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    console.error('Error in Whisper API route:', error);
    
    const apiError = error as ApiError;
    return NextResponse.json(
      { 
        error: 'Failed to process audio',
        details: apiError.message || 'Unknown error occurred'
      },
      { status: apiError.status || 500 }
    );
  }
} 