import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Users, 
  Video, 
  Award, 
  TrendingUp, 
  LogOut,
  BarChart3,
  MessageSquare,
  Zap,
  Target
} from "lucide-react";
import { format } from "date-fns";

interface StudentInterview {
  id: string;
  student_name: string;
  student_email: string;
  interview_date: string;
  score: number | null;
  status: string;
}

interface SkillMetric {
  name: string;
  average: number;
  icon: React.ReactNode;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [completedInterviews, setCompletedInterviews] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [skillMetrics, setSkillMetrics] = useState<SkillMetric[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<StudentInterview[]>([]);

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/login");
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleData?.role !== 'admin') {
        navigate("/dashboard");
        return;
      }

      await fetchAnalytics();
      setIsLoading(false);
    };

    checkAdminAndFetchData();
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      // Get total students (users with student role)
      const { count: studentCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      
      setTotalStudents(studentCount || 0);

      // Get total interviews
      const { data: interviews, count: interviewCount } = await supabase
        .from('interviews')
        .select('*, profiles!inner(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      setTotalInterviews(interviewCount || 0);

      // Count completed interviews
      const completed = interviews?.filter(i => i.status === 'completed').length || 0;
      setCompletedInterviews(completed);

      // Get evaluations for score metrics
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('overall_score, technical_score, communication_score, confidence_score');

      if (evaluations && evaluations.length > 0) {
        const avgOverall = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length;
        const avgTechnical = evaluations.reduce((sum, e) => sum + (e.technical_score || 0), 0) / evaluations.length;
        const avgCommunication = evaluations.reduce((sum, e) => sum + (e.communication_score || 0), 0) / evaluations.length;
        const avgConfidence = evaluations.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / evaluations.length;

        setAverageScore(Math.round(avgOverall * 10) / 10);
        
        setSkillMetrics([
          { name: "Technical Skills", average: Math.round(avgTechnical * 10) / 10, icon: <Zap className="w-5 h-5" /> },
          { name: "Communication", average: Math.round(avgCommunication * 10) / 10, icon: <MessageSquare className="w-5 h-5" /> },
          { name: "Confidence", average: Math.round(avgConfidence * 10) / 10, icon: <Target className="w-5 h-5" /> },
        ]);
      }

      // Get recent interviews with student info
      const { data: recentData } = await supabase
        .from('interviews')
        .select(`
          id,
          status,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentData) {
        const interviewsWithDetails: StudentInterview[] = await Promise.all(
          recentData.map(async (interview) => {
            // Get profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', interview.user_id)
              .single();

            // Get evaluation
            const { data: evaluation } = await supabase
              .from('evaluations')
              .select('overall_score')
              .eq('interview_id', interview.id)
              .single();

            return {
              id: interview.id,
              student_name: profile?.full_name || 'Unknown',
              student_email: profile?.email || 'Unknown',
              interview_date: interview.created_at || '',
              score: evaluation?.overall_score || null,
              status: interview.status,
            };
          })
        );

        setRecentInterviews(interviewsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">In Progress</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Abandoned</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">Scheduled</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">InterviewSim AI</span>
              <span className="ml-2 text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">Admin</span>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor student performance and platform analytics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Interviews</p>
                  <p className="text-2xl font-bold text-foreground">{totalInterviews}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground">{completedInterviews}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-foreground">{averageScore}/10</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {skillMetrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      {metric.icon}
                    </div>
                    <span className="font-medium text-foreground">{metric.name}</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{metric.average}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(metric.average / 10) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Interviews Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Recent Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInterviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No interviews yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInterviews.map((interview) => (
                    <TableRow key={interview.id}>
                      <TableCell className="font-medium">{interview.student_name}</TableCell>
                      <TableCell className="text-muted-foreground">{interview.student_email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {interview.interview_date 
                          ? format(new Date(interview.interview_date), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {interview.score !== null ? (
                          <span className="font-semibold">{interview.score}/10</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(interview.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;