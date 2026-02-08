import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { User } from 'lucide-react';
import { useSimliStream } from '@/hooks/useSimliStream';

interface SimliAvatarProps {
  apiKey: string;
  faceId: string;
  autoStart?: boolean;
  avatarUrl?: string;
  onConnected?: () => void;
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
  const [refsReady, setRefsReady] = useState(false);

  const handleSimliError = useCallback((error: string) => {
    console.warn('[SimliAvatar] Simli failed, falling back:', error);
    setSimliFailed(true);
    onError?.(error);
  }, [onError]);

  const {
    isConnected,
    isLoading,
    isSpeaking,
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
    onError: handleSimliError,
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
      sendAudioData: (audioData: Uint8Array) => {
        if (isConnected && !simliFailed) {
          sendAudioData(audioData);
        }
      },
      listenToMediaStreamTrack: (track: MediaStreamTrack) => {
        if (isConnected && !simliFailed) {
          listenToMediaStreamTrack(track);
        }
      },
      clearBuffer,
      destroy,
      isConnected: isConnected && !simliFailed,
    }),
    [sendAudioData, listenToMediaStreamTrack, clearBuffer, destroy, isConnected, simliFailed]
  );

  // Only start after refs are ready
  useEffect(() => {
    if (autoStart && !simliFailed && refsReady) {
      console.log('[SimliAvatar] Refs ready, initializing...');
      initialize();
    }
  }, [autoStart, initialize, simliFailed, refsReady]);

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

      {!avatarUrl && showStaticAvatar && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#3c4043]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-accent-foreground" />
          </div>
          <p className="text-white/70 text-sm">AI Interviewer</p>
        </div>
      )}

      {/* Simli video/audio - always render so refs are available */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ${
          isConnected && !simliFailed ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <audio ref={audioRef} autoPlay playsInline data-simli-audio="true" />

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

      {isLoading && (
        <div className="absolute inset-0 z-15 flex items-center justify-center bg-black/30">
          <div className="text-white/70 text-sm animate-pulse">Connecting Simli avatar...</div>
        </div>
      )}
    </div>
  );
});

SimliAvatar.displayName = 'SimliAvatar';

export default SimliAvatar;
