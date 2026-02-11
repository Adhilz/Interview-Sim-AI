import { useCallback, useRef, useState, useEffect } from "react";
import { SimliClient } from "simli-client";

interface UseSimliStreamOptions {
  apiKey: string;
  faceId: string;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeaking?: (speaking: boolean) => void;
  onReady?: () => void;
}

export const useSimliStream = (options: UseSimliStreamOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
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
      const msg = "Simli API key or Face ID not configured";
      setError(msg);
      options.onError?.(msg);
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
        // Simli is lip-sync only — no TTS, no audio playback
        // Audio comes exclusively from Vapi
      } as any);

      // Mute the Simli audio element — Vapi is the sole audio source
      audioEl.muted = true;
      audioEl.volume = 0;

      console.log("[Simli] Client initialized, starting WebRTC...");

      client.on("connected", () => {
        console.log("[Simli] Connected successfully");
        setIsConnected(true);
        setIsLoading(false);
        options.onConnected?.();

        // Monitor the video element for actual playback to determine true readiness
        const checkVideoPlaying = () => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && !videoEl.paused) {
            console.log("[Simli] Stream active — video is rendering");
            console.log("[Simli] Avatar ready");
            setIsReady(true);
            options.onReady?.();
          } else {
            // Retry until video is actually playing
            setTimeout(checkVideoPlaying, 200);
          }
        };
        checkVideoPlaying();
      });

      client.on("disconnected", () => {
        console.log("[Simli] Disconnected");
        setIsConnected(false);
        setIsReady(false);
      });

      client.on("failed", () => {
        console.error("[Simli] Connection failed");
        setError("Simli connection failed");
        setIsConnected(false);
        setIsReady(false);
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
      setIsReady(false);
      setIsLoading(false);
      options.onError?.(msg);
    }
  }, [isLoading, isConnected, options]);

  const sendAudioData = useCallback((audioData: Uint8Array) => {
    if (!simliClientRef.current || !isConnected) return;

    try {
      simliClientRef.current.sendAudioData(audioData);

      if (!isSpeaking) {
        console.log("[Simli] Speaking started");
      }
      setIsSpeaking(true);
      options.onSpeaking?.(true);

      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      speakingTimeoutRef.current = setTimeout(() => {
        console.log("[Simli] Speaking ended");
        setIsSpeaking(false);
        options.onSpeaking?.(false);
      }, 200);
    } catch (e) {
      console.error("[Simli] sendAudioData error:", e);
    }
  }, [isConnected, isSpeaking, options]);

  const listenToMediaStreamTrack = useCallback((track: MediaStreamTrack) => {
    if (!simliClientRef.current || !isConnected) {
      console.warn("[Simli] Cannot listen to track — not connected");
      return;
    }
    try {
      console.log("[Simli] Listening to MediaStreamTrack for real-time lip-sync");
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
      setIsReady(false);
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
    isReady,
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
