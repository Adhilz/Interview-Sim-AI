import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

interface UseVapiOptions {
  publicKey: string;
  assistantId: string;
  assistantOverrides?: {
    firstMessage?: string;
    variableValues?: Record<string, string>;
  };
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: any) => void;
}

export const useVapi = (options: UseVapiOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!options.publicKey) {
      setError('VAPI public key not provided');
      return;
    }

    const vapi = new Vapi(options.publicKey);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      console.log('[VAPI] Call started');
      setIsConnected(true);
      setIsLoading(false);
      options.onCallStart?.();
    });

    vapi.on('call-end', () => {
      console.log('[VAPI] Call ended');
      setIsConnected(false);
      setIsSpeaking(false);
      options.onCallEnd?.();
    });

    vapi.on('speech-start', () => {
      setIsSpeaking(true);
      options.onSpeechStart?.();
    });

    vapi.on('speech-end', () => {
      setIsSpeaking(false);
      options.onSpeechEnd?.();
    });

    vapi.on('error', (e) => {
      console.error('[VAPI] Error:', e);
      setError(e.message || 'VAPI error occurred');
      setIsLoading(false);
      options.onError?.(e);
    });

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [options.publicKey]);

  const start = useCallback(async () => {
    if (!vapiRef.current) {
      setError('VAPI not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await vapiRef.current.start(options.assistantId, options.assistantOverrides);
    } catch (e: any) {
      console.error('[VAPI] Start error:', e);
      setError(e.message || 'Failed to start VAPI call');
      setIsLoading(false);
    }
  }, [options.assistantId, options.assistantOverrides]);

  const stop = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const currentMuted = vapiRef.current.isMuted();
      vapiRef.current.setMuted(!currentMuted);
      return !currentMuted;
    }
    return false;
  }, []);

  return { isConnected, isLoading, isSpeaking, error, start, stop, toggleMute };
};
