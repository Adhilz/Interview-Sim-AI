import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDidStreamOptions {
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeaking?: (speaking: boolean) => void;
  avatarUrl?: string;
}

export const useDidStream = (options: UseDidStreamOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  const initialize = useCallback(async () => {
    if (isLoading || isConnected) return;
    
    setIsLoading(true);
    setError(null);
    console.log('[D-ID] Initializing stream...');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('did-stream', {
        body: { action: 'create' },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.streamId || !data?.sessionId) throw new Error('No stream ID or session ID received');

      console.log('[D-ID] Stream created:', data.streamId, 'Session:', data.sessionId);
      streamIdRef.current = data.streamId;
      sessionIdRef.current = data.sessionId;

      const pc = new RTCPeerConnection({
        iceServers: data.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        console.log('[D-ID] Received remote track:', event.track.kind);
        if (event.streams && event.streams[0] && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          console.log('[D-ID] Video stream attached');
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && streamIdRef.current && sessionIdRef.current) {
          console.log('[D-ID] Sending ICE candidate');
          await supabase.functions.invoke('did-stream', {
            body: {
              action: 'ice',
              streamId: streamIdRef.current,
              sessionId: sessionIdRef.current,
              iceCandidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              }
            }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[D-ID] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsLoading(false);
          options.onConnected?.();
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setIsConnected(false);
          setError('Connection lost');
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdpOffer.sdp
      }));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const { error: sdpError } = await supabase.functions.invoke('did-stream', {
        body: {
          action: 'sdp',
          streamId: data.streamId,
          sessionId: data.sessionId,
          sdpAnswer: {
            type: answer.type,
            sdp: answer.sdp
          }
        }
      });

      if (sdpError) throw new Error(sdpError.message);
      console.log('[D-ID] SDP handshake complete');

    } catch (err: any) {
      console.error('[D-ID] Initialization error:', err);
      setError(err.message || 'Failed to initialize D-ID stream');
      setIsLoading(false);
      options.onError?.(err.message);
    }
  }, [isLoading, isConnected, options]);

  // Process text queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || textQueueRef.current.length === 0) return;
    if (!streamIdRef.current || !sessionIdRef.current) return;

    isProcessingRef.current = true;
    setIsSpeaking(true);
    options.onSpeaking?.(true);

    while (textQueueRef.current.length > 0) {
      const text = textQueueRef.current.shift();
      if (!text) continue;

      try {
        console.log('[D-ID] Sending text to avatar:', text.substring(0, 50) + '...');
        
        await supabase.functions.invoke('did-stream', {
          body: {
            action: 'talk',
            streamId: streamIdRef.current,
            sessionId: sessionIdRef.current,
            text
          }
        });

        // Wait for speech to complete (estimate ~100ms per word)
        const wordCount = text.split(' ').length;
        const estimatedDuration = Math.max(2000, wordCount * 150);
        await new Promise(resolve => setTimeout(resolve, estimatedDuration));

      } catch (err) {
        console.error('[D-ID] Error sending text:', err);
      }
    }

    isProcessingRef.current = false;
    setIsSpeaking(false);
    options.onSpeaking?.(false);
  }, [options]);

  // Stream text for lip-sync (for external use)
  const streamText = useCallback((text: string) => {
    if (!streamIdRef.current || !sessionIdRef.current) {
      console.warn('[D-ID] Cannot stream text: no active stream');
      return;
    }

    textQueueRef.current.push(text);
    processQueue();
  }, [processQueue]);

  // Legacy audio streaming (kept for compatibility)
  const streamAudio = useCallback((audioBase64: string) => {
    if (!streamIdRef.current || !sessionIdRef.current) {
      console.warn('[D-ID] Cannot stream audio: no active stream');
      return;
    }

    // For audio, send directly without queuing
    supabase.functions.invoke('did-stream', {
      body: {
        action: 'talk',
        streamId: streamIdRef.current,
        sessionId: sessionIdRef.current,
        audio: audioBase64
      }
    }).catch(err => {
      console.error('[D-ID] Error sending audio:', err);
    });
  }, []);

  const destroy = useCallback(async () => {
    console.log('[D-ID] Destroying stream...');

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (streamIdRef.current) {
      try {
        await supabase.functions.invoke('did-stream', {
          body: {
            action: 'destroy',
            streamId: streamIdRef.current,
            sessionId: sessionIdRef.current,
          }
        });
      } catch (err) {
        console.error('[D-ID] Error destroying stream:', err);
      }
      streamIdRef.current = null;
      sessionIdRef.current = null;
    }

    textQueueRef.current = [];
    isProcessingRef.current = false;
    setIsConnected(false);
    setIsLoading(false);
    setIsSpeaking(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      destroy();
    };
  }, []);

  return {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    streamText,
    streamAudio,
    destroy,
    setVideoElement,
  };
};
