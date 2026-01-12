import { useState, useEffect } from "react";
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
  ChevronRight,
  Clock,
  Award,
  TrendingUp,
  Plus,
  Menu,
  X
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface Interview {
  id: string;
  duration: string;
  status: string;
  created_at: string;
}

interface Evaluation {
  id: string;
  overall_score: number | null;
  interview_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [completedInterviews, setCompletedInterviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch total interview count (not limited)
      const { count: totalCount } = await supabase
        .from("interviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      
      setTotalInterviews(totalCount || 0);

      // Fetch completed interview count
      const { count: completedCount } = await supabase
        .from("interviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");
      
      setCompletedInterviews(completedCount || 0);

      // Fetch recent 5 interviews for display
      const { data: interviewsData } = await supabase
        .from("interviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (interviewsData) {
        setInterviews(interviewsData as Interview[]);
      }

      // Fetch evaluations
      const { data: evaluationsData } = await supabase
        .from("evaluations")
        .select("*")
        .eq("user_id", userId);
      
      if (evaluationsData) {
        setEvaluations(evaluationsData as Evaluation[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const averageScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((acc, e) => acc + (e.overall_score || 0), 0) / evaluations.length)
    : 0;

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
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
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
          {/* Welcome section */}
          <div className="mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Ready to practice your interview skills?
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Total Interviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-foreground">{totalInterviews}</span>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-foreground">{completedInterviews}</span>
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Average Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-foreground">{averageScore}%</span>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
            <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate("/interview")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-1">Start New Interview</h3>
                    <p className="text-muted-foreground">Begin a timed mock interview session</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate("/resume")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-1">Upload Resume</h3>
                    <p className="text-muted-foreground">Get personalized interview questions</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent interviews */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Interviews</CardTitle>
                  <CardDescription>Your latest practice sessions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">No interviews yet</p>
                  <Button variant="hero" onClick={() => navigate("/interview")}>
                    Start Your First Interview
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div 
                      key={interview.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {interview.duration} Minute Interview
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(interview.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        interview.status === "completed" 
                          ? "bg-success/10 text-success"
                          : interview.status === "in_progress"
                          ? "bg-warning/10 text-warning"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {interview.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
