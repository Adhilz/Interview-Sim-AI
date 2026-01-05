import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Loader2, User } from 'lucide-react';
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
  sendPcmChunk: (pcmBytes: Uint8Array) => void;
  endPcmStream: () => void;
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

  const {
    isConnected,
    isLoading,
    isSpeaking,
    error,
    initialize,
    destroy,
    setVideoElement,
    sendPcmChunk,
    endPcmStream,
  } = useDidStream({
    onConnected,
    onError,
    onSpeaking: onSpeakingChange,
    avatarUrl,
  });

  useImperativeHandle(
    ref,
    () => ({
      sendPcmChunk,
      endPcmStream,
      destroy,
      isConnected,
    }),
    [sendPcmChunk, endPcmStream, destroy, isConnected]
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
    if (autoStart) {
      initialize();
    }
  }, [autoStart, initialize]);

  useEffect(() => {
    if (isConnected && videoRef.current) {
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
  }, [isConnected]);

  return (
    <div className={`relative w-full h-full bg-[#2d2d2d] rounded-xl overflow-hidden ${className}`}>
      {avatarUrl && !hasVideoFrame && (
        <img
          src={avatarUrl}
          alt="AI interviewer avatar"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          loading="eager"
          draggable={false}
        />
      )}

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

      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#3c4043]">
          <Loader2 className="w-16 h-16 text-accent animate-spin mb-4" />
          <p className="text-white/70 text-sm">Connecting to AI interviewer...</p>
        </div>
      )}

      {!isConnected && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#3c4043]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-accent-foreground" />
          </div>
          <p className="text-white/70 text-sm">AI Interviewer</p>
        </div>
      )}

      {isSpeaking && isConnected && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/80">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-white text-xs font-medium">Speaking...</span>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-4 right-4 z-20 p-3 bg-destructive/80 rounded-lg">
          <p className="text-white text-sm">{error}</p>
        </div>
      )}
    </div>
  );
});

DidAvatar.displayName = 'DidAvatar';

export default DidAvatar;
