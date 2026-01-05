import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { User } from 'lucide-react';
import { useDidStream } from '@/hooks/useDidStream';

interface DidAvatarProps {
  autoStart?: boolean;
  avatarUrl?: string;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  className?: string;
}

export interface DidAvatarRef {
  streamText: (text: string) => void;
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
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const [didFailed, setDidFailed] = useState(false);

  const handleDidError = (error: string) => {
    console.warn('[DidAvatar] D-ID failed, using static avatar:', error);
    setDidFailed(true);
    onError?.(error);
  };

  const {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    destroy,
    setVideoElement,
    streamText,
  } = useDidStream({
    onConnected,
    onError: handleDidError,
    onSpeaking: onSpeakingChange,
    avatarUrl,
  });

  useImperativeHandle(
    ref,
    () => ({
      streamText: (text: string) => {
        // Only stream if D-ID is connected, otherwise ignore silently
        if (isConnected && !didFailed) {
          streamText(text);
        }
      },
      destroy,
      isConnected: isConnected && !didFailed,
    }),
    [streamText, destroy, isConnected, didFailed]
  );

  useEffect(() => {
    setVideoElement(videoRef.current);
  }, [setVideoElement]);

  useEffect(() => {
    if (!isConnected) setHasVideoFrame(false);
  }, [isConnected]);

  useEffect(() => {
    setHasVideoFrame(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (autoStart && !didFailed) {
      initialize();
    }
  }, [autoStart, initialize, didFailed]);

  useEffect(() => {
    if (isConnected && videoRef.current && !didFailed) {
      const playVideo = async () => {
        try {
          await videoRef.current?.play();
          console.log('[DidAvatar] Video playing');
        } catch (e) {
          console.warn('[DidAvatar] Autoplay failed, trying muted:', e);
          if (videoRef.current) {
            videoRef.current.muted = true;
            try {
              await videoRef.current.play();
              setTimeout(() => {
                if (videoRef.current) videoRef.current.muted = false;
              }, 100);
            } catch (e2) {
              console.error('[DidAvatar] Even muted autoplay failed:', e2);
            }
          }
        }
      };
      playVideo();
    }
  }, [isConnected, didFailed]);

  // Show static avatar when D-ID fails or is not available
  const showStaticAvatar = didFailed || (!isConnected && !isLoading);

  return (
    <div className={`relative w-full h-full bg-[#2d2d2d] rounded-xl overflow-hidden ${className}`}>
      {/* Static avatar image - always visible as background or when D-ID fails */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="AI interviewer avatar"
          className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${
            hasVideoFrame && !didFailed ? 'opacity-0' : 'opacity-100'
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

      {/* D-ID video stream - only shown when connected and not failed */}
      {!didFailed && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          poster={avatarUrl}
          onLoadedData={() => setHasVideoFrame(true)}
          onPlaying={() => setHasVideoFrame(true)}
          className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ${
            hasVideoFrame ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Speaking indicator - works for both D-ID and static mode */}
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
    </div>
  );
});

DidAvatar.displayName = 'DidAvatar';

export default DidAvatar;
