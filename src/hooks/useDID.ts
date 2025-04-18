import { useState, useCallback, useEffect, useRef } from 'react';

interface Avatar {
  id: string;
  url: string;
  talkingUrl?: string;
  previewUrl?: string;
  metaData?: {
    name?: string;
    gender?: string;
    age?: number;
    description?: string;
    [key: string]: any;
  };
}

interface DIDOptions {
  apiKey?: string;
  apiEndpoint?: string;
  defaultAvatar?: Avatar;
  autoConnect?: boolean;
  onError?: (error: string) => void;
  onGenerated?: (avatar: Avatar) => void;
  onTalkGenerated?: (videoUrl: string) => void;
}

interface UseDIDReturn {
  avatar: Avatar | null;
  isLoading: boolean;
  error: string | null;
  generateAvatar: (options: GenerateAvatarOptions) => Promise<Avatar | null>;
  generateTalkingVideo: (text: string, options?: TalkingVideoOptions) => Promise<string | null>;
  resetAvatar: () => void;
  setAvatar: (avatar: Avatar) => void;
  availableVoices: Voice[];
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

interface GenerateAvatarOptions {
  gender?: 'male' | 'female' | 'neutral';
  age?: 'young' | 'middle' | 'old';
  style?: 'realistic' | 'cartoon' | 'anime';
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';
  hair?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  name?: string;
  description?: string;
}

interface TalkingVideoOptions {
  voice?: Voice;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';
  driver?: 'audio' | 'text';
  background?: string;
  maxDuration?: number;
}

interface Voice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  language?: string;
  preview?: string;
}

export function useDID({
  apiKey,
  apiEndpoint = 'https://api.d-id.com',
  defaultAvatar,
  autoConnect = false,
  onError,
  onGenerated,
  onTalkGenerated,
}: DIDOptions = {}): UseDIDReturn {
  const [avatar, setAvatarState] = useState<Avatar | null>(defaultAvatar || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const authTokenRef = useRef<string | null>(null);
  
  // Attempt to connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      // Cleanup any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoConnect]);
  
  // Connect to the DID API
  const connect = useCallback(async (): Promise<boolean> => {
    if (!apiKey) {
      const errorMessage = 'API key is required to connect to DID';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // This is a placeholder for actual API connection logic
      // In a real implementation, you would authenticate with the DID API here
      const response = await fetch(`${apiEndpoint}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${apiKey}:`)}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`);
      }
      
      const data = await response.json();
      authTokenRef.current = data.token || data.access_token;
      
      // Fetch available voices
      await fetchVoices();
      
      setIsConnected(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to DID';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [apiKey, apiEndpoint, onError]);
  
  // Disconnect from the DID API
  const disconnect = useCallback(() => {
    authTokenRef.current = null;
    setIsConnected(false);
  }, []);
  
  // Fetch available voices
  const fetchVoices = useCallback(async () => {
    if (!authTokenRef.current) return;
    
    try {
      const response = await fetch(`${apiEndpoint}/voices`, {
        headers: {
          'Authorization': `Bearer ${authTokenRef.current}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }
      
      const data = await response.json();
      setAvailableVoices(data.voices || []);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  }, [apiEndpoint]);
  
  // Generate a new avatar
  const generateAvatar = useCallback(async (options: GenerateAvatarOptions): Promise<Avatar | null> => {
    if (!isConnected || !authTokenRef.current) {
      const errorMessage = 'Not connected to DID API';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      // This is a placeholder for actual avatar generation API call
      const response = await fetch(`${apiEndpoint}/avatars/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokenRef.current}`
        },
        body: JSON.stringify({
          source_url: options.style === 'realistic' ? 'https://create.d-id.com/realistic-avatar' : 'https://create.d-id.com/stylized-avatar',
          gender: options.gender,
          age: options.age,
          hair: options.hair,
          hair_color: options.hairColor,
          eye_color: options.eyeColor,
          skin_tone: options.skinTone,
          emotion: options.emotion,
          name: options.name,
          description: options.description,
        }),
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate avatar: ${response.status}`);
      }
      
      const data = await response.json();
      
      const newAvatar: Avatar = {
        id: data.id || `avatar-${Date.now()}`,
        url: data.avatar_url || data.url,
        previewUrl: data.preview_url,
        metaData: {
          name: options.name,
          gender: options.gender,
          description: options.description,
          ...data.meta_data
        }
      };
      
      setAvatarState(newAvatar);
      if (onGenerated) onGenerated(newAvatar);
      
      setIsLoading(false);
      return newAvatar;
    } catch (error) {
      let errorMessage = 'Failed to generate avatar';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Avatar generation was cancelled';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, [isConnected, apiEndpoint, onError, onGenerated]);
  
  // Generate a talking video from text
  const generateTalkingVideo = useCallback(async (
    text: string,
    options: TalkingVideoOptions = {}
  ): Promise<string | null> => {
    if (!isConnected || !authTokenRef.current) {
      const errorMessage = 'Not connected to DID API';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return null;
    }
    
    if (!avatar) {
      const errorMessage = 'No avatar selected';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      // This is a placeholder for actual talking video generation API call
      const response = await fetch(`${apiEndpoint}/talks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokenRef.current}`
        },
        body: JSON.stringify({
          source_url: avatar.url,
          script: {
            type: 'text',
            provider: options.voice ? { type: 'microsoft', voice_id: options.voice.id } : undefined,
            ssml: false,
            input: text
          },
          driver: options.driver || 'text',
          config: {
            fluent: true,
            pad_audio: 0.1,
            stitch: true,
            expression: options.emotion || 'neutral',
            ...(options.background ? { background: { source_url: options.background } } : {})
          },
          ...(options.maxDuration ? { max_duration: options.maxDuration } : {})
        }),
        signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate talking video: ${response.status}`);
      }
      
      const data = await response.json();
      const talkId = data.id;
      
      // Poll for the status of the talk generation
      const videoUrl = await pollTalkStatus(talkId);
      
      if (videoUrl) {
        // Update the avatar with the talking URL
        setAvatarState(prev => {
          if (!prev) return avatar;
          return { ...prev, talkingUrl: videoUrl };
        });
        
        if (onTalkGenerated) onTalkGenerated(videoUrl);
      }
      
      setIsLoading(false);
      return videoUrl;
    } catch (error) {
      let errorMessage = 'Failed to generate talking video';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Video generation was cancelled';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, [isConnected, avatar, apiEndpoint, onError, onTalkGenerated]);
  
  // Poll for the status of a talk generation job
  const pollTalkStatus = useCallback(async (talkId: string): Promise<string | null> => {
    if (!authTokenRef.current) return null;
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max with 5-second intervals
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${apiEndpoint}/talks/${talkId}`, {
          headers: {
            'Authorization': `Bearer ${authTokenRef.current}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to check talk status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'done') {
          return data.result_url;
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Error generating talking video');
        }
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error('Error polling talk status:', error);
        return null;
      }
    }
    
    throw new Error('Timeout waiting for talking video');
  }, [apiEndpoint]);
  
  // Set a specific avatar
  const setAvatar = useCallback((newAvatar: Avatar) => {
    setAvatarState(newAvatar);
  }, []);
  
  // Reset the current avatar
  const resetAvatar = useCallback(() => {
    setAvatarState(null);
  }, []);
  
  return {
    avatar,
    isLoading,
    error,
    generateAvatar,
    generateTalkingVideo,
    resetAvatar,
    setAvatar,
    availableVoices,
    isConnected,
    connect,
    disconnect,
  };
}

export default useDID;
