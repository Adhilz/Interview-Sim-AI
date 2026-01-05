import { useCallback, useEffect, useRef, useState } from "react";

interface UseDidStreamOptions {
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeaking?: (speaking: boolean) => void;
  avatarUrl?: string;
}

type DidWsServerMessage = {
  messageType?: string;
  id?: string;
  offer?: RTCSessionDescriptionInit;
  ice_servers?: RTCIceServer[];
  session_id?: string;
  [key: string]: any;
};

const DID_WS_PROXY_URL =
  "wss://fjaneryjjgesujinlbix.functions.supabase.co/functions/v1/did-stream";

export const useDidStream = (options: UseDidStreamOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const streamReadyRef = useRef(false);
  const audioIndexRef = useRef(0);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  const send = useCallback((payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }, []);

  const initialize = useCallback(async () => {
    if (isLoading || isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const ws = new WebSocket(DID_WS_PROXY_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[D-ID] WS connected");

        const fallbackAvatar = new URL("/avatars/interviewer.png", window.location.origin).toString();
        send({
          type: "init-stream",
          payload: {
            presenter_type: "talk",
            source_url: options.avatarUrl || fallbackAvatar,
            stream_warmup: true,
          },
        });
      };

      ws.onmessage = async (event) => {
        let data: DidWsServerMessage;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.messageType === "init-stream") {
          const streamId = data.id;
          const sessionId = data.session_id;
          const offer = data.offer;
          const iceServers = data.ice_servers;

          if (!streamId || !sessionId || !offer) {
            throw new Error("Invalid init-stream payload");
          }

          streamIdRef.current = streamId;
          sessionIdRef.current = sessionId;

          const pc = new RTCPeerConnection({
            iceServers: iceServers?.length ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }],
          });
          peerConnectionRef.current = pc;

          // Data channel to receive stream/ready
          dataChannelRef.current = pc.createDataChannel("JanusDataChannel");
          dataChannelRef.current.onmessage = (e) => {
            const msg = String(e.data || "");
            const eventName = msg.split(":")[0];
            if (eventName === "stream/ready") {
              console.log("[D-ID] stream/ready");
              streamReadyRef.current = true;
            }
          };

          pc.ontrack = (trackEvent) => {
            if (trackEvent.streams?.[0] && videoRef.current) {
              videoRef.current.srcObject = trackEvent.streams[0];
            }
          };

          pc.onicecandidate = (iceEvent) => {
            if (!iceEvent.candidate || !sessionIdRef.current) return;
            send({
              type: "ice",
              payload: {
                session_id: sessionIdRef.current,
                presenter_type: "talk",
                candidate: iceEvent.candidate.candidate,
                sdpMid: iceEvent.candidate.sdpMid,
                sdpMLineIndex: iceEvent.candidate.sdpMLineIndex,
              },
            });
          };

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
              setIsConnected(true);
              setIsLoading(false);
              options.onConnected?.();

              // Fallback: consider stream ready after 5s if no event
              setTimeout(() => {
                if (!streamReadyRef.current) streamReadyRef.current = true;
              }, 5000);
            }

            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
              setIsConnected(false);
              setError("Connection lost");
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          send({
            type: "sdp",
            payload: {
              answer,
              session_id: sessionId,
              presenter_type: "talk",
            },
          });
        }
      };

      ws.onerror = () => {
        throw new Error("D-ID WS connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsLoading(false);
      };
    } catch (e: any) {
      console.error("[D-ID] init error", e);
      setError(e?.message || "Failed to initialize D-ID stream");
      setIsConnected(false);
      setIsLoading(false);
      options.onError?.(e?.message || "Failed to initialize D-ID stream");
    }
  }, [isLoading, isConnected, options.avatarUrl, options.onConnected, options.onError, send]);

  const sendPcmChunk = useCallback(
    (pcmBytes: Uint8Array) => {
      if (!streamIdRef.current || !sessionIdRef.current) return;
      if (!streamReadyRef.current) return;

      const bytes = Array.from(pcmBytes);
      if (bytes.length === 0) return;

      setIsSpeaking(true);
      options.onSpeaking?.(true);

      send({
        type: "stream-audio",
        payload: {
          script: {
            type: "audio",
            input: bytes,
          },
          config: { stitch: true },
          index: audioIndexRef.current++,
          session_id: sessionIdRef.current,
          stream_id: streamIdRef.current,
          presenter_type: "talk",
        },
      });
    },
    [options, send]
  );

  const endPcmStream = useCallback(() => {
    if (!streamIdRef.current || !sessionIdRef.current) return;
    if (!streamReadyRef.current) return;

    send({
      type: "stream-audio",
      payload: {
        script: {
          type: "audio",
          input: [],
        },
        config: { stitch: true },
        index: audioIndexRef.current++,
        session_id: sessionIdRef.current,
        stream_id: streamIdRef.current,
        presenter_type: "talk",
      },
    });

    audioIndexRef.current = 0;
    setIsSpeaking(false);
    options.onSpeaking?.(false);
  }, [options, send]);

  const destroy = useCallback(() => {
    try {
      if (streamIdRef.current && sessionIdRef.current) {
        send({
          type: "delete-stream",
          payload: {
            stream_id: streamIdRef.current,
            session_id: sessionIdRef.current,
          },
        });
      }

      wsRef.current?.close();
      wsRef.current = null;

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;

      if (videoRef.current) videoRef.current.srcObject = null;

      streamIdRef.current = null;
      sessionIdRef.current = null;
      streamReadyRef.current = false;
      audioIndexRef.current = 0;

      setIsConnected(false);
      setIsLoading(false);
      setIsSpeaking(false);
      setError(null);
    } catch {
      // ignore
    }
  }, [send]);

  useEffect(() => {
    return () => destroy();
  }, [destroy]);

  return {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    destroy,
    setVideoElement,
    sendPcmChunk,
    endPcmStream,
  };
};
