import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const textQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  const initialize = useCallback(async () => {
    if (isLoading || isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create stream via HTTP API (faster than WebSocket handshake)
      const { data, error: fnError } = await supabase.functions.invoke("did-stream", {
        body: {
          action: "create",
          avatarUrl: options.avatarUrl,
        },
      });

      if (fnError || !data?.streamId) {
        throw new Error(fnError?.message || "Failed to create D-ID stream");
      }

      const { streamId, sdpOffer, iceServers, sessionId } = data;
      streamIdRef.current = streamId;
      sessionIdRef.current = sessionId;

      console.log("[D-ID] Stream created:", streamId);

      // Set up WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: iceServers?.length ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (event.streams?.[0] && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          console.log("[D-ID] Video track received");
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && sessionIdRef.current && streamIdRef.current) {
          await supabase.functions.invoke("did-stream", {
            body: {
              action: "ice",
              streamId: streamIdRef.current,
              sessionId: sessionIdRef.current,
              iceCandidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              },
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[D-ID] Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setIsConnected(true);
          setIsLoading(false);
          options.onConnected?.();
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setIsConnected(false);
          setError("Connection lost");
        }
      };

      // Set remote offer and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send SDP answer
      await supabase.functions.invoke("did-stream", {
        body: {
          action: "sdp",
          streamId,
          sessionId,
          sdpAnswer: answer,
        },
      });

      console.log("[D-ID] SDP answer sent");
    } catch (e: any) {
      console.error("[D-ID] Init error:", e);
      setError(e?.message || "Failed to initialize D-ID stream");
      setIsConnected(false);
      setIsLoading(false);
      options.onError?.(e?.message || "Failed to initialize");
    }
  }, [isLoading, isConnected, options]);

  // Process text queue for D-ID TTS lip-sync
  const processTextQueue = useCallback(async () => {
    if (isProcessingRef.current || textQueueRef.current.length === 0) return;
    if (!streamIdRef.current || !sessionIdRef.current) return;

    isProcessingRef.current = true;
    const text = textQueueRef.current.shift()!;

    try {
      setIsSpeaking(true);
      options.onSpeaking?.(true);

      await supabase.functions.invoke("did-stream", {
        body: {
          action: "talk",
          streamId: streamIdRef.current,
          sessionId: sessionIdRef.current,
          text,
        },
      });

      // Estimate speech duration (~150ms per word)
      const wordCount = text.split(/\s+/).length;
      const duration = Math.max(1500, wordCount * 150);
      
      await new Promise((resolve) => setTimeout(resolve, duration));
    } catch (e) {
      console.error("[D-ID] Talk error:", e);
    } finally {
      setIsSpeaking(false);
      options.onSpeaking?.(false);
      isProcessingRef.current = false;
      
      // Process next in queue
      if (textQueueRef.current.length > 0) {
        processTextQueue();
      }
    }
  }, [options]);

  // Queue text for lip-synced speech
  const streamText = useCallback((text: string) => {
    if (!text.trim()) return;
    textQueueRef.current.push(text);
    processTextQueue();
  }, [processTextQueue]);

  // PCM chunk methods (kept for compatibility but use streamText instead)
  const sendPcmChunk = useCallback((_pcmBytes: Uint8Array) => {
    // D-ID doesn't support raw PCM via HTTP API, use streamText instead
    console.warn("[D-ID] sendPcmChunk not supported, use streamText");
  }, []);

  const endPcmStream = useCallback(() => {
    setIsSpeaking(false);
    options.onSpeaking?.(false);
  }, [options]);

  const destroy = useCallback(async () => {
    try {
      if (streamIdRef.current && sessionIdRef.current) {
        await supabase.functions.invoke("did-stream", {
          body: {
            action: "destroy",
            streamId: streamIdRef.current,
            sessionId: sessionIdRef.current,
          },
        });
      }

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;

      if (videoRef.current) videoRef.current.srcObject = null;

      streamIdRef.current = null;
      sessionIdRef.current = null;
      textQueueRef.current = [];
      isProcessingRef.current = false;

      setIsConnected(false);
      setIsLoading(false);
      setIsSpeaking(false);
      setError(null);
    } catch {
      // ignore cleanup errors
    }
  }, []);

  return {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    destroy,
    setVideoElement,
    streamText,
    sendPcmChunk,
    endPcmStream,
  };
};
