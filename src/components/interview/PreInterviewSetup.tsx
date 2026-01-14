import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Volume2,
  RefreshCw,
} from 'lucide-react';

interface DeviceStatus {
  camera: 'checking' | 'ready' | 'error' | 'denied';
  microphone: 'checking' | 'ready' | 'error' | 'denied';
  network: 'checking' | 'good' | 'slow' | 'error';
}

interface PreInterviewSetupProps {
  onReady: (stream: MediaStream) => void;
}

export const PreInterviewSetup = ({ onReady }: PreInterviewSetupProps) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    camera: 'checking',
    microphone: 'checking',
    network: 'checking',
  });
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [networkSpeed, setNetworkSpeed] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check if all essential tests passed
  useEffect(() => {
    const cameraOk = deviceStatus.camera === 'ready';
    const micOk = deviceStatus.microphone === 'ready';
    const networkOk = deviceStatus.network === 'good' || deviceStatus.network === 'slow';
    
    setAllTestsPassed(cameraOk && micOk && networkOk);
  }, [deviceStatus]);

  // Start device tests on mount
  useEffect(() => {
    startDeviceTests();
    return () => cleanup();
  }, []);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  const startDeviceTests = async () => {
    setIsTesting(true);
    setDeviceStatus({
      camera: 'checking',
      microphone: 'checking',
      network: 'checking',
    });

    // Run tests in parallel
    await Promise.all([
      testCameraAndMic(),
      testNetworkSpeed(),
    ]);

    setIsTesting(false);
  };

  const testCameraAndMic = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Test camera
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'live') {
        setDeviceStatus(prev => ({ ...prev, camera: 'ready' }));
      } else {
        setDeviceStatus(prev => ({ ...prev, camera: 'error' }));
      }

      // Test microphone with audio level monitoring
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack && audioTrack.readyState === 'live') {
        setDeviceStatus(prev => ({ ...prev, microphone: 'ready' }));
        startAudioLevelMonitoring(mediaStream);
      } else {
        setDeviceStatus(prev => ({ ...prev, microphone: 'error' }));
      }
    } catch (error: any) {
      console.error('Device access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setDeviceStatus(prev => ({
          ...prev,
          camera: 'denied',
          microphone: 'denied',
        }));
      } else {
        setDeviceStatus(prev => ({
          ...prev,
          camera: 'error',
          microphone: 'error',
        }));
      }
    }
  };

  const startAudioLevelMonitoring = (mediaStream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Audio monitoring error:', error);
    }
  };

  const testNetworkSpeed = async () => {
    try {
      const startTime = performance.now();
      // Test with a small image from our public assets
      const response = await fetch('/avatars/interviewer.png', { 
        cache: 'no-store',
        method: 'HEAD'
      });
      const endTime = performance.now();
      
      if (!response.ok) throw new Error('Network test failed');
      
      const latency = endTime - startTime;
      setNetworkSpeed(latency);

      if (latency < 200) {
        setDeviceStatus(prev => ({ ...prev, network: 'good' }));
      } else if (latency < 500) {
        setDeviceStatus(prev => ({ ...prev, network: 'slow' }));
      } else {
        setDeviceStatus(prev => ({ ...prev, network: 'error' }));
      }
    } catch (error) {
      console.error('Network test error:', error);
      setDeviceStatus(prev => ({ ...prev, network: 'error' }));
    }
  };

  const handleContinue = () => {
    if (stream) {
      onReady(stream);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case 'ready':
      case 'good':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'slow':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error':
      case 'denied':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'ready':
      case 'good':
        return <Badge variant="default" className="bg-success/20 text-success border-success/30">Ready</Badge>;
      case 'slow':
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">Slow</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'denied':
        return <Badge variant="destructive">Permission Denied</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* User Camera Preview */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="w-5 h-5" />
              Camera Preview
            </CardTitle>
            {getStatusBadge(deviceStatus.camera)}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video bg-secondary/50 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {deviceStatus.camera === 'denied' && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                <div className="text-center p-4">
                  <VideoOff className="w-12 h-12 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive font-medium">Camera access denied</p>
                  <p className="text-xs text-muted-foreground mt-1">Please allow camera access in your browser settings</p>
                </div>
              </div>
            )}
            {deviceStatus.camera === 'checking' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Device Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Microphone Status */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {deviceStatus.microphone === 'ready' ? (
                <Mic className="w-5 h-5 text-success" />
              ) : deviceStatus.microphone === 'denied' ? (
                <MicOff className="w-5 h-5 text-destructive" />
              ) : (
                <Mic className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">Microphone</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(deviceStatus.microphone)}
                  <span className="text-xs text-muted-foreground capitalize">
                    {deviceStatus.microphone}
                  </span>
                </div>
              </div>
            </div>
            {deviceStatus.microphone === 'ready' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Audio level</span>
                </div>
                <Progress value={audioLevel} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {deviceStatus.network === 'good' ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : deviceStatus.network === 'slow' ? (
                <Wifi className="w-5 h-5 text-warning" />
              ) : deviceStatus.network === 'error' ? (
                <WifiOff className="w-5 h-5 text-destructive" />
              ) : (
                <Wifi className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">Network</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(deviceStatus.network)}
                  <span className="text-xs text-muted-foreground capitalize">
                    {deviceStatus.network === 'good' && 'Excellent'}
                    {deviceStatus.network === 'slow' && 'Acceptable'}
                    {deviceStatus.network === 'checking' && 'Testing...'}
                    {deviceStatus.network === 'error' && 'Poor'}
                  </span>
                </div>
                {networkSpeed !== null && deviceStatus.network !== 'checking' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(networkSpeed)}ms latency
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={startDeviceTests}
          disabled={isTesting}
          className="flex-1"
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Retest
        </Button>
        <Button
          variant="hero"
          onClick={handleContinue}
          disabled={!allTestsPassed || !stream}
          className="flex-1"
        >
          {allTestsPassed ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          )}
        </Button>
      </div>

      {/* Permissions Warning */}
      {(deviceStatus.camera === 'denied' || deviceStatus.microphone === 'denied') && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Permissions Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Camera and microphone access are required for the interview. Please allow access in your browser settings and click "Retest".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PreInterviewSetup;
