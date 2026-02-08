import { useCallback, useRef, useState, useEffect } from "react";
import { SimliClient } from "simli-client";

interface UseSimliStreamOptions {
  apiKey: string;
  faceId: string;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeaking?: (speaking: boolean) => void;
}

export const useSimliStream = (options: UseSimliStreamOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simliClientRef = useRef<SimliClient | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
  }, []);

  const setAudioElement = useCallback((el: HTMLAudioElement | null) => {
    audioElRef.current = el;
  }, []);

  const initialize = useCallback(async () => {
    if (isLoading || isConnected) return;
    if (!options.apiKey || !options.faceId) {
      setError("Simli API key or Face ID not configured");
      options.onError?.("Simli API key or Face ID not configured");
      return;
    }

    const videoEl = videoElRef.current;
    const audioEl = audioElRef.current;
    if (!videoEl || !audioEl) {
      console.warn("[Simli] Video/audio elements not ready, retrying in 500ms...");
      setTimeout(() => initialize(), 500);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = new SimliClient();
      simliClientRef.current = client;

      client.Initialize({
        apiKey: options.apiKey,
        faceID: options.faceId,
        handleSilence: true,
        maxSessionLength: 600,
        maxIdleTime: 300,
        videoRef: videoEl as any,
        audioRef: audioEl as any,
        session_token: "",
        SimliURL: "",
        maxRetryAttempts: 3,
        retryDelay_ms: 2000,
        videoReceivedTimeout: 15000,
        enableSFU: true,
        model: "fasttalk",
      } as any);

      console.log("[Simli] Client initialized, starting WebRTC...");

      client.on("connected", () => {
        console.log("[Simli] Connected successfully");
        setIsConnected(true);
        setIsLoading(false);
        options.onConnected?.();
      });

      client.on("disconnected", () => {
        console.log("[Simli] Disconnected");
        setIsConnected(false);
      });

      client.on("failed", () => {
        console.error("[Simli] Connection failed");
        setError("Simli connection failed");
        setIsConnected(false);
        setIsLoading(false);
        options.onError?.("Simli connection failed");
      });

      await client.start();
      console.log("[Simli] Start called, waiting for connection...");
    } catch (e: any) {
      console.error("[Simli] Init error:", e);
      const msg = e?.message || "Failed to initialize Simli";
      setError(msg);
      setIsConnected(false);
      setIsLoading(false);
      options.onError?.(msg);
    }
  }, [isLoading, isConnected, options]);

  const sendAudioData = useCallback((audioData: Uint8Array) => {
    if (!simliClientRef.current || !isConnected) return;

    try {
      simliClientRef.current.sendAudioData(audioData);

      setIsSpeaking(true);
      options.onSpeaking?.(true);

      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      speakingTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
        options.onSpeaking?.(false);
      }, 500);
    } catch (e) {
      console.error("[Simli] sendAudioData error:", e);
    }
  }, [isConnected, options]);

  // Listen to an audio MediaStreamTrack (e.g. from VAPI) and pipe to Simli
  const listenToMediaStreamTrack = useCallback((track: MediaStreamTrack) => {
    if (!simliClientRef.current || !isConnected) {
      console.warn("[Simli] Cannot listen to track - not connected");
      return;
    }
    try {
      console.log("[Simli] Listening to MediaStreamTrack for lip-sync");
      simliClientRef.current.listenToMediastreamTrack(track);
    } catch (e) {
      console.error("[Simli] listenToMediastreamTrack error:", e);
    }
  }, [isConnected]);

  const clearBuffer = useCallback(() => {
    try {
      simliClientRef.current?.ClearBuffer();
    } catch (e) {
      console.error("[Simli] ClearBuffer error:", e);
    }
  }, []);

  const destroy = useCallback(() => {
    try {
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      simliClientRef.current?.close();
      simliClientRef.current = null;
      setIsConnected(false);
      setIsLoading(false);
      setIsSpeaking(false);
      setError(null);
      console.log("[Simli] Destroyed");
    } catch {
      // ignore cleanup errors
    }
  }, []);

  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    destroy,
    sendAudioData,
    listenToMediaStreamTrack,
    clearBuffer,
    setVideoElement,
    setAudioElement,
  };
};
