import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Mic, 
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Loader2,
  Settings,
  Volume2
} from "lucide-react";
import { useVapi } from "@/hooks/useVapi";
import DidAvatar, { DidAvatarRef } from "./DidAvatar";


interface InterviewRoomProps {
  status: "connecting" | "in_progress" | "ended";
  timeRemaining: number;
  publicKey: string;
  assistantId: string;
  assistantOverrides?: any;
  sessionId: string;
  onEndInterview: (transcript?: string) => void;
  onVapiConnected?: (callId: string) => void;
  onVapiError?: (error: string) => void;
  onTranscriptUpdate?: (transcript: string) => void;
}

const InterviewRoom = ({ 
  status, 
  timeRemaining, 
  publicKey,
  assistantId,
  assistantOverrides,
  sessionId,
  onEndInterview,
  onVapiConnected,
  onVapiError,
  onTranscriptUpdate,
}: InterviewRoomProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const didAvatarRef = useRef<DidAvatarRef>(null);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [hasStartedVapi, setHasStartedVapi] = useState(false);
  const [isDidConnected, setIsDidConnected] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);

  const {
    isConnected,
    isLoading,
    isSpeaking,
    error: vapiError,
    callId,
    start: startVapi,
    stop: stopVapi,
    toggleMute,
    getTranscript,
  } = useVapi({
    publicKey,
    assistantId,
    assistantOverrides,
    onCallStart: (id) => {
      console.log('[InterviewRoom] VAPI call started with ID:', id);
      onVapiConnected?.(id);
    },
    onCallEnd: () => {
      console.log('[InterviewRoom] VAPI call ended');
    },
    onError: (e) => {
      console.error('[InterviewRoom] VAPI error:', e);
      onVapiError?.(e.message || 'VAPI connection failed');
    },
    onMessage: (message) => {
      // Update transcript on each message
      if (message.type === 'transcript') {
        const currentTranscript = getTranscript();
        onTranscriptUpdate?.(currentTranscript);
      }
    },
  });

  // Use the app-hosted avatar from /public/avatars so D-ID can fetch it reliably
  useEffect(() => {
    setIsAvatarLoading(true);
    setAvatarUrl(new URL('/avatars/interviewer.png', window.location.origin).toString());
    setIsAvatarLoading(false);
  }, []);

  // Start media on mount
  useEffect(() => {
    startMedia();
    return () => stopMedia();
  }, []);

  // Auto-start VAPI when D-ID is ready
  useEffect(() => {
    if (status === "connecting" && !hasStartedVapi && !isLoading && !isConnected && isDidConnected && avatarUrl) {
      console.log('[InterviewRoom] D-ID connected, starting VAPI');
      setHasStartedVapi(true);
      startVapi();
    }
  }, [status, hasStartedVapi, isLoading, isConnected, isDidConnected, startVapi, avatarUrl]);

  // Handle VAPI error
  useEffect(() => {
    if (vapiError) {
      onVapiError?.(vapiError);
    }
  }, [vapiError, onVapiError]);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Media error:", error);
    }
  };

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
      toggleMute();
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    const transcript = getTranscript();
    stopVapi();
    stopMedia();
    didAvatarRef.current?.destroy();
    onEndInterview(transcript);
  };

  const handleDidConnected = () => {
    console.log('[InterviewRoom] D-ID avatar connected');
    setIsDidConnected(true);
  };

  const handleDidError = (error: string) => {
    console.error('[InterviewRoom] D-ID error:', error);
    // D-ID errors are non-fatal, we can still do audio-only interview
  };

  const isActuallyConnected = isConnected || status === "in_progress";

  return (
    <div className="fixed inset-0 bg-[#202124] flex flex-col">
      {/* Main content area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* AI Interviewer Avatar - Center */}
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden">
          {!isAvatarLoading && avatarUrl && (
            <DidAvatar
              ref={didAvatarRef}
              autoStart={true}
              avatarUrl={avatarUrl}
              onConnected={handleDidConnected}
              onError={handleDidError}
              onSpeakingChange={setIsAvatarSpeaking}
              className="w-full h-full"
            />
          )}
          
          {isAvatarLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3c4043]">
              <Loader2 className="w-16 h-16 text-accent animate-spin mb-4" />
              <p className="text-white/70 text-sm">Loading avatar...</p>
            </div>
          )}

          {/* User's self video - bottom right */}
          <div className="absolute bottom-4 right-4 w-40 h-28 md:w-52 md:h-36 rounded-xl overflow-hidden bg-[#3c4043] border-2 border-white/10 shadow-2xl z-10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
            />
            {!isVideoOn && (
              <div className="w-full h-full flex items-center justify-center bg-[#3c4043]">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                  <VideoOff className="w-7 h-7 text-white/50" />
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/40 px-2 py-0.5 rounded">
              You
            </div>
          </div>

          {/* Timer - top right */}
          <div className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg z-10 ${
            timeRemaining < 60 ? "bg-destructive/80" : "bg-black/50"
          }`}>
            <Clock className="w-5 h-5 text-white" />
            <span className={`text-lg font-mono font-bold ${
              timeRemaining < 60 ? "text-white animate-pulse" : "text-white"
            }`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Connection status */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 z-10">
            <div className={`w-2 h-2 rounded-full ${isActuallyConnected ? "bg-success" : isLoading ? "bg-warning animate-pulse" : "bg-muted"}`} />
            <span className="text-white/70 text-sm">
              {isActuallyConnected ? "Connected" : isLoading ? "Connecting..." : "Disconnected"}
            </span>
          </div>

          {/* VAPI status indicator */}
          {isActuallyConnected && !isSpeaking && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 z-10">
              <Mic className="w-4 h-4 text-success animate-pulse" />
              <span className="text-white/70 text-sm">Listening...</span>
            </div>
          )}

          {/* VAPI error display */}
          {vapiError && (
            <div className="absolute top-16 left-4 right-4 p-3 bg-destructive/80 rounded-lg z-10">
              <p className="text-white text-sm">{vapiError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="h-20 bg-[#202124] border-t border-white/10 flex items-center justify-center gap-4 px-4">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMicOn ? "bg-[#3c4043] hover:bg-[#4a4f54]" : "bg-destructive hover:bg-destructive/90"
          }`}
        >
          {isMicOn ? (
            <Mic className="w-5 h-5 text-white" />
          ) : (
            <MicOff className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Video toggle */}
        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isVideoOn ? "bg-[#3c4043] hover:bg-[#4a4f54]" : "bg-destructive hover:bg-destructive/90"
          }`}
        >
          {isVideoOn ? (
            <Video className="w-5 h-5 text-white" />
          ) : (
            <VideoOff className="w-5 h-5 text-white" />
          )}
        </button>

        {/* End call button */}
        <button
          onClick={handleEndCall}
          className="w-14 h-12 rounded-full bg-destructive hover:bg-destructive/90 flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-5 h-5 text-white" />
        </button>

        {/* Settings placeholder */}
        <button className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#4a4f54] flex items-center justify-center transition-colors">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;
