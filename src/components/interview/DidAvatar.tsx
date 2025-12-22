import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Loader2, User } from 'lucide-react';
import { useDidStream } from '@/hooks/useDidStream';

interface DidAvatarProps {
  autoStart?: boolean;
  avatarUrl?: string; // Custom avatar URL (must be publicly accessible)
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  className?: string;
}

export interface DidAvatarRef {
  streamAudio: (audioBase64: string) => void;
  destroy: () => void;
  isConnected: boolean;
}

const DidAvatar = forwardRef<DidAvatarRef, DidAvatarProps>(({
  autoStart = true,
  avatarUrl,
  onConnected,
  onError,
  onSpeakingChange,
  className = '',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    streamAudio,
    destroy,
    setVideoElement,
  } = useDidStream({
    onConnected,
    onError,
    onSpeaking: onSpeakingChange,
    avatarUrl, // Pass the custom avatar URL to the hook
  });

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    streamAudio,
    destroy,
    isConnected,
  }), [streamAudio, destroy, isConnected]);

  // Set video element reference
  useEffect(() => {
    setVideoElement(videoRef.current);
  }, [setVideoElement]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      initialize();
    }
  }, [autoStart, initialize]);

  return (
    <div className={`relative w-full h-full bg-[#2d2d2d] rounded-xl overflow-hidden ${className}`}>
      {/* Video element for D-ID stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isConnected ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3c4043]">
          <Loader2 className="w-16 h-16 text-accent animate-spin mb-4" />
          <p className="text-white/70 text-sm">Connecting to AI interviewer...</p>
        </div>
      )}

      {/* Fallback when not connected */}
      {!isConnected && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3c4043]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-accent-foreground" />
          </div>
          <p className="text-white/70 text-sm">AI Interviewer</p>
        </div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && isConnected && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/80">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-white text-xs font-medium">Speaking...</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-destructive/80 rounded-lg">
          <p className="text-white text-sm">{error}</p>
        </div>
      )}
    </div>
  );
});

DidAvatar.displayName = 'DidAvatar';

export default DidAvatar;
