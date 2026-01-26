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

interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isFinal: boolean;
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
  
  // Enhanced transcript accumulation with deduplication
  const transcriptEntriesRef = useRef<TranscriptEntry[]>([]);
  const lastUserTranscriptRef = useRef<string>('');
  const lastAssistantTranscriptRef = useRef<string>('');
  const pendingUserTranscriptRef = useRef<string>('');

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
      
      // Reset transcript tracking on new call
      transcriptEntriesRef.current = [];
      lastUserTranscriptRef.current = '';
      lastAssistantTranscriptRef.current = '';
      pendingUserTranscriptRef.current = '';
      
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
      console.log('[VAPI] Final transcript entries:', transcriptEntriesRef.current.length);
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
      
      // Handle transcript messages with improved logic
      if (message.type === 'transcript' && message.transcript) {
        const transcriptText = message.transcript.trim();
        const isFinal = message.transcriptType === 'final';
        const isUser = message.role === 'user';
        const isAssistant = message.role === 'assistant';
        
        if (isFinal && transcriptText.length > 0) {
          // Check for duplicates - avoid adding same content twice
          if (isUser && transcriptText !== lastUserTranscriptRef.current) {
            lastUserTranscriptRef.current = transcriptText;
            
            const entry: TranscriptEntry = {
              role: 'user',
              content: transcriptText,
              timestamp: Date.now(),
              isFinal: true
            };
            transcriptEntriesRef.current.push(entry);
            
            const line = `Candidate: ${transcriptText}`;
            setTranscript(prev => [...prev, line]);
            console.log('[VAPI] User transcript captured:', line);
          } else if (isAssistant && transcriptText !== lastAssistantTranscriptRef.current) {
            lastAssistantTranscriptRef.current = transcriptText;
            
            const entry: TranscriptEntry = {
              role: 'assistant',
              content: transcriptText,
              timestamp: Date.now(),
              isFinal: true
            };
            transcriptEntriesRef.current.push(entry);
            
            const line = `Interviewer: ${transcriptText}`;
            setTranscript(prev => [...prev, line]);
            console.log('[VAPI] Assistant transcript captured:', line);
          }
        } else if (!isFinal && isUser) {
          // Track partial user transcript for debugging
          pendingUserTranscriptRef.current = transcriptText;
        }
      }
      
      // Also capture conversation-update messages which contain full conversation
      // This is the MOST RELIABLE source as it comes directly from VAPI's internal state
      if (message.type === 'conversation-update' && message.conversation) {
        console.log('[VAPI] Conversation update received with', message.conversation.length, 'messages');
        
        // Sync our transcript entries with the authoritative conversation state
        const newEntries: TranscriptEntry[] = [];
        message.conversation.forEach((msg: any) => {
          const content = msg.content || msg.text;
          if (content && typeof content === 'string' && content.trim().length > 0 && msg.role !== 'system') {
            const role = msg.role === 'assistant' ? 'assistant' : 'user';
            newEntries.push({
              role,
              content: content.trim(),
              timestamp: Date.now(),
              isFinal: true
            });
          }
        });
        
        // If conversation-update has more messages, use it as the source of truth
        if (newEntries.length > transcriptEntriesRef.current.length) {
          console.log('[VAPI] Syncing transcript from conversation-update:', newEntries.length, 'entries');
          transcriptEntriesRef.current = newEntries;
          
          // Also update the state transcript
          const lines = newEntries.map(entry => {
            const role = entry.role === 'assistant' ? 'Interviewer' : 'Candidate';
            return `${role}: ${entry.content}`;
          });
          setTranscript(lines);
        }
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
    // Build transcript from accumulated entries for better ordering
    const entriesTranscript = transcriptEntriesRef.current
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(entry => {
        const role = entry.role === 'assistant' ? 'Interviewer' : 'Candidate';
        return `${role}: ${entry.content}`;
      })
      .join('\n');
    
    // Fallback to state transcript if entries are empty
    const stateTranscript = transcript.join('\n');
    const finalTranscript = entriesTranscript || stateTranscript;
    
    console.log('[VAPI] getTranscript called, entries:', transcriptEntriesRef.current.length, 'state lines:', transcript.length);
    return finalTranscript;
  }, [transcript]);

  // Send a system message to inject into the conversation
  // This uses VAPI's say method to make the assistant speak
  const say = useCallback((message: string, endCallAfter: boolean = false) => {
    if (vapiRef.current && isConnected) {
      console.log('[VAPI] Sending say message:', message);
      vapiRef.current.say(message, endCallAfter);
    }
  }, [isConnected]);

  // Send a message/event to the assistant
  const send = useCallback((message: any) => {
    if (vapiRef.current && isConnected) {
      console.log('[VAPI] Sending message:', message);
      vapiRef.current.send(message);
    }
  }, [isConnected]);

  return { 
    isConnected, 
    isLoading, 
    isSpeaking, 
    error, 
    callId, 
    transcript, 
    start, 
    stop, 
    toggleMute, 
    getTranscript,
    say,
    send
  };
};
