import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  FileText, 
  Mic, 
  History, 
  User, 
  LogOut, 
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Calendar,
  Menu,
  X,
  MessageSquare,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      // Fetch all interviews
      const { data: interviewsData } = await supabase
        .from("interviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (interviewsData) {
        setInterviews(interviewsData as Interview[]);
        
        // Fetch evaluations
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

          // Fetch improvement suggestions
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

  const selectedEval = selectedInterview ? evaluations[selectedInterview] : null;
  const selectedInterviewData = interviews.find(i => i.id === selectedInterview);
  const selectedImprovements = selectedInterview ? improvements[selectedInterview] : null;

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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
          >
            <History className="w-5 h-5" />
            History
          </Link>
          <Link 
            to="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <User className="w-5 h-5" />
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
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
              <User className="w-5 h-5" />
              Profile
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
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Interview list */}
              <div className="lg:col-span-1 space-y-2 sm:space-y-3">
                {interviews.map((interview) => (
                  <Card 
                    key={interview.id}
                    className={`border-border/50 cursor-pointer transition-all hover:shadow-md ${
                      selectedInterview === interview.id ? "ring-2 ring-accent" : ""
                    }`}
                    onClick={() => setSelectedInterview(interview.id)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm sm:text-base">
                              {interview.duration} Min Interview
                            </p>
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(interview.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                            {interview.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detail panel */}
              <div className="lg:col-span-2">{selectedInterview ? (
                  <Card className="border-border/50">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">Interview Details</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {selectedInterviewData && new Date(selectedInterviewData.created_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                      {/* Interview info */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-secondary/50 text-center">
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-accent mx-auto mb-1 sm:mb-2" />
                          <p className="text-lg sm:text-2xl font-bold text-foreground">
                            {selectedInterviewData?.duration}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Minutes</p>
                        </div>
                        <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-secondary/50 text-center">
                          <Award className="w-5 h-5 sm:w-6 sm:h-6 text-accent mx-auto mb-1 sm:mb-2" />
                          <p className="text-lg sm:text-2xl font-bold text-foreground">
                            {selectedEval?.overall_score || "--"}%
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Overall</p>
                        </div>
                        <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-secondary/50 text-center">
                          <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(selectedInterviewData?.status || "")}`}>
                            {selectedInterviewData?.status}
                          </span>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Status</p>
                        </div>
                      </div>

                      {/* Scores breakdown - Enhanced */}
                      {selectedEval && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-foreground">Score Breakdown</h4>
                          <div className="space-y-4">
                            {[
                              { label: "Communication", score: selectedEval.communication_score, icon: <MessageSquare className="w-4 h-4" />, desc: "Clarity and articulation" },
                              { label: "Technical", score: selectedEval.technical_score, icon: <Brain className="w-4 h-4" />, desc: "Accuracy and depth" },
                              { label: "Confidence", score: selectedEval.confidence_score, icon: <Zap className="w-4 h-4" />, desc: "Presence and composure" },
                            ].map((item) => (
                              <div key={item.label} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-accent">
                                      {item.icon}
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                  </div>
                                  <span className={`text-lg font-bold ${
                                    (item.score || 0) >= 70 ? 'text-success' : 
                                    (item.score || 0) >= 50 ? 'text-warning' : 'text-destructive'
                                  }`}>
                                    {item.score || 0}%
                                  </span>
                                </div>
                                <Progress value={item.score || 0} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback - Enhanced with structured parsing */}
                      {selectedEval?.feedback && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-foreground">Detailed Feedback</h4>
                          <FeedbackDisplay feedback={selectedEval.feedback} overallScore={selectedEval.overall_score || 0} />
                        </div>
                      )}

                      {/* Improvements - Enhanced */}
                      {selectedImprovements && selectedImprovements.length > 0 && (
                        <div>
                          <h4 className="font-medium text-foreground mb-3">Areas for Improvement</h4>
                          <div className="space-y-3">
                            {selectedImprovements.sort((a, b) => (a.priority || 3) - (b.priority || 3)).map((imp, idx) => (
                              <div key={imp.id} className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-accent font-semibold text-sm">{idx + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {imp.category || 'general'}
                                    </Badge>
                                    {imp.priority && imp.priority <= 2 && (
                                      <Badge variant="destructive" className="text-xs">High Priority</Badge>
                                    )}
                                  </div>
                                  <p className="text-foreground text-sm">{imp.suggestion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!selectedEval && selectedInterviewData?.status === "completed" && (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
                          <p className="text-muted-foreground">
                            Evaluation not available for this interview
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Select an interview to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Helper component to display structured feedback
const FeedbackDisplay = ({ feedback, overallScore }: { feedback: string; overallScore: number }) => {
  const parts = parseFeedback(feedback);
  
  return (
    <div className="space-y-4">
      {/* Verdict */}
      {parts.verdict && (
        <div className={`p-4 rounded-xl ${overallScore >= 60 ? 'bg-success/5 border border-success/20' : 'bg-destructive/5 border border-destructive/20'}`}>
          <h5 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
            {overallScore >= 60 ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
            Verdict
          </h5>
          <p className="text-sm text-muted-foreground">{parts.verdict}</p>
        </div>
      )}

      {/* Weaknesses */}
      {parts.weaknesses.length > 0 && (
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
          <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Critical Weaknesses
          </h5>
          <ul className="space-y-2">
            {parts.weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-warning mt-0.5">•</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Scores */}
      {parts.detailedScores.length > 0 && (
        <div className="p-4 rounded-xl bg-secondary/50">
          <h5 className="font-semibold text-foreground mb-2 text-sm">Score Details</h5>
          <div className="space-y-1">
            {parts.detailedScores.map((score, idx) => (
              <p key={idx} className="text-xs text-muted-foreground">{score}</p>
            ))}
          </div>
        </div>
      )}

      {/* Fallback for unparsed feedback */}
      {!parts.verdict && !parts.weaknesses.length && (
        <div className="p-4 rounded-xl bg-secondary/50 whitespace-pre-wrap">
          <p className="text-sm text-muted-foreground">{feedback}</p>
        </div>
      )}
    </div>
  );
};

// Parse feedback string into structured parts
function parseFeedback(feedback: string): {
  verdict: string;
  weaknesses: string[];
  detailedScores: string[];
} {
  const result = {
    verdict: '',
    weaknesses: [] as string[],
    detailedScores: [] as string[]
  };

  const lines = feedback.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('**Verdict:**')) {
      result.verdict = trimmed.replace('**Verdict:**', '').trim();
      currentSection = 'verdict';
    } else if (trimmed.includes('Critical Weaknesses:') || trimmed.includes('**Critical Weaknesses:**')) {
      currentSection = 'weaknesses';
    } else if (trimmed.includes('Detailed Scores:') || trimmed.includes('**Detailed Scores:**')) {
      currentSection = 'scores';
    } else if (trimmed.startsWith('-')) {
      const content = trimmed.substring(1).trim();
      if (currentSection === 'weaknesses') {
        result.weaknesses.push(content);
      } else if (currentSection === 'scores') {
        result.detailedScores.push(content);
      }
    }
  }

  return result;
}

export default InterviewHistory;
