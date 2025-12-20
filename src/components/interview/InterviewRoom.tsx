import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Mic, 
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Brain,
  Loader2,
  Settings,
  Volume2
} from "lucide-react";
import { useVapi } from "@/hooks/useVapi";

interface InterviewRoomProps {
  status: "connecting" | "in_progress" | "ended";
  timeRemaining: number;
  publicKey: string;
  assistantId: string;
  resumeContext: string;
  onEndInterview: () => void;
  onVapiConnected?: () => void;
  onVapiError?: (error: string) => void;
}

const InterviewRoom = ({ 
  status, 
  timeRemaining, 
  publicKey,
  assistantId,
  resumeContext,
  onEndInterview,
  onVapiConnected,
  onVapiError,
}: InterviewRoomProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [hasStartedVapi, setHasStartedVapi] = useState(false);

  // Build first message and instructions
  const firstMessage = "Hello! I'm your AI interviewer today. I've reviewed your background and I'm excited to learn more about your experience. Let's begin - can you start by telling me about yourself and what brings you here today?";
  
  const instructions = `You are a professional job interviewer. Be friendly but professional. Ask follow-up questions based on the candidate's responses. Focus on their skills and experience from their resume.

Resume context:
${resumeContext || 'No resume provided - ask general interview questions.'}

Guidelines:
- Ask one question at a time
- Wait for the candidate to finish before responding
- Give brief acknowledgments before asking follow-up questions
- Keep the interview conversational and engaging`;

  const {
    isConnected,
    isLoading,
    isSpeaking,
    error: vapiError,
    start: startVapi,
    stop: stopVapi,
    toggleMute,
  } = useVapi({
    assistantId,
    assistantOverrides: {
      firstMessage,
      variableValues: {
        resumeContext: resumeContext || 'No resume provided',
      },
    },
    onCallStart: () => {
      console.log('[InterviewRoom] VAPI call started');
      onVapiConnected?.();
    },
    onCallEnd: () => {
      console.log('[InterviewRoom] VAPI call ended');
    },
    onError: (e) => {
      console.error('[InterviewRoom] VAPI error:', e);
      onVapiError?.(e.message || 'VAPI connection failed');
    },
  });

  // Start media on mount
  useEffect(() => {
    startMedia();
    return () => stopMedia();
  }, []);

  // Auto-start VAPI when ready
  useEffect(() => {
    if (status === "connecting" && !hasStartedVapi && !isLoading && !isConnected) {
      console.log('[InterviewRoom] Auto-starting VAPI');
      setHasStartedVapi(true);
      startVapi();
    }
  }, [status, hasStartedVapi, isLoading, isConnected, startVapi]);

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
    stopVapi();
    stopMedia();
    onEndInterview();
  };

  const isActuallyConnected = isConnected || status === "in_progress";

  return (
    <div className="fixed inset-0 bg-[#202124] flex flex-col">
      {/* Main content area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* AI Interviewer - Center */}
        <div className="relative w-full max-w-4xl aspect-video bg-[#3c4043] rounded-2xl overflow-hidden flex items-center justify-center">
          {/* Avatar Placeholder */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-6 transition-all duration-300 ${
              isSpeaking ? "ring-4 ring-accent/50 scale-105" : ""
            } ${isLoading ? "animate-pulse" : ""}`}>
              {isLoading ? (
                <Loader2 className="w-16 h-16 md:w-20 md:h-20 text-accent-foreground animate-spin" />
              ) : (
                <Brain className="w-16 h-16 md:w-20 md:h-20 text-accent-foreground" />
              )}
            </div>
            <p className="text-white text-xl md:text-2xl font-medium mb-2">AI Interviewer</p>
            {isLoading && (
              <p className="text-white/60 text-sm">Connecting to interview...</p>
            )}
            {isActuallyConnected && !isSpeaking && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Mic className="w-4 h-4 text-success animate-pulse" />
                <span>Listening to you...</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Volume2 className="w-4 h-4 text-accent animate-pulse" />
                <span>AI is speaking...</span>
              </div>
            )}
            {vapiError && (
              <div className="mt-4 p-3 bg-destructive/20 rounded-lg max-w-md">
                <p className="text-destructive text-sm">{vapiError}</p>
              </div>
            )}
          </div>

          {/* User's self video - bottom right */}
          <div className="absolute bottom-4 right-4 w-40 h-28 md:w-52 md:h-36 rounded-xl overflow-hidden bg-[#3c4043] border-2 border-white/10 shadow-2xl">
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
          <div className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg ${
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
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50">
            <div className={`w-2 h-2 rounded-full ${isActuallyConnected ? "bg-success" : isLoading ? "bg-warning animate-pulse" : "bg-muted"}`} />
            <span className="text-white/70 text-sm">
              {isActuallyConnected ? "Connected" : isLoading ? "Connecting..." : "Disconnected"}
            </span>
          </div>
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
