import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  History, 
  TrendingUp,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Calendar,
  MessageSquare,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mic,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import StudentSidebar from "@/components/StudentSidebar";

interface Interview {
  id: string;
  duration: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

interface Evaluation {
  id: string;
  interview_id: string;
  overall_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  confidence_score: number | null;
  feedback: string | null;
}

interface Improvement {
  id: string;
  suggestion: string;
  category: string | null;
  priority: number | null;
}

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [improvements, setImprovements] = useState<Record<string, Improvement[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState<string | null>(null);

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
        fetchData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: interviewsData } = await supabase
        .from("interviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (interviewsData) {
        setInterviews(interviewsData as Interview[]);
        
        const { data: evaluationsData } = await supabase
          .from("evaluations")
          .select("*")
          .eq("user_id", userId);
        
        if (evaluationsData) {
          const evalMap: Record<string, Evaluation> = {};
          const evalIds: string[] = [];
          evaluationsData.forEach((e) => {
            evalMap[e.interview_id] = e as Evaluation;
            evalIds.push(e.id);
          });
          setEvaluations(evalMap);

          if (evalIds.length > 0) {
            const { data: improvementsData } = await supabase
              .from("improvement_suggestions")
              .select("*")
              .in("evaluation_id", evalIds);
            
            if (improvementsData) {
              const impMap: Record<string, Improvement[]> = {};
              evaluationsData.forEach((e) => {
                const relatedImps = improvementsData.filter(
                  (imp) => imp.evaluation_id === e.id
                );
                if (relatedImps.length > 0) {
                  impMap[e.interview_id] = relatedImps as Improvement[];
                }
              });
              setImprovements(impMap);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success";
      case "in_progress": return "bg-warning/10 text-warning";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const toggleExpanded = (interviewId: string) => {
    setExpandedInterview(expandedInterview === interviewId ? null : interviewId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
            <Brain className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar onLogout={handleLogout} />

      {/* Main content */}
      <main className="lg:ml-64 pt-20 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Interview History</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Review your past interviews and evaluations
            </p>
          </div>

          {interviews.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No interviews yet</p>
                <Button variant="hero" onClick={() => navigate("/interview")}>
                  Start Your First Interview
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{interviews.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-success">{interviews.filter(i => i.status === 'completed').length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      {Object.values(evaluations).length > 0 
                        ? Math.round(Object.values(evaluations).reduce((acc, e) => acc + (e.overall_score || 0), 0) / Object.values(evaluations).length)
                        : '--'}%
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Avg Score</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      {interviews.reduce((acc, i) => acc + parseInt(i.duration || '0'), 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Mins</p>
                  </CardContent>
                </Card>
              </div>

              {/* Interview Cards */}
              <div className="space-y-3">
                {interviews.map((interview, index) => {
                  const evaluation = evaluations[interview.id];
                  const interviewImprovements = improvements[interview.id];
                  const isExpanded = expandedInterview === interview.id;
                  
                  return (
                    <Collapsible 
                      key={interview.id} 
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(interview.id)}
                    >
                      <Card className={`border-border/50 transition-all ${isExpanded ? 'ring-2 ring-accent shadow-lg' : 'hover:shadow-md'}`}>
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-4 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-accent font-bold text-sm sm:text-base">#{interviews.length - index}</span>
                                </div>
                                
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-foreground text-sm sm:text-base">
                                      {interview.duration} Min Interview
                                    </p>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                                      {getStatusIcon(interview.status)}
                                      <span className="hidden sm:inline">{interview.status}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(interview.created_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}</span>
                                    {interview.started_at && (
                                      <>
                                        <span className="hidden sm:inline">•</span>
                                        <Clock className="w-3 h-3 hidden sm:block" />
                                        <span className="hidden sm:inline">
                                          {new Date(interview.started_at).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {evaluation && (
                                  <div className="hidden sm:flex items-center gap-2">
                                    <div className={`text-lg font-bold ${
                                      (evaluation.overall_score || 0) >= 70 ? 'text-success' :
                                      (evaluation.overall_score || 0) >= 40 ? 'text-warning' : 'text-destructive'
                                    }`}>
                                      {evaluation.overall_score || 0}%
                                    </div>
                                  </div>
                                )}
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t border-border pt-4">
                            {evaluation ? (
                              <div className="space-y-6">
                                {/* Score Overview */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                                    <p className="text-2xl font-bold text-foreground">{evaluation.overall_score || 0}%</p>
                                    <p className="text-xs text-muted-foreground">Overall</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                                    <p className="text-2xl font-bold text-foreground">{evaluation.technical_score || 0}%</p>
                                    <p className="text-xs text-muted-foreground">Technical</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                                    <p className="text-2xl font-bold text-foreground">{evaluation.communication_score || 0}%</p>
                                    <p className="text-xs text-muted-foreground">Communication</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                                    <p className="text-2xl font-bold text-foreground">{evaluation.confidence_score || 0}%</p>
                                    <p className="text-xs text-muted-foreground">Confidence</p>
                                  </div>
                                </div>

                                {/* Feedback */}
                                {evaluation.feedback && (
                                  <div>
                                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4 text-accent" />
                                      AI Feedback
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-lg">
                                      {evaluation.feedback}
                                    </p>
                                  </div>
                                )}

                                {/* Improvements */}
                                {interviewImprovements && interviewImprovements.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-accent" />
                                      Improvement Areas
                                    </h4>
                                    <div className="space-y-2">
                                      {interviewImprovements.map((imp) => (
                                        <div key={imp.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-sm text-foreground">{imp.suggestion}</p>
                                            {imp.category && (
                                              <Badge variant="secondary" className="mt-1 text-xs">
                                                {imp.category}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-muted-foreground text-sm">
                                  {interview.status === 'completed' 
                                    ? 'Evaluation not available for this interview' 
                                    : 'Interview was not completed'}
                                </p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InterviewHistory;
