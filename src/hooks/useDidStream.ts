import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDidStreamOptions {
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeaking?: (speaking: boolean) => void;
}

export const useDidStream = (options: UseDidStreamOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamIdRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingAudioRef = useRef(false);

  // Set the video element reference
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  // Initialize D-ID stream
  const initialize = useCallback(async () => {
    if (isLoading || isConnected) return;
    
    setIsLoading(true);
    setError(null);
    console.log('[D-ID] Initializing stream...');

    try {
      // Create D-ID stream session
      const { data, error: fnError } = await supabase.functions.invoke('did-stream', {
        body: { action: 'create' }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.streamId) throw new Error('No stream ID received');

      console.log('[D-ID] Stream created:', data.streamId);
      streamIdRef.current = data.streamId;

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: data.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      // Handle incoming video stream
      pc.ontrack = (event) => {
        console.log('[D-ID] Received remote track:', event.track.kind);
        if (event.streams && event.streams[0] && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          console.log('[D-ID] Video stream attached');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('[D-ID] Sending ICE candidate');
          await supabase.functions.invoke('did-stream', {
            body: {
              action: 'ice',
              streamId: streamIdRef.current,
              iceCandidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              }
            }
          });
        }
      };

      // Handle connection state changes
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

      // Set remote description (SDP offer from D-ID)
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdpOffer.sdp
      }));

      // Create and set local description (SDP answer)
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send SDP answer to D-ID
      const { error: sdpError } = await supabase.functions.invoke('did-stream', {
        body: {
          action: 'sdp',
          streamId: data.streamId,
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

  // Process audio queue sequentially
  const processAudioQueue = useCallback(async () => {
    if (isProcessingAudioRef.current || audioQueueRef.current.length === 0) return;
    if (!streamIdRef.current) return;

    isProcessingAudioRef.current = true;
    setIsSpeaking(true);
    options.onSpeaking?.(true);

    while (audioQueueRef.current.length > 0) {
      const audio = audioQueueRef.current.shift();
      if (!audio) continue;

      try {
        await supabase.functions.invoke('did-stream', {
          body: {
            action: 'talk',
            streamId: streamIdRef.current,
            audio
          }
        });

        // Add small delay between audio chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error('[D-ID] Error sending audio:', err);
      }
    }

    isProcessingAudioRef.current = false;
    setIsSpeaking(false);
    options.onSpeaking?.(false);
  }, [options]);

  // Queue audio for streaming
  const streamAudio = useCallback((audioBase64: string) => {
    if (!streamIdRef.current) {
      console.warn('[D-ID] Cannot stream audio: no active stream');
      return;
    }

    audioQueueRef.current.push(audioBase64);
    processAudioQueue();
  }, [processAudioQueue]);

  // Cleanup stream
  const destroy = useCallback(async () => {
    console.log('[D-ID] Destroying stream...');

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Destroy D-ID stream
    if (streamIdRef.current) {
      try {
        await supabase.functions.invoke('did-stream', {
          body: {
            action: 'destroy',
            streamId: streamIdRef.current
          }
        });
      } catch (err) {
        console.error('[D-ID] Error destroying stream:', err);
      }
      streamIdRef.current = null;
    }

    // Reset state
    audioQueueRef.current = [];
    isProcessingAudioRef.current = false;
    setIsConnected(false);
    setIsLoading(false);
    setIsSpeaking(false);
    setError(null);
  }, []);

  // Cleanup on unmount
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
    streamAudio,
    destroy,
    setVideoElement,
  };
};
