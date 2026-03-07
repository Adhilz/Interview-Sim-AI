import { useCallback, useRef, useState, useEffect } from "react";
import {
  SimliClient,
  generateSimliSessionToken,
  generateIceServers,
  LogLevel,
} from "simli-client";

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
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const optionsRef = useRef(options);
  const isConnectedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
  }, []);

  const setAudioElement = useCallback((el: HTMLAudioElement | null) => {
    audioElRef.current = el;
  }, []);

  const initialize = useCallback(async () => {
    if (
      isInitializingRef.current ||
      isLoadingRef.current ||
      isConnectedRef.current ||
      simliClientRef.current
    ) {
      return;
    }

    if (!options.apiKey || !options.faceId) {
      const msg = "Simli API key or Face ID not configured";
      setError(msg);
      optionsRef.current.onError?.(msg);
      return;
    }

    const videoEl = videoElRef.current;
    const audioEl = audioElRef.current;
    if (!videoEl || !audioEl) {
      console.warn("[Simli] Video/audio elements not ready");
      return;
    }

    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log("[Simli] Generating session token...");
      const { session_token } = await generateSimliSessionToken({
        config: {
          faceId: options.faceId,
          handleSilence: true,
          maxSessionLength: 600,
          maxIdleTime: 300,
          model: "fasttalk",
        },
        apiKey: options.apiKey,
      });
      console.log("[Simli] Session token obtained");

      console.log("[Simli] Fetching ICE servers...");
      let iceServers: RTCIceServer[] | null = null;
      try {
        iceServers = await generateIceServers(options.apiKey);
        console.log("[Simli] ICE servers obtained:", iceServers?.length || 0);
      } catch (iceErr) {
        console.warn("[Simli] ICE server fetch failed, using defaults:", iceErr);
      }

      // Keep Simli audio muted: Vapi remains the only audible output.
      audioEl.muted = true;
      audioEl.volume = 0;

      // Use P2P-first mode (previous stable architecture).
      // Simli SDK will auto-fallback to livekit on retries when needed.
      const client = new SimliClient(
        session_token,
        videoEl,
        audioEl,
        iceServers,
        LogLevel.ERROR,
        "p2p",
        "websockets",
        undefined,
        2048,
      );
      simliClientRef.current = client;

      client.on("start", () => {
        console.log("[Simli] Connected — stream started");
        setIsConnected(true);
        setIsLoading(false);
        optionsRef.current.onConnected?.();

        const checkVideoPlaying = () => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && !videoEl.paused) {
            console.log("[Simli] Avatar ready — video rendering");
            setIsReady(true);
            optionsRef.current.onReady?.();
          } else {
            setTimeout(checkVideoPlaying, 150);
          }
        };
        checkVideoPlaying();
      });

      client.on("speaking", () => {
        setIsSpeaking(true);
        optionsRef.current.onSpeaking?.(true);
      });

      client.on("silent", () => {
        setIsSpeaking(false);
        optionsRef.current.onSpeaking?.(false);
      });

      client.on("stop", () => {
        console.log("[Simli] Disconnected");
        setIsConnected(false);
        setIsReady(false);
        setIsLoading(false);
      });

      client.on("error", (detail) => {
        console.error("[Simli] Error:", detail);
        setError(detail || "Simli connection error");
        setIsLoading(false);
        optionsRef.current.onError?.(detail || "Simli connection error");
      });

      client.on("startup_error", (detail) => {
        console.error("[Simli] Startup error:", detail);
        setError(detail || "Simli startup failed");
        setIsConnected(false);
        setIsReady(false);
        setIsLoading(false);
        optionsRef.current.onError?.(detail || "Simli startup failed");
      });

      console.log("[Simli] Starting WebRTC connection...");
      await client.start();
      console.log("[Simli] start() completed, waiting for 'start' event...");
    } catch (e: any) {
      console.error("[Simli] Init error:", e);
      const msg = e?.message || "Failed to initialize Simli";
      setError(msg);
      setIsConnected(false);
      setIsReady(false);
      setIsLoading(false);
      simliClientRef.current = null;
      optionsRef.current.onError?.(msg);
    } finally {
      isInitializingRef.current = false;
    }
  }, [options.apiKey, options.faceId]);

  const sendAudioData = useCallback((audioData: Uint8Array) => {
    if (!simliClientRef.current || !isConnected) return;
    try {
      // Use sendAudioDataImmediate for lowest latency — bypasses internal buffering
      simliClientRef.current.sendAudioDataImmediate(audioData);
    } catch (e) {
      console.error("[Simli] sendAudioDataImmediate error:", e);
    }
  }, [isConnected]);

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
      simliClientRef.current?.stop();
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
