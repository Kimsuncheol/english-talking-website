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
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Parse the request body
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Validate voice option
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return NextResponse.json(
        { error: 'Invalid voice option' },
        { status: 400 }
      );
    }

    // Validate speed (must be between 0.25 and 4.0)
    const parsedSpeed = Number(speed);
    if (isNaN(parsedSpeed) || parsedSpeed < 0.25 || parsedSpeed > 4.0) {
      return NextResponse.json(
        { error: 'Speed must be between 0.25 and 4.0' },
        { status: 400 }
      );
    }

    // Generate speech using OpenAI's TTS API
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed: parsedSpeed,
    });

    // Get audio data as arrayBuffer
    const audioData = await response.arrayBuffer();

    // Return the audio data with appropriate headers
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error in TTS API route:', error);
    
    const apiError = error as ApiError;
    return NextResponse.json(
      { 
        error: 'Failed to generate speech',
        details: apiError.message || 'Unknown error occurred'
      },
      { status: apiError.status || 500 }
    );
  }
} 