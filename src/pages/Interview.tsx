import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  FileText, 
  Mic, 
  MicOff,
  History, 
  User as UserIcon, 
  LogOut, 
  Video,
  VideoOff,
  Clock,
  Play,
  Square,
  TrendingUp,
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

type InterviewDuration = "3" | "5";
type InterviewStatus = "setup" | "ready" | "connecting" | "in_progress" | "evaluating" | "completed";

interface ResumeHighlights {
  skills: string[] | null;
  tools: string[] | null;
  summary: string | null;
}

const Interview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<InterviewStatus>("setup");
  const [duration, setDuration] = useState<InterviewDuration>("3");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vapiWebCallUrl, setVapiWebCallUrl] = useState<string | null>(null);
  const [resumeHighlights, setResumeHighlights] = useState<ResumeHighlights | null>(null);
  const [vapiError, setVapiError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/login");
      } else {
        // Fetch resume highlights
        fetchResumeHighlights(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopMedia();
    };
  }, [navigate]);

  const fetchResumeHighlights = async (userId: string) => {
    try {
      const { data: resume } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (resume) {
        const { data: highlights } = await supabase
          .from('resume_highlights')
          .select('skills, tools, summary')
          .eq('resume_id', resume.id)
          .single();

        if (highlights) {
          setResumeHighlights(highlights);
        }
      }
    } catch (error) {
      // No resume/highlights found
    }
  };

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "in_progress" && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            endInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeRemaining]);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsMicOn(true);
      setIsVideoOn(true);
      setStatus("ready");
      setVapiError(null);
      
      toast({
        title: "Permissions granted",
        description: "Camera and microphone are ready.",
      });
    } catch (error) {
      toast({
        title: "Permission denied",
        description: "Please allow camera and microphone access to continue.",
        variant: "destructive",
      });
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
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

  const startInterview = async () => {
    if (!user) return;

    setStatus("connecting");
    setVapiError(null);

    try {
      // Create interview record
      const { data: interview, error: interviewError } = await supabase
        .from("interviews")
        .insert({
          user_id: user.id,
          duration: duration,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      setInterviewId(interview.id);

      // Start VAPI session
      const { data: vapiData, error: vapiError } = await supabase.functions.invoke('vapi-interview', {
        body: {
          action: 'start',
          interviewId: interview.id,
          resumeHighlights,
        },
      });

      if (vapiError) {
        throw new Error(vapiError.message || 'Failed to start VAPI session');
      }

      if (vapiData?.error) {
        // Handle VAPI configuration errors
        setVapiError(vapiData.error);
        if (vapiData.instructions) {
          toast({
            title: "VAPI Setup Required",
            description: vapiData.instructions,
            variant: "destructive",
          });
        }
        // Still allow interview to proceed without VAPI
        setTimeRemaining(parseInt(duration) * 60);
        setStatus("in_progress");
        return;
      }

      if (vapiData?.sessionId) {
        setSessionId(vapiData.sessionId);
      }

      if (vapiData?.webCallUrl) {
        setVapiWebCallUrl(vapiData.webCallUrl);
      }

      setTimeRemaining(parseInt(duration) * 60);
      setStatus("in_progress");

      toast({
        title: "Interview started!",
        description: `You have ${duration} minutes. Good luck!`,
      });
    } catch (error: any) {
      console.error('Start interview error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start interview.",
        variant: "destructive",
      });
      setStatus("ready");
    }
  };

  const endInterview = async () => {
    if (!interviewId) return;

    setStatus("evaluating");

    try {
      // End VAPI session if active
      if (sessionId) {
        await supabase.functions.invoke('vapi-interview', {
          body: {
            action: 'end',
            sessionId,
          },
        });
      }

      // Update interview status
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", interviewId);

      // Trigger evaluation
      const { data: evalData, error: evalError } = await supabase.functions.invoke('evaluate-interview', {
        body: {
          interviewId,
          userId: user?.id,
        },
      });

      if (evalError) {
        console.error('Evaluation error:', evalError);
      }

      stopMedia();
      setStatus("completed");

      toast({
        title: "Interview completed!",
        description: "Your evaluation is ready.",
      });
    } catch (error) {
      console.error("Error ending interview:", error);
      setStatus("completed");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogout = async () => {
    stopMedia();
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">InterviewSim</span>
        </Link>

        <nav className="flex-1 space-y-2">
          <Link 
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/interview"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
          >
            <Mic className="w-5 h-5" />
            New Interview
          </Link>
          <Link 
            to="/resume"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <FileText className="w-5 h-5" />
            Resume
          </Link>
          <Link 
            to="/history"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <History className="w-5 h-5" />
            History
          </Link>
          <Link 
            to="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <UserIcon className="w-5 h-5" />
            Profile
          </Link>
        </nav>

        <Button variant="ghost" onClick={handleLogout} className="justify-start gap-3 text-muted-foreground hover:text-destructive">
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">InterviewSim</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 pt-20 lg:pt-0">
        <div className="p-6 lg:p-10">
          {/* Timer bar during interview */}
          {status === "in_progress" && (
            <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-card border-b border-border p-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <span className="text-muted-foreground">Interview in progress</span>
                <div className={`flex items-center gap-2 ${timeRemaining < 60 ? "text-destructive timer-pulse" : "text-foreground"}`}>
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold font-mono">{formatTime(timeRemaining)}</span>
                </div>
                <Button variant="destructive" size="sm" onClick={endInterview}>
                  <Square className="w-4 h-4 mr-2" />
                  End Interview
                </Button>
              </div>
            </div>
          )}

          <div className={`${status === "in_progress" ? "pt-20" : ""}`}>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {status === "setup" ? "Setup Interview" : 
                 status === "ready" ? "Ready to Start" :
                 status === "connecting" ? "Connecting..." :
                 status === "in_progress" ? "Live Interview" :
                 status === "evaluating" ? "Generating Evaluation..." : "Interview Complete"}
              </h1>
              <p className="text-muted-foreground">
                {status === "setup" ? "Configure your interview session" :
                 status === "ready" ? "Click start when you're ready" :
                 status === "connecting" ? "Setting up your AI interviewer..." :
                 status === "in_progress" ? "Your AI interviewer is listening" :
                 status === "evaluating" ? "Analyzing your performance..." : "Great job! Review your performance."}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Video/Avatar panel */}
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-video bg-navy-900 relative">
                    {(status === "in_progress" || status === "ready" || status === "connecting") ? (
                      <>
                        {/* AI Avatar placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`w-24 h-24 rounded-full gradient-accent flex items-center justify-center mx-auto mb-4 ${status === "in_progress" ? "animate-pulse-slow" : ""}`}>
                              {status === "connecting" ? (
                                <Loader2 className="w-12 h-12 text-accent-foreground animate-spin" />
                              ) : (
                                <Brain className="w-12 h-12 text-accent-foreground" />
                              )}
                            </div>
                            <p className="text-primary-foreground/80 text-lg">AI Interviewer</p>
                            {status === "in_progress" && (
                              <p className="text-primary-foreground/60 text-sm mt-2">Listening...</p>
                            )}
                            {status === "connecting" && (
                              <p className="text-primary-foreground/60 text-sm mt-2">Connecting to VAPI...</p>
                            )}
                          </div>
                        </div>

                        {/* User video preview */}
                        <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-primary-foreground/20">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
                          />
                          {!isVideoOn && (
                            <div className="w-full h-full bg-navy-800 flex items-center justify-center">
                              <VideoOff className="w-6 h-6 text-primary-foreground/50" />
                            </div>
                          )}
                        </div>
                      </>
                    ) : status === "completed" || status === "evaluating" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          {status === "evaluating" ? (
                            <>
                              <Loader2 className="w-20 h-20 text-accent mx-auto mb-4 animate-spin" />
                              <p className="text-primary-foreground text-xl font-medium mb-2">Analyzing...</p>
                              <p className="text-primary-foreground/60">Please wait while we evaluate your performance</p>
                            </>
                          ) : (
                            <>
                              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-10 h-10 text-success" />
                              </div>
                              <p className="text-primary-foreground text-xl font-medium mb-2">Interview Complete</p>
                              <p className="text-primary-foreground/60">Check your history for results</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                            <Video className="w-10 h-10 text-primary-foreground/50" />
                          </div>
                          <p className="text-primary-foreground/60">Video preview will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Controls panel */}
              <div className="space-y-6">
                {status === "setup" && (
                  <>
                    {/* Resume status */}
                    {!resumeHighlights && (
                      <Card className="border-warning/50 bg-warning/5">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">No resume uploaded</p>
                              <p className="text-xs text-muted-foreground">
                                Upload a resume for personalized questions.{" "}
                                <Link to="/resume" className="text-accent hover:underline">
                                  Upload now →
                                </Link>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {resumeHighlights && (
                      <Card className="border-success/50 bg-success/5">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-success flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Resume ready</p>
                              <p className="text-xs text-muted-foreground">
                                Questions will be based on your background
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Duration selection */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Interview Duration</CardTitle>
                        <CardDescription>Choose your session length</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => setDuration("3")}
                            className={`p-6 rounded-xl border-2 transition-all ${
                              duration === "3"
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/50"
                            }`}
                          >
                            <Clock className={`w-8 h-8 mx-auto mb-2 ${duration === "3" ? "text-accent" : "text-muted-foreground"}`} />
                            <p className={`text-2xl font-bold ${duration === "3" ? "text-foreground" : "text-muted-foreground"}`}>3 min</p>
                            <p className="text-sm text-muted-foreground">Quick practice</p>
                          </button>
                          <button
                            onClick={() => setDuration("5")}
                            className={`p-6 rounded-xl border-2 transition-all ${
                              duration === "5"
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/50"
                            }`}
                          >
                            <Clock className={`w-8 h-8 mx-auto mb-2 ${duration === "5" ? "text-accent" : "text-muted-foreground"}`} />
                            <p className={`text-2xl font-bold ${duration === "5" ? "text-foreground" : "text-muted-foreground"}`}>5 min</p>
                            <p className="text-sm text-muted-foreground">Full session</p>
                          </button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Permissions */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Permissions Required</CardTitle>
                        <CardDescription>Allow access to continue</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-warning/10 border border-warning/20 mb-4">
                          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                          <p className="text-sm text-foreground">
                            Camera and microphone access is required for the interview
                          </p>
                        </div>
                        <Button variant="hero" className="w-full" onClick={requestPermissions}>
                          <Video className="w-4 h-4 mr-2" />
                          Enable Camera & Mic
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}

                {(status === "ready" || status === "in_progress" || status === "connecting") && (
                  <>
                    {/* VAPI Error display */}
                    {vapiError && (
                      <Card className="border-warning/50 bg-warning/5">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-foreground">VAPI Configuration Issue</p>
                              <p className="text-xs text-muted-foreground mt-1">{vapiError}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Interview will continue without voice AI. Check your VAPI settings.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* VAPI Web Call Link */}
                    {vapiWebCallUrl && status === "in_progress" && (
                      <Card className="border-accent/50 bg-accent/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Voice Interview Active</p>
                              <p className="text-xs text-muted-foreground">Click to join the voice call</p>
                            </div>
                            <a
                              href={vapiWebCallUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90"
                            >
                              <Mic className="w-4 h-4" />
                              Join Call
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Media controls */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Controls</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            variant={isMicOn ? "default" : "destructive"}
                            size="lg"
                            className="w-16 h-16 rounded-full"
                            onClick={toggleMic}
                          >
                            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                          </Button>
                          <Button
                            variant={isVideoOn ? "default" : "destructive"}
                            size="lg"
                            className="w-16 h-16 rounded-full"
                            onClick={toggleVideo}
                          >
                            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {status === "ready" && (
                      <Button variant="hero" size="xl" className="w-full" onClick={startInterview}>
                        <Play className="w-5 h-5 mr-2" />
                        Start Interview
                      </Button>
                    )}

                    {status === "connecting" && (
                      <Button variant="hero" size="xl" className="w-full" disabled>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Connecting...
                      </Button>
                    )}
                  </>
                )}

                {status === "completed" && (
                  <Card className="border-border/50">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground mb-4">
                        Your interview has been recorded. View your evaluation in the history section.
                      </p>
                      <div className="flex gap-4">
                        <Button variant="outline" className="flex-1" onClick={() => navigate("/history")}>
                          View History
                        </Button>
                        <Button variant="hero" className="flex-1" onClick={() => {
                          setStatus("setup");
                          setInterviewId(null);
                          setSessionId(null);
                          setVapiWebCallUrl(null);
                          setVapiError(null);
                        }}>
                          New Interview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {status === "evaluating" && (
                  <Card className="border-border/50">
                    <CardContent className="p-6 text-center">
                      <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-accent" />
                      <p className="text-muted-foreground">
                        Analyzing your interview performance...
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Interview;
