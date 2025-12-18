import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar
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

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<string | null>(null);

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
          evaluationsData.forEach((e) => {
            evalMap[e.interview_id] = e as Evaluation;
          });
          setEvaluations(evalMap);
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
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 pt-20 lg:pt-0">
        <div className="p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Interview History</h1>
            <p className="text-muted-foreground">
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
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Interview list */}
              <div className="lg:col-span-1 space-y-3">
                {interviews.map((interview) => (
                  <Card 
                    key={interview.id}
                    className={`border-border/50 cursor-pointer transition-all hover:shadow-md ${
                      selectedInterview === interview.id ? "ring-2 ring-accent" : ""
                    }`}
                    onClick={() => setSelectedInterview(interview.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {interview.duration} Min Interview
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(interview.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                            {interview.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detail panel */}
              <div className="lg:col-span-2">
                {selectedInterview ? (
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle>Interview Details</CardTitle>
                      <CardDescription>
                        {selectedInterviewData && new Date(selectedInterviewData.created_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Interview info */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-secondary/50 text-center">
                          <Clock className="w-6 h-6 text-accent mx-auto mb-2" />
                          <p className="text-2xl font-bold text-foreground">
                            {selectedInterviewData?.duration}
                          </p>
                          <p className="text-sm text-muted-foreground">Minutes</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/50 text-center">
                          <Award className="w-6 h-6 text-accent mx-auto mb-2" />
                          <p className="text-2xl font-bold text-foreground">
                            {selectedEval?.overall_score || "--"}%
                          </p>
                          <p className="text-sm text-muted-foreground">Overall</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/50 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedInterviewData?.status || "")}`}>
                            {selectedInterviewData?.status}
                          </span>
                          <p className="text-sm text-muted-foreground mt-2">Status</p>
                        </div>
                      </div>

                      {/* Scores breakdown */}
                      {selectedEval && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-foreground">Score Breakdown</h4>
                          <div className="space-y-3">
                            {[
                              { label: "Communication", score: selectedEval.communication_score },
                              { label: "Technical", score: selectedEval.technical_score },
                              { label: "Confidence", score: selectedEval.confidence_score },
                            ].map((item) => (
                              <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="text-foreground font-medium">{item.score || 0}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-secondary">
                                  <div 
                                    className="h-full rounded-full gradient-accent transition-all duration-500"
                                    style={{ width: `${item.score || 0}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {selectedEval?.feedback && (
                        <div>
                          <h4 className="font-medium text-foreground mb-2">Feedback</h4>
                          <p className="text-muted-foreground bg-secondary/50 p-4 rounded-xl">
                            {selectedEval.feedback}
                          </p>
                        </div>
                      )}

                      {!selectedEval && selectedInterviewData?.status === "completed" && (
                        <div className="text-center py-8">
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

export default InterviewHistory;
