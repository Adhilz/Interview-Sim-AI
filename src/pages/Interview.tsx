import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Video,
  VideoOff,
  Clock,
  Play,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import InterviewRoom from "@/components/interview/InterviewRoom";
import PreInterviewSetup from "@/components/interview/PreInterviewSetup";
import EvaluationDisplay from "@/components/interview/EvaluationDisplay";
import InterviewModeSelector, { InterviewMode } from "@/components/interview/InterviewModeSelector";
import StudentSidebar from "@/components/StudentSidebar";

// types and interfaces
type InterviewDuration = "3" | "5";
type InterviewStatus = "mode_select" | "setup" | "ready" | "connecting" | "in_progress" | "evaluating" | "completed";

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
  const [status, setStatus] = useState<InterviewStatus>("mode_select");
  const [selectedMode, setSelectedMode] = useState<InterviewMode | null>(null);
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

  // fetchResumeHighlights, fetchVapiConfig, timer effect, stopMedia, requestPermissions, toggleMic, toggleVideo, startInterview, endInterview, handleVapiCallStart, handleTranscriptUpdate
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
    if (!user || !selectedMode) return;

    setStatus("connecting");
    setVapiError(null);
    setInterviewTranscript('');

    try {
      const { data: interview, error: interviewError } = await supabase
        .from("interviews")
        .insert({
          user_id: user.id,
          duration: duration,
          status: "in_progress",
          started_at: new Date().toISOString(),
          interview_mode: selectedMode,
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      setInterviewId(interview.id);

      const { data: startData, error: startError } = await supabase.functions.invoke('vapi-interview', {
        body: { 
          action: 'start', 
          interviewId: interview.id,
          interviewMode: selectedMode,
          resumeHighlights: selectedMode === 'resume_jd' && resumeHighlights ? {
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

      stopMedia();

      setTimeRemaining(parseInt(duration) * 60);

      toast({
        title: "Interview starting!",
        description: `Connecting to ${selectedMode === 'technical' ? 'Technical' : selectedMode === 'hr' ? 'HR Behavioral' : 'Resume + JD'} interview...`,
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

    const finalTranscript = transcript || interviewTranscript;
    console.log('[Interview] endInterview called with transcript length:', finalTranscript?.length || 0);
    console.log('[Interview] Transcript preview:', finalTranscript?.substring(0, 500));

    try {
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", interviewId);

      const { data: evalData, error: evalError } = await supabase.functions.invoke('evaluate-interview', {
        body: {
          interviewId,
          userId: user?.id,
          interviewMode: selectedMode,
          transcript: finalTranscript || undefined,
          candidateProfile: selectedMode === 'resume_jd' && resumeHighlights ? {
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
        setEvaluationData(evalData.evaluation);
        
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

  const resumeContext = resumeHighlights 
    ? `Skills: ${resumeHighlights.skills?.join(', ') || 'Not specified'}\nTools: ${resumeHighlights.tools?.join(', ') || 'Not specified'}\nSummary: ${resumeHighlights.summary || 'Not provided'}`
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
      <StudentSidebar onLogout={handleLogout} />

      {/* Main content */}
      <main className="lg:ml-64 pt-20 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-10">
          {/* Show evaluation if completed */}
          {status === "completed" && evaluationData && (
            <EvaluationDisplay
              evaluation={evaluationData}
              improvements={improvementSuggestions}
              onStartNewInterview={() => {
                setStatus("mode_select");
                setEvaluationData(null);
                setImprovementSuggestions([]);
                setInterviewId(null);
                setSessionData(null);
              }}
            />
          )}

          {status === "evaluating" && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-accent/20 flex items-center justify-center mx-auto">
                    <Loader2 className="w-12 h-12 animate-spin text-accent" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Analyzing Your Interview</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Our AI is evaluating your responses across multiple dimensions...
                </p>
              </div>
            </div>
          )}

          {/* Mode selection */}
          {status === "mode_select" && !evaluationData && (
            <div>
              <div className="mb-6 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">New Interview</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Choose your interview mode to get started</p>
              </div>
              <InterviewModeSelector
                selectedMode={selectedMode}
                onModeSelect={(mode) => setSelectedMode(mode)}
                onContinue={() => setStatus("setup")}
                hasResume={!!resumeHighlights}
              />
            </div>
          )}

          {/* Pre-interview setup */}
          {(status === "setup" || status === "ready") && selectedMode && (
            <div>
              <div className="mb-6">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    stopMedia();
                    setStatus("mode_select");
                    setSelectedMode(null);
                  }}
                  className="mb-4"
                >
                  ← Back to mode selection
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {selectedMode === 'technical' ? 'Technical' : selectedMode === 'hr' ? 'HR Behavioral' : 'Resume + JD'} Interview
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Complete the setup to start your interview
                </p>
              </div>

              <PreInterviewSetup
                onReady={handlePreInterviewReady}
                interviewMode={selectedMode}
              />

              {status === "ready" && (
                <Card className="mt-6 border-border/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">Ready to begin!</h3>
                        <p className="text-muted-foreground text-sm">
                          Duration: {duration} minutes • Mode: {selectedMode === 'technical' ? 'Technical' : selectedMode === 'hr' ? 'HR Behavioral' : 'Resume + JD'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value as InterviewDuration)}
                          className="h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        >
                          <option value="3">3 minutes</option>
                          <option value="5">5 minutes</option>
                        </select>
                        <Button
                          variant="hero"
                          size="lg"
                          onClick={startInterview}
                          disabled={isLoadingConfig || !!vapiError}
                          className="min-w-[160px]"
                        >
                          {isLoadingConfig ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-5 h-5 mr-2" />
                              Start Interview
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {vapiError && (
                      <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{vapiError}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Interview;
