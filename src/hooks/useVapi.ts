import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

interface UseVapiOptions {
  publicKey: string;
  assistantId: string;
  assistantOverrides?: any;
  onCallStart?: (callId: string) => void;
  onCallEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: any) => void;
  onMessage?: (message: any) => void;
}

export const useVapi = (options: UseVapiOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const vapiRef = useRef<Vapi | null>(null);
  const callIdRef = useRef<string | null>(null);

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
      
      // Try multiple ways to get the call ID
      setTimeout(() => {
        const currentCallId = callIdRef.current || (vapi as any).call?.id || (vapi as any).callId;
        console.log('[VAPI] Call ID from call-start:', currentCallId);
        if (currentCallId) {
          setCallId(currentCallId);
          options.onCallStart?.(currentCallId);
        } else {
          console.warn('[VAPI] No call ID available yet');
          options.onCallStart?.('');
        }
      }, 100);
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

    vapi.on('message', (message: any) => {
      console.log('[VAPI] Message received:', message.type, message);
      options.onMessage?.(message);
      
      // Capture final transcripts for both user and assistant
      if (message.type === 'transcript' && message.transcriptType === 'final' && message.transcript) {
        const role = message.role === 'assistant' ? 'Interviewer' : 'Candidate';
        setTranscript(prev => [...prev, `${role}: ${message.transcript}`]);
        console.log('[VAPI] Final transcript captured:', `${role}: ${message.transcript}`);
      }
      
      // Also capture conversation-update messages which contain full conversation
      if (message.type === 'conversation-update' && message.conversation) {
        console.log('[VAPI] Conversation update received with', message.conversation.length, 'messages');
      }
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
      return null;
    }

    setIsLoading(true);
    setError(null);
    setTranscript([]);
    callIdRef.current = null;

    try {
      console.log('[VAPI] Starting call with assistantId:', options.assistantId);
      const call = await vapiRef.current.start(options.assistantId, options.assistantOverrides);
      console.log('[VAPI] Call started, response:', call);
      
      // Capture call ID from the response
      if (call && typeof call === 'object') {
        const id = (call as any).id || (call as any).callId;
        if (id) {
          console.log('[VAPI] Call ID captured from start response:', id);
          callIdRef.current = id;
          setCallId(id);
          return id;
        }
      }
      
      return null;
    } catch (e: any) {
      console.error('[VAPI] Start error:', e);
      setError(e.message || 'Failed to start VAPI call');
      setIsLoading(false);
      return null;
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

  const getTranscript = useCallback(() => {
    const fullTranscript = transcript.join('\n');
    console.log('[VAPI] getTranscript called, lines:', transcript.length);
    return fullTranscript;
  }, [transcript]);

  return { isConnected, isLoading, isSpeaking, error, callId, transcript, start, stop, toggleMute, getTranscript };
};
