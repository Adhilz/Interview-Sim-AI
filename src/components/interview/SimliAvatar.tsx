import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { User } from 'lucide-react';
import { useSimliStream } from '@/hooks/useSimliStream';

interface SimliAvatarProps {
  apiKey: string;
  faceId: string;
  autoStart?: boolean;
  avatarUrl?: string; // static fallback image
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  className?: string;
}

export interface SimliAvatarRef {
  sendAudioData: (audioData: Uint8Array) => void;
  clearBuffer: () => void;
  destroy: () => void;
  isConnected: boolean;
}

const SimliAvatar = forwardRef<SimliAvatarRef, SimliAvatarProps>(({
  apiKey,
  faceId,
  autoStart = true,
  avatarUrl,
  onConnected,
  onError,
  onSpeakingChange,
  className = '',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [simliFailed, setSimliFailed] = useState(false);

  const handleSimliError = (error: string) => {
    console.warn('[SimliAvatar] Simli failed, falling back:', error);
    setSimliFailed(true);
    onError?.(error);
  };

  const {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    destroy,
    sendAudioData,
    clearBuffer,
  } = useSimliStream({
    apiKey,
    faceId,
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    audioRef: audioRef as React.RefObject<HTMLAudioElement>,
    onConnected,
    onError: handleSimliError,
    onSpeaking: onSpeakingChange,
  });

  useImperativeHandle(
    ref,
    () => ({
      sendAudioData: (audioData: Uint8Array) => {
        if (isConnected && !simliFailed) {
          sendAudioData(audioData);
        }
      },
      clearBuffer,
      destroy,
      isConnected: isConnected && !simliFailed,
    }),
    [sendAudioData, clearBuffer, destroy, isConnected, simliFailed]
  );

  useEffect(() => {
    if (autoStart && !simliFailed) {
      initialize();
    }
  }, [autoStart, initialize, simliFailed]);

  const showStaticAvatar = simliFailed || (!isConnected && !isLoading);

  return (
    <div className={`relative w-full h-full bg-[#2d2d2d] rounded-xl overflow-hidden ${className}`}>
      {/* Static avatar fallback */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="AI interviewer avatar"
          className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${
            isConnected && !simliFailed ? 'opacity-0' : 'opacity-100'
          }`}
          loading="eager"
          draggable={false}
        />
      )}

      {/* Fallback icon when no avatar URL */}
      {!avatarUrl && showStaticAvatar && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#3c4043]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-accent-foreground" />
          </div>
          <p className="text-white/70 text-sm">AI Interviewer</p>
        </div>
      )}

      {/* Simli video stream */}
      {!simliFailed && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ${
              isConnected ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <audio ref={audioRef} autoPlay playsInline />
        </>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/80">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-white text-xs font-medium">Speaking...</span>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-5 flex items-center justify-center bg-black/30">
          <div className="text-white/70 text-sm">Connecting Simli avatar...</div>
        </div>
      )}
    </div>
  );
});

SimliAvatar.displayName = 'SimliAvatar';

export default SimliAvatar;
