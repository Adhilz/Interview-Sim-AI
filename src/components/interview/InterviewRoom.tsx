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
  User
} from "lucide-react";
import { useVapi } from "@/hooks/useVapi";
import { supabase } from "@/integrations/supabase/client";
import DidAvatar, { DidAvatarRef } from "./DidAvatar";
import InterviewSettings, { InterviewSettingsState } from "./InterviewSettings";

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
  onTimeWarning?: () => void;
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
  onTimeWarning,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [fullTranscript, setFullTranscript] = useState<string[]>([]);
  const [hasShown30SecWarning, setHasShown30SecWarning] = useState(false);
  const [hasSpokenEndMessage, setHasSpokenEndMessage] = useState(false);
  
  const [settings, setSettings] = useState<InterviewSettingsState>(() => {
    const saved = localStorage.getItem('interviewSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      selectedMic: '',
      selectedSpeaker: '',
      cameraEnabled: true,
      avatarVisible: true,
      voiceSpeed: 1,
      captionsEnabled: false,
    };
  });

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
    say,
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
    onSpeechEnd: () => {
      // Check if we need to speak the 30-second warning after current utterance ends
      if (timeRemaining <= 30 && timeRemaining > 0 && !hasShown30SecWarning && isConnected) {
        console.log('[InterviewRoom] INTERVIEW_END_WARNING: Speaking 30-second warning');
        setHasShown30SecWarning(true);
        say("You have about thirty seconds remaining. Please wrap up your current answer.");
        onTimeWarning?.();
      }
    },
    onMessage: (message) => {
      // Handle transcript messages
      if (message.type === 'transcript' && message.transcriptType === 'final' && message.transcript) {
        const role = message.role === 'assistant' ? 'Interviewer' : 'Candidate';
        const line = `${role}: ${message.transcript}`;
        
        console.log('[InterviewRoom] Transcript line captured:', line.substring(0, 100));
        
        // Accumulate full transcript
        setFullTranscript(prev => {
          const newTranscript = [...prev, line];
          // Notify parent with full transcript for evaluation
          const transcriptText = newTranscript.join('\n');
          onTranscriptUpdate?.(transcriptText);
          return newTranscript;
        });
        
        // Update current display
        setCurrentTranscript(message.transcript);
        
        // Stream to D-ID avatar if assistant is speaking
        if (message.role === 'assistant' && didAvatarRef.current?.isConnected) {
          didAvatarRef.current.streamText(message.transcript);
        }
      }
      
      // Also capture conversation-update for more reliable transcript
      if (message.type === 'conversation-update' && message.conversation && Array.isArray(message.conversation)) {
        console.log('[InterviewRoom] Conversation update with', message.conversation.length, 'messages');
        
        const lines: string[] = [];
        for (const msg of message.conversation) {
          const content = msg.content || msg.text;
          if (content && typeof content === 'string' && content.trim().length > 0 && msg.role !== 'system') {
            const role = msg.role === 'assistant' ? 'Interviewer' : 'Candidate';
            lines.push(`${role}: ${content.trim()}`);
          }
        }
        
        // Use conversation-update if it has more content
        if (lines.length > fullTranscript.length) {
          console.log('[InterviewRoom] Using conversation-update transcript:', lines.length, 'lines');
          setFullTranscript(lines);
          onTranscriptUpdate?.(lines.join('\n'));
        }
      }
    },
  });

  // 30-second warning effect - trigger check when time hits 30 seconds
  useEffect(() => {
    if (timeRemaining === 30 && !hasShown30SecWarning && isConnected && !isSpeaking) {
      // If assistant is not currently speaking, trigger warning immediately
      console.log('[InterviewRoom] INTERVIEW_END_WARNING: Time reached 30 seconds, speaking warning');
      setHasShown30SecWarning(true);
      say("You have about thirty seconds remaining. Please wrap up your current answer.");
      onTimeWarning?.();
    }
  }, [timeRemaining, hasShown30SecWarning, isConnected, isSpeaking, say, onTimeWarning]);

  // Interview end effect - speak closing message when time reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && !hasSpokenEndMessage && isConnected) {
      console.log('[InterviewRoom] INTERVIEW_ENDED: Speaking closing message');
      setHasSpokenEndMessage(true);
      // Use say with endCallAfter=true to end after speaking
      say("Thank you. This concludes your interview.", true);
    }
  }, [timeRemaining, hasSpokenEndMessage, isConnected, say]);

  // Fetch user's profile avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile?.avatar_url) {
          setUserAvatarUrl(profile.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);

  // Enumerate devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };
    getDevices();
  }, []);

  // Use the app-hosted avatar from /public/avatars
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

  // Auto-start VAPI
  useEffect(() => {
    if (status === "connecting" && !hasStartedVapi && !isLoading && !isConnected && avatarUrl) {
      console.log('[InterviewRoom] Starting VAPI');
      setHasStartedVapi(true);
      startVapi();
    }
  }, [status, hasStartedVapi, isLoading, isConnected, startVapi, avatarUrl]);

  // Handle VAPI error
  useEffect(() => {
    if (vapiError) {
      onVapiError?.(vapiError);
    }
  }, [vapiError, onVapiError]);

  // Apply camera setting
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = settings.cameraEnabled;
      });
      setIsVideoOn(settings.cameraEnabled);
    }
  }, [settings.cameraEnabled]);

  const startMedia = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: true,
        audio: settings.selectedMic ? { deviceId: { exact: settings.selectedMic } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    // Get transcript from useVapi hook first, then fallback to local accumulation
    const vapiTranscript = getTranscript();
    const localTranscript = fullTranscript.join('\n');
    
    // Use the longer/more complete transcript
    const finalTranscript = (vapiTranscript && vapiTranscript.length > localTranscript.length) 
      ? vapiTranscript 
      : localTranscript;
    
    console.log('[InterviewRoom] Ending call');
    console.log('[InterviewRoom] VAPI transcript lines:', vapiTranscript?.split('\n').length || 0);
    console.log('[InterviewRoom] Local transcript lines:', fullTranscript.length);
    console.log('[InterviewRoom] Final transcript preview:', finalTranscript?.substring(0, 300));
    
    stopVapi();
    stopMedia();
    didAvatarRef.current?.destroy();
    onEndInterview(finalTranscript);
  };

  const handleDidConnected = () => {
    console.log('[InterviewRoom] D-ID avatar connected');
    setIsDidConnected(true);
  };

  const handleDidError = (error: string) => {
    console.error('[InterviewRoom] D-ID error:', error);
  };

  const isActuallyConnected = isConnected || status === "in_progress";

  return (
    <div className="fixed inset-0 bg-[#202124] flex flex-col">
      {/* Main content area */}
      <div className="flex-1 relative flex items-center justify-center p-2 sm:p-4">
        {/* AI Interviewer Avatar - Center */}
        <div className="relative w-full h-full max-w-4xl max-h-[70vh] sm:max-h-[75vh] aspect-video rounded-xl sm:rounded-2xl overflow-hidden">
          {settings.avatarVisible && !isAvatarLoading && avatarUrl && (
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
          
          {!settings.avatarVisible && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3c4043]">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-accent" />
              </div>
              <p className="text-white/70">AI Interviewer</p>
            </div>
          )}
          
          {isAvatarLoading && settings.avatarVisible && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3c4043]">
              <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-accent animate-spin mb-4" />
              <p className="text-white/70 text-sm">Loading avatar...</p>
            </div>
          )}

          {/* User's self video - bottom right */}
          <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-24 h-18 sm:w-40 sm:h-28 md:w-52 md:h-36 rounded-lg sm:rounded-xl overflow-hidden bg-[#3c4043] border-2 border-white/10 shadow-2xl z-10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
            />
            {!isVideoOn && (
              <div className="w-full h-full flex items-center justify-center bg-[#3c4043]">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-accent/20 flex items-center justify-center">
                    <VideoOff className="w-5 h-5 sm:w-7 sm:h-7 text-white/50" />
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 text-xs text-white/70 bg-black/40 px-1.5 py-0.5 sm:px-2 rounded">
              You
            </div>
          </div>

          {/* Timer - top right */}
          <div className={`absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg z-10 ${
            timeRemaining < 60 ? "bg-destructive/80" : "bg-black/50"
          }`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className={`text-sm sm:text-lg font-mono font-bold ${
              timeRemaining < 60 ? "text-white animate-pulse" : "text-white"
            }`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Connection status */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-black/50 z-10">
            <div className={`w-2 h-2 rounded-full ${isActuallyConnected ? "bg-success" : isLoading ? "bg-warning animate-pulse" : "bg-muted"}`} />
            <span className="text-white/70 text-xs sm:text-sm">
              {isActuallyConnected ? "Connected" : isLoading ? "Connecting..." : "Disconnected"}
            </span>
          </div>

          {/* VAPI status indicator */}
          {isActuallyConnected && !isSpeaking && (
            <div className="absolute bottom-14 sm:bottom-4 left-2 sm:left-4 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-black/50 z-10">
              <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-success animate-pulse" />
              <span className="text-white/70 text-xs sm:text-sm">Listening...</span>
            </div>
          )}

          {/* Captions */}
          {settings.captionsEnabled && currentTranscript && (
            <div className="absolute bottom-16 sm:bottom-20 left-1/2 transform -translate-x-1/2 max-w-[90%] px-4 py-2 rounded-lg bg-black/70 z-10">
              <p className="text-white text-sm sm:text-base text-center">{currentTranscript}</p>
            </div>
          )}

          {/* VAPI error display */}
          {vapiError && (
            <div className="absolute top-14 sm:top-16 left-2 right-2 sm:left-4 sm:right-4 p-2 sm:p-3 bg-destructive/80 rounded-lg z-10">
              <p className="text-white text-xs sm:text-sm">{vapiError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="h-16 sm:h-20 bg-[#202124] border-t border-white/10 flex items-center justify-center gap-2 sm:gap-4 px-4">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
            isMicOn ? "bg-[#3c4043] hover:bg-[#4a4f54]" : "bg-destructive hover:bg-destructive/90"
          }`}
        >
          {isMicOn ? (
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : (
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          )}
        </button>

        {/* Video toggle */}
        <button
          onClick={toggleVideo}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
            isVideoOn ? "bg-[#3c4043] hover:bg-[#4a4f54]" : "bg-destructive hover:bg-destructive/90"
          }`}
        >
          {isVideoOn ? (
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : (
            <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          )}
        </button>

        {/* End call button */}
        <button
          onClick={handleEndCall}
          className="w-12 h-10 sm:w-14 sm:h-12 rounded-full bg-destructive hover:bg-destructive/90 flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>

        {/* Settings button */}
        <button 
          onClick={() => setSettingsOpen(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#3c4043] hover:bg-[#4a4f54] flex items-center justify-center transition-colors"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>
      </div>

      {/* Settings Dialog */}
      <InterviewSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
        audioInputDevices={audioInputDevices}
        audioOutputDevices={audioOutputDevices}
      />
    </div>
  );
};

export default InterviewRoom;