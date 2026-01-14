import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, VideoOff, Loader2, Play } from 'lucide-react';

interface PreInterviewSetupProps {
  onReady: (stream: MediaStream) => void;
}

export const PreInterviewSetup = ({ onReady }: PreInterviewSetupProps) => {
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    startCamera();
    return () => cleanup();
  }, []);

  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  const startCamera = async () => {
    setCameraStatus('loading');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setCameraStatus('ready');
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraStatus('error');
    }
  };

  const handleStart = () => {
    if (stream) {
      onReady(stream);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Video Preview */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-video bg-secondary/50 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {cameraStatus === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {cameraStatus === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                <div className="text-center p-4">
                  <VideoOff className="w-12 h-12 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive font-medium">Camera access denied</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please allow camera access in your browser settings
                  </p>
                  <Button variant="outline" onClick={startCamera} className="mt-4">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        variant="hero"
        size="lg"
        onClick={handleStart}
        disabled={cameraStatus !== 'ready' || !stream}
        className="w-full"
      >
        <Play className="w-5 h-5 mr-2" />
        Start Interview
      </Button>
    </div>
  );
};

export default PreInterviewSetup;
