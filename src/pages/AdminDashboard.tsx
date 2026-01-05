import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  Target,
  Plus,
  Key,
  Filter,
  Download,
  AlertTriangle,
  Star,
  Building2,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface StudentInterview {
  id: string;
  student_name: string;
  student_email: string;
  interview_date: string;
  score: number | null;
  status: string;
  user_id: string;
}

interface SkillMetric {
  name: string;
  average: number;
  icon: React.ReactNode;
}

interface UniversityCode {
  id: string;
  code: string;
  university_name: string;
  is_active: boolean;
  current_uses: number;
  max_uses: number | null;
  created_at: string;
}

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  university_name: string | null;
  interview_count: number;
  avg_score: number;
  last_interview: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [completedInterviews, setCompletedInterviews] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [skillMetrics, setSkillMetrics] = useState<SkillMetric[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<StudentInterview[]>([]);
  const [universityCodes, setUniversityCodes] = useState<UniversityCode[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [weakAreas, setWeakAreas] = useState<{ area: string; count: number }[]>([]);
  
  // Filters
  const [universityFilter, setUniversityFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  // Dialog states
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<string>("");

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/login");
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleData?.role !== 'admin') {
        navigate("/dashboard");
        return;
      }

      await Promise.all([
        fetchAnalytics(),
        fetchUniversityCodes(),
        fetchStudents(),
        fetchWeakAreas(),
      ]);
      setIsLoading(false);
    };

    checkAdminAndFetchData();
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      const { count: studentCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      
      setTotalStudents(studentCount || 0);

      const { data: interviews, count: interviewCount } = await supabase
        .from('interviews')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      setTotalInterviews(interviewCount || 0);

      const completed = interviews?.filter(i => i.status === 'completed').length || 0;
      setCompletedInterviews(completed);

      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('overall_score, technical_score, communication_score, confidence_score');

      if (evaluations && evaluations.length > 0) {
        const avgOverall = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length;
        const avgTechnical = evaluations.reduce((sum, e) => sum + (e.technical_score || 0), 0) / evaluations.length;
        const avgCommunication = evaluations.reduce((sum, e) => sum + (e.communication_score || 0), 0) / evaluations.length;
        const avgConfidence = evaluations.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / evaluations.length;

        setAverageScore(Math.round(avgOverall));
        
        setSkillMetrics([
          { name: "Technical Skills", average: Math.round(avgTechnical), icon: <Zap className="w-5 h-5" /> },
          { name: "Communication", average: Math.round(avgCommunication), icon: <MessageSquare className="w-5 h-5" /> },
          { name: "Confidence", average: Math.round(avgConfidence), icon: <Target className="w-5 h-5" /> },
        ]);
      }

      const { data: recentData } = await supabase
        .from('interviews')
        .select('id, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentData) {
        const interviewsWithDetails: StudentInterview[] = await Promise.all(
          recentData.map(async (interview) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', interview.user_id)
              .single();

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
              user_id: interview.user_id,
            };
          })
        );

        setRecentInterviews(interviewsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchUniversityCodes = async () => {
    const { data } = await supabase
      .from('university_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    setUniversityCodes(data || []);
  };

  const fetchStudents = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        full_name,
        email,
        university_code_id,
        university_codes(university_name)
      `);

    if (profiles) {
      const studentsWithStats = await Promise.all(
        profiles.map(async (profile: any) => {
          const { data: interviews } = await supabase
            .from('interviews')
            .select('id, created_at')
            .eq('user_id', profile.user_id);

          const { data: evaluations } = await supabase
            .from('evaluations')
            .select('overall_score')
            .eq('user_id', profile.user_id);

          const avgScore = evaluations?.length 
            ? evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length 
            : 0;

          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name || 'Unknown',
            email: profile.email,
            university_name: profile.university_codes?.university_name || null,
            interview_count: interviews?.length || 0,
            avg_score: Math.round(avgScore),
            last_interview: interviews?.length ? interviews[0].created_at : null,
          };
        })
      );

      setStudents(studentsWithStats);
    }
  };

  const fetchWeakAreas = async () => {
    const { data: suggestions } = await supabase
      .from('improvement_suggestions')
      .select('category')
      .limit(500);

    if (suggestions) {
      const categoryCounts: Record<string, number> = {};
      suggestions.forEach(s => {
        const cat = s.category || 'general';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const sorted = Object.entries(categoryCounts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setWeakAreas(sorted);
    }
  };

  const generateUniversityCode = async () => {
    if (!newCodeName.trim()) {
      toast({ title: "Error", description: "University name is required", variant: "destructive" });
      return;
    }

    const code = `${newCodeName.substring(0, 3).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-5)}`;
    
    const { error } = await supabase
      .from('university_codes')
      .insert({
        code,
        university_name: newCodeName,
        max_uses: newCodeMaxUses ? parseInt(newCodeMaxUses) : null,
        is_active: true,
        current_uses: 0,
      });

    if (error) {
      toast({ title: "Error", description: "Failed to create code", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Code ${code} created` });
      setIsCodeDialogOpen(false);
      setNewCodeName("");
      setNewCodeMaxUses("");
      fetchUniversityCodes();
    }
  };

  const toggleCodeStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('university_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    fetchUniversityCodes();
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'University', 'Interviews', 'Avg Score', 'Last Interview'];
    const rows = students.map(s => [
      s.full_name,
      s.email,
      s.university_name || 'N/A',
      s.interview_count.toString(),
      s.avg_score.toString(),
      s.last_interview ? format(new Date(s.last_interview), 'yyyy-MM-dd') : 'Never'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/10 text-green-500"><Star className="w-3 h-3 mr-1" /> High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500/10 text-yellow-500">Average</Badge>;
    if (score > 0) return <Badge className="bg-red-500/10 text-red-500"><AlertTriangle className="w-3 h-3 mr-1" /> Low</Badge>;
    return <Badge variant="outline">N/A</Badge>;
  };

  // Apply filters to students
  const filteredStudents = students.filter(s => {
    if (universityFilter !== "all" && s.university_name !== universityFilter) return false;
    if (performanceFilter === "high" && s.avg_score < 80) return false;
    if (performanceFilter === "low" && s.avg_score >= 50) return false;
    return true;
  });

  const uniqueUniversities = [...new Set(students.map(s => s.university_name).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">InterviewSim AI</span>
              <Badge className="ml-2 bg-accent/10 text-accent">Admin</Badge>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="codes">Codes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <p className="text-2xl font-bold text-foreground">{averageScore}/100</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skill Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        style={{ width: `${metric.average}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Weak Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Common Weak Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {weakAreas.map((area, i) => (
                    <div key={i} className="p-4 bg-secondary rounded-lg text-center">
                      <p className="text-sm text-muted-foreground capitalize">{area.area}</p>
                      <p className="text-xl font-bold text-foreground">{area.count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Interviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Recent Interviews
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                    {recentInterviews.slice(0, 10).map((interview) => (
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
                            <span className="font-semibold">{interview.score}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(interview.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Student Management</h2>
              <div className="flex items-center gap-4">
                <Select value={universityFilter} onValueChange={setUniversityFilter}>
                  <SelectTrigger className="w-48">
                    <Building2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by university" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Universities</SelectItem>
                    {uniqueUniversities.map((uni) => (
                      <SelectItem key={uni} value={uni!}>{uni}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High Performers</SelectItem>
                    <SelectItem value="low">Low Performers</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Interviews</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Last Interview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell>{student.university_name || 'N/A'}</TableCell>
                        <TableCell>{student.interview_count}</TableCell>
                        <TableCell className="font-semibold">{student.avg_score}</TableCell>
                        <TableCell>{getPerformanceBadge(student.avg_score)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.last_interview 
                            ? format(new Date(student.last_interview), 'MMM d, yyyy')
                            : 'Never'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* University Codes Tab */}
          <TabsContent value="codes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">University Codes</h2>
              <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate University Code</DialogTitle>
                    <DialogDescription>
                      Create a new code for a university. Students will use this to sign up.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="universityName">University Name</Label>
                      <Input
                        id="universityName"
                        placeholder="e.g., Stanford University"
                        value={newCodeName}
                        onChange={(e) => setNewCodeName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Max Uses (optional)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        placeholder="Leave empty for unlimited"
                        value={newCodeMaxUses}
                        onChange={(e) => setNewCodeMaxUses(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCodeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={generateUniversityCode}>
                      Generate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universityCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold">{code.code}</TableCell>
                        <TableCell>{code.university_name}</TableCell>
                        <TableCell>
                          {code.current_uses} / {code.max_uses || '∞'}
                        </TableCell>
                        <TableCell>
                          {code.is_active ? (
                            <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(code.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCodeStatus(code.id, code.is_active)}
                          >
                            {code.is_active ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Performance Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: '80-100 (High)', range: [80, 100], color: 'bg-green-500' },
                      { label: '50-79 (Average)', range: [50, 79], color: 'bg-yellow-500' },
                      { label: '0-49 (Low)', range: [0, 49], color: 'bg-red-500' },
                    ].map((tier) => {
                      const count = students.filter(s => 
                        s.avg_score >= tier.range[0] && s.avg_score <= tier.range[1]
                      ).length;
                      const percentage = students.length ? (count / students.length) * 100 : 0;
                      
                      return (
                        <div key={tier.label} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{tier.label}</span>
                            <span>{count} students ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`${tier.color} h-2 rounded-full`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interview Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-accent">
                        {totalInterviews ? Math.round((completedInterviews / totalInterviews) * 100) : 0}%
                      </p>
                      <p className="text-muted-foreground">
                        {completedInterviews} of {totalInterviews} interviews completed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>University Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>University</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Interviews</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueUniversities.map((uni) => {
                      const uniStudents = students.filter(s => s.university_name === uni);
                      const avgScore = uniStudents.length 
                        ? uniStudents.reduce((sum, s) => sum + s.avg_score, 0) / uniStudents.length 
                        : 0;
                      const totalInt = uniStudents.reduce((sum, s) => sum + s.interview_count, 0);
                      
                      return (
                        <TableRow key={uni}>
                          <TableCell className="font-medium">{uni}</TableCell>
                          <TableCell>{uniStudents.length}</TableCell>
                          <TableCell>{Math.round(avgScore)}</TableCell>
                          <TableCell>{totalInt}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
