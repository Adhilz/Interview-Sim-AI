import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { User, Loader2 } from 'lucide-react';
import { useSimliStream } from '@/hooks/useSimliStream';

interface SimliAvatarProps {
  apiKey: string;
  faceId: string;
  autoStart?: boolean;
  avatarUrl?: string;
  onConnected?: () => void;
  onReady?: () => void;
  onError?: (error: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  className?: string;
}

export interface SimliAvatarRef {
  sendAudioData: (audioData: Uint8Array) => void;
  listenToMediaStreamTrack: (track: MediaStreamTrack) => void;
  clearBuffer: () => void;
  destroy: () => void;
  isConnected: boolean;
  isReady: boolean;
}

const SimliAvatar = forwardRef<SimliAvatarRef, SimliAvatarProps>(({
  apiKey,
  faceId,
  autoStart = true,
  avatarUrl,
  onConnected,
  onReady,
  onError,
  onSpeakingChange,
  className = '',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [refsReady, setRefsReady] = useState(false);

  const {
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
  } = useSimliStream({
    apiKey,
    faceId,
    onConnected,
    onReady,
    onError,
    onSpeaking: onSpeakingChange,
  });

  // Set refs once DOM elements mount
  useEffect(() => {
    if (videoRef.current && audioRef.current) {
      setVideoElement(videoRef.current);
      setAudioElement(audioRef.current);
      setRefsReady(true);
      console.log('[SimliAvatar] Video/audio refs set');
    }
  }, [setVideoElement, setAudioElement]);

  useImperativeHandle(
    ref,
    () => ({
      sendAudioData,
      listenToMediaStreamTrack,
      clearBuffer,
      destroy,
      isConnected,
      isReady,
    }),
    [sendAudioData, listenToMediaStreamTrack, clearBuffer, destroy, isConnected, isReady]
  );

  // Only start after refs are ready
  useEffect(() => {
    if (autoStart && refsReady) {
      console.log('[SimliAvatar] Refs ready, initializing...');
      initialize();
    }
  }, [autoStart, initialize, refsReady]);

  return (
    <div className={`relative w-full h-full bg-[#2d2d2d] rounded-xl overflow-hidden ${className}`}>
      {/* Static avatar fallback — shown until Simli stream is ready */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="AI interviewer avatar"
          className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${
            isReady ? 'opacity-0' : 'opacity-100'
          }`}
          loading="eager"
          draggable={false}
        />
      )}

      {!avatarUrl && !isReady && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#3c4043]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-accent-foreground" />
          </div>
          <p className="text-white/70 text-sm">AI Interviewer</p>
        </div>
      )}

      {/* Simli video/audio — always rendered so refs stay stable */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <audio ref={audioRef} autoPlay playsInline muted data-simli-audio="true" />

      {/* Speaking indicator */}
      {isSpeaking && isReady && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/80">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-white text-xs font-medium">Speaking...</span>
        </div>
      )}

      {/* Loading / connecting overlay */}
      {(isLoading || (isConnected && !isReady)) && (
        <div className="absolute inset-0 z-15 flex flex-col items-center justify-center bg-black/30">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
          <div className="text-white/70 text-sm animate-pulse">
            {isLoading ? 'Connecting to AI interviewer...' : 'Starting avatar stream...'}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-4 right-4 z-20 px-3 py-2 rounded-lg bg-destructive/80 text-white text-xs max-w-[200px]">
          {error}
        </div>
      )}
    </div>
  );
});

SimliAvatar.displayName = 'SimliAvatar';

export default SimliAvatar;
