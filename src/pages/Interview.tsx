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
  History, 
  User as UserIcon, 
  LogOut, 
  Video,
  VideoOff,
  Clock,
  Play,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle,
  Menu,
  X,
  HelpCircle
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import InterviewRoom from "@/components/interview/InterviewRoom";
import PreInterviewSetup from "@/components/interview/PreInterviewSetup";
import EvaluationDisplay from "@/components/interview/EvaluationDisplay";

type InterviewDuration = "3" | "5";
type InterviewStatus = "setup" | "ready" | "connecting" | "in_progress" | "evaluating" | "completed";

interface ResumeHighlights {
  skills: string[] | null;
  tools: string[] | null;
  summary: string | null;
  projects?: any | null;
  experience?: any | null;
  name?: string | null;
}

interface SessionData {
  sessionId: string;
  firstMessage: string;
  assistantOverrides: any;
}

interface ResponseAnalysis {
  question: string;
  response: string;
  quality: "good" | "average" | "poor";
  strengths: string[];
  improvements: string[];
  score: number;
}

interface EvaluationData {
  id: string;
  overall_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  confidence_score: number | null;
  feedback: string | null;
  transcript?: string | null;
  response_analysis?: ResponseAnalysis[] | null;
}

interface ImprovementSuggestion {
  id: string;
  suggestion: string;
  category: string | null;
  priority: number | null;
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
  const [resumeHighlights, setResumeHighlights] = useState<ResumeHighlights | null>(null);
  const [vapiError, setVapiError] = useState<string | null>(null);
  const [vapiConfig, setVapiConfig] = useState<{ publicKey: string; assistantId: string } | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [interviewTranscript, setInterviewTranscript] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [interviewPreferences, setInterviewPreferences] = useState<string>('');
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [improvementSuggestions, setImprovementSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

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
        fetchResumeHighlights(session.user.id);
        fetchVapiConfig();
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
          .select('skills, tools, summary, projects, experience')
          .eq('resume_id', resume.id)
          .single();

        if (highlights) {
          // Also get the profile name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', userId)
            .single();
          
          setResumeHighlights({
            ...highlights,
            name: profile?.full_name || null
          });
        }
      }
    } catch (error) {
      // No resume/highlights found
    }
  };

  const fetchVapiConfig = async () => {
    try {
      setIsLoadingConfig(true);
      const { data, error } = await supabase.functions.invoke('vapi-interview', {
        body: { action: 'get_config' },
      });

      if (error) {
        console.error('Failed to fetch VAPI config:', error);
        setVapiError('Failed to load VAPI configuration');
        return;
      }

      if (data?.error) {
        console.error('VAPI config error:', data.error);
        setVapiError(data.instructions || data.error);
        return;
      }

      if (data?.publicKey && data?.assistantId) {
        setVapiConfig({
          publicKey: data.publicKey,
          assistantId: data.assistantId,
        });
      }
    } catch (error) {
      console.error('Error fetching VAPI config:', error);
      setVapiError('Failed to load VAPI configuration');
    } finally {
      setIsLoadingConfig(false);
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
    setInterviewTranscript('');

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

      // Start session via backend to get personalized first message
      const { data: startData, error: startError } = await supabase.functions.invoke('vapi-interview', {
        body: { 
          action: 'start', 
          interviewId: interview.id,
          resumeHighlights: resumeHighlights ? {
            ...resumeHighlights,
            name: resumeHighlights.name || user.user_metadata?.full_name || ''
          } : null,
          interviewerPreferences: interviewPreferences || undefined
        },
      });

      if (startError || startData?.error) {
        throw new Error(startData?.error || startError?.message || 'Failed to start session');
      }

      setSessionData({
        sessionId: startData.sessionId,
        firstMessage: startData.firstMessage,
        assistantOverrides: startData.assistantOverrides
      });

      // Stop the setup media stream since InterviewRoom will start its own
      stopMedia();

      setTimeRemaining(parseInt(duration) * 60);

      toast({
        title: "Interview starting!",
        description: `Connecting to AI interviewer...`,
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

  const endInterview = async (transcript?: string) => {
    if (!interviewId) return;

    setStatus("evaluating");
    setIsEvaluating(true);

    // Use provided transcript or fallback to accumulated state
    const finalTranscript = transcript || interviewTranscript;
    console.log('[Interview] endInterview called with transcript length:', finalTranscript?.length || 0);
    console.log('[Interview] Transcript preview:', finalTranscript?.substring(0, 500));

    try {
      // Update interview status
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", interviewId);

      // Trigger evaluation with transcript
      const { data: evalData, error: evalError } = await supabase.functions.invoke('evaluate-interview', {
        body: {
          interviewId,
          userId: user?.id,
          transcript: finalTranscript || undefined,
          candidateProfile: resumeHighlights ? {
            skills: resumeHighlights.skills || [],
            tools: resumeHighlights.tools || [],
            projects: resumeHighlights.projects || [],
            experience: resumeHighlights.experience || [],
            summary: resumeHighlights.summary || '',
            name: resumeHighlights.name || ''
          } : undefined
        },
      });

      if (evalError) {
        console.error('Evaluation error:', evalError);
        toast({
          title: "Evaluation issue",
          description: "There was an issue generating your evaluation.",
          variant: "destructive",
        });
      } else if (evalData?.evaluation) {
        // Set evaluation data for immediate display
        setEvaluationData(evalData.evaluation);
        
        // Fetch improvement suggestions
        const { data: improvementsData } = await supabase
          .from('improvement_suggestions')
          .select('*')
          .eq('evaluation_id', evalData.evaluation.id)
          .order('priority', { ascending: true });
        
        if (improvementsData) {
          setImprovementSuggestions(improvementsData);
        }
      }

      setStatus("completed");
      setIsEvaluating(false);

      toast({
        title: "Interview completed!",
        description: "Your evaluation is ready.",
      });
    } catch (error) {
      console.error("Error ending interview:", error);
      setIsEvaluating(false);
      setStatus("completed");
    }
  };

  const handleVapiCallStart = async (vapiCallId: string) => {
    if (sessionData?.sessionId && vapiCallId) {
      // Save VAPI call ID to the session
      await supabase
        .from('interview_sessions')
        .update({ vapi_session_id: vapiCallId })
        .eq('id', sessionData.sessionId);
    }
    setStatus("in_progress");
  };

  const handleTranscriptUpdate = (newTranscript: string) => {
    setInterviewTranscript(newTranscript);
  };

  const handleLogout = async () => {
    stopMedia();
    await supabase.auth.signOut();
    navigate("/");
  };

  // Handler when PreInterviewSetup completes all device tests
  const handlePreInterviewReady = (mediaStream: MediaStream, preferences?: string) => {
    streamRef.current = mediaStream;
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
    setIsMicOn(true);
    setIsVideoOn(true);
    if (preferences) {
      setInterviewPreferences(preferences);
    }
    setStatus("ready");
    toast({
      title: "All systems ready",
      description: "You can now start your interview.",
    });
  };

  // Build resume context for VAPI
  const resumeContext = resumeHighlights 
    ? `Skills: ${resumeHighlights.skills?.join(', ') || 'Not specified'}
Tools: ${resumeHighlights.tools?.join(', ') || 'Not specified'}
Summary: ${resumeHighlights.summary || 'Not provided'}`
    : '';

  // Show fullscreen interview room when in progress or connecting
  if (status === "in_progress" || status === "connecting") {
    if (!vapiConfig || !sessionData) {
      return (
        <div className="fixed inset-0 bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading interview configuration...</p>
            {vapiError && (
              <p className="text-destructive mt-2">{vapiError}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <InterviewRoom
        status={status}
        timeRemaining={timeRemaining}
        publicKey={vapiConfig.publicKey}
        assistantId={vapiConfig.assistantId}
        assistantOverrides={sessionData.assistantOverrides}
        sessionId={sessionData.sessionId}
        onEndInterview={endInterview}
        onVapiConnected={handleVapiCallStart}
        onVapiError={(error) => setVapiError(error)}
        onTranscriptUpdate={handleTranscriptUpdate}
      />
    );
  }

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
          <Link 
            to="/help"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            Help
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
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bottom-0 z-40 bg-card border-t border-border p-4">
          <nav className="space-y-2">
            <Link 
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrendingUp className="w-5 h-5" />
              Dashboard
            </Link>
            <Link 
              to="/interview"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Mic className="w-5 h-5" />
              New Interview
            </Link>
            <Link 
              to="/resume"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FileText className="w-5 h-5" />
              Resume
            </Link>
            <Link 
              to="/history"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <History className="w-5 h-5" />
              History
            </Link>
            <Link 
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <UserIcon className="w-5 h-5" />
              Profile
            </Link>
            <Link 
              to="/help"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <HelpCircle className="w-5 h-5" />
              Help
            </Link>
            <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-20 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {status === "setup" ? "Setup Interview" : 
               status === "ready" ? "Ready to Start" :
               status === "evaluating" ? "Generating Evaluation..." : "Interview Complete"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {status === "setup" ? "Configure your interview session" :
               status === "ready" ? "Click start when you're ready" :
               status === "evaluating" ? "Analyzing your performance..." : "Great job! Review your performance."}
            </p>
          </div>

          {/* Pre-Interview Setup - Device Tests & Avatar Preview */}
          {status === "setup" && (
            <div className="max-w-5xl">
              <PreInterviewSetup onReady={handlePreInterviewReady} />
              
              {/* Resume status card */}
              <div className="mt-6 grid lg:grid-cols-2 gap-4">
                {!resumeHighlights ? (
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
                ) : (
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
              </div>
            </div>
          )}

          {/* Ready state */}
          {status === "ready" && (
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 max-w-5xl">
            {/* Video preview panel */}
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-secondary/50 relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
                  />
                  {!isVideoOn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <VideoOff className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Controls panel */}
            <div className="space-y-6">
              {vapiError && (
                <Card className="border-warning/50 bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">VAPI Configuration Issue</p>
                        <p className="text-xs text-muted-foreground mt-1">{vapiError}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Media Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant={isMicOn ? "default" : "destructive"}
                      size="lg"
                      className="w-16 h-16 rounded-full"
                      onClick={toggleMic}
                    >
                      {isMicOn ? <Mic className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
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

              <Button variant="hero" size="xl" className="w-full" onClick={startInterview}>
                <Play className="w-5 h-5 mr-2" />
                Start Interview
              </Button>
            </div>
          </div>
          )}

          {/* Evaluating state */}
          {status === "evaluating" && (
            <div className="max-w-3xl mx-auto">
              <EvaluationDisplay
                evaluation={null}
                improvements={[]}
                isLoading={true}
                onStartNewInterview={() => {
                  setStatus("setup");
                  setInterviewId(null);
                  setVapiError(null);
                  setEvaluationData(null);
                  setImprovementSuggestions([]);
                }}
                onViewHistory={() => navigate("/history")}
              />
            </div>
          )}

          {/* Completed state - Show evaluation inline */}
          {status === "completed" && (
            <div className="max-w-4xl mx-auto">
              <EvaluationDisplay
                evaluation={evaluationData}
                improvements={improvementSuggestions}
                isLoading={isEvaluating}
                onStartNewInterview={() => {
                  setStatus("setup");
                  setInterviewId(null);
                  setVapiError(null);
                  setEvaluationData(null);
                  setImprovementSuggestions([]);
                }}
                onViewHistory={() => navigate("/history")}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Interview;
