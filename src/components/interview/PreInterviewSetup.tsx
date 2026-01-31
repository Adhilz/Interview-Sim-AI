import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Loader2, Play, Briefcase, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InterviewMode = 'resume_jd' | 'technical' | 'hr';

interface PreInterviewSetupProps {
  onReady: (stream: MediaStream, preferences?: string) => void;
  interviewMode?: InterviewMode | null;
}

export const PreInterviewSetup = ({ onReady, interviewMode }: PreInterviewSetupProps) => {
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [interviewerPreferences, setInterviewerPreferences] = useState<string>('');
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
      onReady(stream, interviewerPreferences.trim() || undefined);
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

      {/* Interview Preferences - Only show for resume_jd mode */}
      {interviewMode === 'resume_jd' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent" />
              Interview Context
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Provide context about the role you're interviewing for. The AI interviewer will tailor questions based on this information.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Optional: Add a job description or specific focus areas for this interview
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Textarea
                id="preferences"
                placeholder="e.g., 'I'm interviewing for a Senior React Developer position at a fintech startup. Focus on state management, performance optimization, and system design...' or paste a job description here"
                value={interviewerPreferences}
                onChange={(e) => setInterviewerPreferences(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={1500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {interviewerPreferences.length}/1500 characters
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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