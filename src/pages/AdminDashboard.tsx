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
  Copy,
  Menu,
  X,
  Bell,
  Trash2,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";

const BRANCHES = ['CSE', 'ECE', 'ME', 'EEE', 'FSE', 'AI', 'RA', 'CIVIL'] as const;

interface AdminNotification {
  id: string;
  student_name: string | null;
  interview_type: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface StudentInterview {
  id: string;
  student_name: string;
  student_email: string;
  interview_date: string;
  score: number | null;
  status: string;
  user_id: string;
  interview_mode: string | null;
  duration: string;
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
  branch: string | null;
}

interface AdminUniversity {
  id: string;
  university_name: string;
  code: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [adminUniversity, setAdminUniversity] = useState<AdminUniversity | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [completedInterviews, setCompletedInterviews] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [skillMetrics, setSkillMetrics] = useState<SkillMetric[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<StudentInterview[]>([]);
  const [universityCodes, setUniversityCodes] = useState<UniversityCode[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [weakAreas, setWeakAreas] = useState<{ area: string; count: number }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filters
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  
  // Dialog states
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<string>("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState("");
  const [removeStudentId, setRemoveStudentId] = useState<string | null>(null);

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

      // Get admin's university
      const { data: profileData } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileData?.university_id) {
        const { data: uniData } = await supabase
          .from('university_codes')
          .select('id, university_name, code')
          .eq('id', profileData.university_id)
          .single();
        
        if (uniData) {
          setAdminUniversity(uniData);
        }
      }

      await Promise.all([
        fetchAnalytics(session.user.id, profileData?.university_id),
        fetchUniversityCodes(profileData?.university_id),
        fetchStudents(profileData?.university_id),
        fetchWeakAreas(profileData?.university_id),
        fetchNotifications(session.user.id),
      ]);
      setIsLoading(false);

      // Subscribe to realtime notifications
      const channel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_notifications',
            filter: `admin_user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as AdminNotification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast({
              title: "Interview Completed",
              description: newNotification.message,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    checkAdminAndFetchData();
  }, [navigate, toast]);

  const fetchNotifications = async (adminUserId: string) => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('id, student_name, interview_type, message, is_read, created_at')
      .eq('admin_user_id', adminUserId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('admin_user_id', session.user.id)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const fetchAnalytics = async (_adminUserId: string, universityId?: string) => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('university_code_id', universityId);

      const studentUserIds = profiles?.map(p => p.user_id) || [];
      setTotalStudents(studentUserIds.length);

      if (studentUserIds.length === 0) {
        setSkillMetrics([
          { name: "Technical Skills", average: 0, icon: <Zap className="w-5 h-5" /> },
          { name: "Communication", average: 0, icon: <MessageSquare className="w-5 h-5" /> },
          { name: "Confidence", average: 0, icon: <Target className="w-5 h-5" /> },
        ]);
        return;
      }

      const { data: interviews } = await supabase
        .from('interviews')
        .select('*')
        .in('user_id', studentUserIds)
        .order('created_at', { ascending: false });
      
      setTotalInterviews(interviews?.length || 0);
      const completed = interviews?.filter(i => i.status === 'completed').length || 0;
      setCompletedInterviews(completed);

      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('overall_score, technical_score, communication_score, confidence_score')
        .in('user_id', studentUserIds);

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
      } else {
        setSkillMetrics([
          { name: "Technical Skills", average: 0, icon: <Zap className="w-5 h-5" /> },
          { name: "Communication", average: 0, icon: <MessageSquare className="w-5 h-5" /> },
          { name: "Confidence", average: 0, icon: <Target className="w-5 h-5" /> },
        ]);
      }

      // Get recent interviews with individual details (mode, duration)
      if (interviews && interviews.length > 0) {
        const recentData = interviews.slice(0, 30);
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
              interview_mode: interview.interview_mode,
              duration: interview.duration,
            };
          })
        );

        setRecentInterviews(interviewsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchUniversityCodes = async (universityId?: string) => {
    if (!universityId) return;
    const { data } = await supabase
      .from('university_codes')
      .select('*')
      .eq('id', universityId);
    setUniversityCodes(data || []);
  };

  const fetchStudents = async (universityId?: string) => {
    if (!universityId) return;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, university_code_id, branch')
      .eq('university_code_id', universityId);

    if (error) {
      console.error('Error fetching students:', error);
      return;
    }

    const { data: uniData } = await supabase
      .from('university_codes')
      .select('university_name')
      .eq('id', universityId)
      .maybeSingle();

    const universityName = uniData?.university_name || null;

    if (profiles && profiles.length > 0) {
      const studentsWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const { data: interviews } = await supabase
            .from('interviews')
            .select('id, created_at')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false });

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
            university_name: universityName,
            interview_count: interviews?.length || 0,
            avg_score: Math.round(avgScore),
            last_interview: interviews?.length ? interviews[0].created_at : null,
            branch: (profile as any).branch || null,
          };
        })
      );

      setStudents(studentsWithStats);
    } else {
      setStudents([]);
    }
  };

  const fetchWeakAreas = async (universityId?: string) => {
    if (!universityId) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('university_code_id', universityId);

    const studentUserIds = profiles?.map(p => p.user_id) || [];
    if (studentUserIds.length === 0) return;

    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id')
      .in('user_id', studentUserIds);

    if (!evaluations || evaluations.length === 0) return;

    const evaluationIds = evaluations.map(e => e.id);

    const { data: suggestions } = await supabase
      .from('improvement_suggestions')
      .select('category')
      .in('evaluation_id', evaluationIds)
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

  const generateNewCode = async () => {
    if (!adminUniversity) return;

    const code = `${adminUniversity.university_name.substring(0, 3).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-5)}`;
    
    const { error } = await supabase
      .from('university_codes')
      .insert({
        code,
        university_name: adminUniversity.university_name,
        max_uses: newCodeMaxUses ? parseInt(newCodeMaxUses) : null,
        is_active: true,
        current_uses: 0,
      });

    if (error) {
      toast({ title: "Error", description: "Failed to create code", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Code ${code} created` });
      setIsCodeDialogOpen(false);
      setNewCodeMaxUses("");
      fetchUniversityCodes(adminUniversity.id);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const toggleCodeStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('university_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (adminUniversity) {
      fetchUniversityCodes(adminUniversity.id);
    }
  };

  // Remove student (unlink from college)
  const handleRemoveStudent = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ university_code_id: null })
      .eq('user_id', userId);

    if (error) {
      toast({ title: "Error", description: "Failed to remove student", variant: "destructive" });
    } else {
      toast({ title: "Student removed", description: "Student has been unlinked from your college." });
      setStudents(prev => prev.filter(s => s.user_id !== userId));
      setTotalStudents(prev => prev - 1);
    }
    setRemoveStudentId(null);
  };

  // Rename college
  const handleRenameCollege = async () => {
    if (!adminUniversity || !newCollegeName.trim()) return;

    const { error } = await supabase
      .from('university_codes')
      .update({ university_name: newCollegeName.trim() })
      .eq('id', adminUniversity.id);

    if (error) {
      toast({ title: "Error", description: "Failed to rename college", variant: "destructive" });
    } else {
      setAdminUniversity({ ...adminUniversity, university_name: newCollegeName.trim() });
      toast({ title: "College renamed", description: `College name updated to "${newCollegeName.trim()}"` });
      setIsRenameDialogOpen(false);
      setNewCollegeName("");
    }
  };

  // Sanitize CSV fields
  const sanitizeCSVField = (value: string | null | undefined): string => {
    if (!value) return '""';
    const str = String(value);
    const dangerous = /^[=+\-@\t\r]/;
    const safe = dangerous.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const exportToCSV = () => {
    const dataToExport = filteredStudents;
    const headers = ['Student Name', 'Email', 'Branch', 'Interviews', 'Avg Score', 'Last Interview'];
    const rows = dataToExport.map(s => [
      sanitizeCSVField(s.full_name),
      sanitizeCSVField(s.email),
      sanitizeCSVField(s.branch || 'N/A'),
      s.interview_count.toString(),
      s.avg_score.toString(),
      s.last_interview ? format(new Date(s.last_interview), 'yyyy-MM-dd') : 'Never'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = branchFilter !== 'all' ? `_${branchFilter}` : '';
    a.download = `students${suffix}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  const getModeBadge = (mode: string | null) => {
    switch (mode) {
      case 'technical':
        return <Badge variant="outline" className="text-xs">Technical</Badge>;
      case 'hr':
        return <Badge variant="outline" className="text-xs">HR</Badge>;
      case 'resume_jd':
        return <Badge variant="outline" className="text-xs">Resume</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{mode || 'N/A'}</Badge>;
    }
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/10 text-green-500"><Star className="w-3 h-3 mr-1" /> High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500/10 text-yellow-500">Average</Badge>;
    if (score > 0) return <Badge className="bg-red-500/10 text-red-500"><AlertTriangle className="w-3 h-3 mr-1" /> Low</Badge>;
    return <Badge variant="outline">N/A</Badge>;
  };

  // Apply filters
  const filteredStudents = students.filter(s => {
    if (performanceFilter === "high" && s.avg_score < 80) return false;
    if (performanceFilter === "low" && s.avg_score >= 50) return false;
    if (branchFilter !== "all" && s.branch !== branchFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg lg:text-xl font-bold text-foreground">InterviewSim AI</span>
              <Badge className="ml-2 bg-accent/10 text-accent text-xs">Admin</Badge>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {adminUniversity && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{adminUniversity.university_name}</span>
                <button onClick={() => { setNewCollegeName(adminUniversity.university_name); setIsRenameDialogOpen(true); }}>
                  <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
            
            {/* Notification Bell */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">No notifications yet</div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-3 hover:bg-secondary/50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-accent/5' : ''}`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <p className="text-sm text-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                          </p>
                          {!notification.is_read && <span className="inline-block w-2 h-2 rounded-full bg-accent mt-1" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border p-4 space-y-2">
            {adminUniversity && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{adminUniversity.university_name}</span>
                <button onClick={() => { setNewCollegeName(adminUniversity.university_name); setIsRenameDialogOpen(true); }}>
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            )}
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full max-w-full overflow-x-auto flex">
            <TabsTrigger value="overview" className="flex-1 min-w-[80px]">Overview</TabsTrigger>
            <TabsTrigger value="students" className="flex-1 min-w-[80px]">Students</TabsTrigger>
            <TabsTrigger value="codes" className="flex-1 min-w-[80px]">Codes</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 min-w-[80px]">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card>
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-muted-foreground">Students</p>
                      <p className="text-xl lg:text-2xl font-bold text-foreground">{totalStudents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Video className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-muted-foreground">Interviews</p>
                      <p className="text-xl lg:text-2xl font-bold text-foreground">{totalInterviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-muted-foreground">Completed</p>
                      <p className="text-xl lg:text-2xl font-bold text-foreground">{completedInterviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 lg:pt-6">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Award className="w-5 h-5 lg:w-6 lg:h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-muted-foreground">Avg Score</p>
                      <p className="text-xl lg:text-2xl font-bold text-foreground">{averageScore}/100</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skill Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {skillMetrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="p-4 lg:pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                          {metric.icon}
                        </div>
                        <span className="font-medium text-foreground text-sm lg:text-base">{metric.name}</span>
                      </div>
                      <span className="text-xl lg:text-2xl font-bold text-foreground">{metric.average}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${metric.average}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Weak Areas */}
            {weakAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Common Weak Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {weakAreas.map((area, index) => (
                      <Badge key={index} variant="outline" className="py-1.5 px-3 text-sm">
                        {area.area} ({area.count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Interviews - Individual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Recent Interviews</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="hidden sm:table-cell">Duration</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInterviews.slice(0, 15).map((interview) => (
                      <TableRow key={interview.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{interview.student_name}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{interview.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getModeBadge(interview.interview_mode)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{interview.duration} min</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {interview.interview_date && format(new Date(interview.interview_date), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          {interview.score !== null ? (
                            <span className="font-medium text-sm">{interview.score}%</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl lg:text-2xl font-bold">Students</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {BRANCHES.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High Performers</SelectItem>
                    <SelectItem value="low">Need Support</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Export{branchFilter !== 'all' ? ` (${branchFilter})` : ''}
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Interviews</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead className="hidden md:table-cell">Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-sm">{student.full_name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{student.email}</TableCell>
                        <TableCell>
                          {student.branch ? (
                            <Badge variant="outline" className="text-xs">{student.branch}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{student.interview_count}</TableCell>
                        <TableCell>{getPerformanceBadge(student.avg_score)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {student.last_interview 
                            ? format(new Date(student.last_interview), 'MMM d, yyyy')
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRemoveStudentId(student.user_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Codes Tab */}
          <TabsContent value="codes" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold">College Codes</h2>
                <p className="text-sm text-muted-foreground">Share codes with students to join your college</p>
              </div>
              <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New Code</DialogTitle>
                    <DialogDescription>
                      Create a new signup code for {adminUniversity?.university_name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Maximum Uses (optional)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        placeholder="Unlimited"
                        value={newCodeMaxUses}
                        onChange={(e) => setNewCodeMaxUses(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCodeDialogOpen(false)}>Cancel</Button>
                    <Button onClick={generateNewCode}>Generate</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {adminUniversity && (
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                        <Key className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Primary College Code</p>
                        <p className="text-2xl font-mono font-bold text-foreground">{adminUniversity.code}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => copyCode(adminUniversity.code)} className="w-full sm:w-auto">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {universityCodes.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base lg:text-lg">Additional Codes</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead className="hidden sm:table-cell">Uses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {universityCodes.slice(1).map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono text-sm">{code.code}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {code.current_uses}/{code.max_uses || '∞'}
                          </TableCell>
                          <TableCell>
                            <Badge className={code.is_active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}>
                              {code.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => copyCode(code.code)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => toggleCodeStatus(code.id, code.is_active)}
                              >
                                {code.is_active ? "Disable" : "Enable"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold">Performance Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base lg:text-lg">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">High (80-100)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(students.filter(s => s.avg_score >= 80).length / Math.max(students.length, 1)) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8">{students.filter(s => s.avg_score >= 80).length}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average (50-79)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(students.filter(s => s.avg_score >= 50 && s.avg_score < 80).length / Math.max(students.length, 1)) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8">{students.filter(s => s.avg_score >= 50 && s.avg_score < 80).length}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Needs Support (&lt;50)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${(students.filter(s => s.avg_score > 0 && s.avg_score < 50).length / Math.max(students.length, 1)) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8">{students.filter(s => s.avg_score > 0 && s.avg_score < 50).length}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base lg:text-lg">Interview Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-secondary" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={`${(completedInterviews / Math.max(totalInterviews, 1)) * 352} 352`} className="text-accent" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">{totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0}%</span>
                        <span className="text-xs text-muted-foreground">Completed</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    {completedInterviews} of {totalInterviews} interviews completed
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Branch-wise breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Branch-wise Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {BRANCHES.map(branch => {
                    const count = students.filter(s => s.branch === branch).length;
                    if (count === 0) return null;
                    return (
                      <div key={branch} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{branch}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${(count / Math.max(students.length, 1)) * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                  {(() => {
                    const unassigned = students.filter(s => !s.branch).length;
                    if (unassigned === 0) return null;
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: `${(unassigned / Math.max(students.length, 1)) * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium w-8">{unassigned}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Remove Student Confirmation Dialog */}
      <Dialog open={!!removeStudentId} onOpenChange={() => setRemoveStudentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              This will unlink the student from your college. They will no longer appear in your dashboard. Their account and data will remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveStudentId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => removeStudentId && handleRemoveStudent(removeStudentId)}>
              Remove Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename College Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename College</DialogTitle>
            <DialogDescription>
              Update your college name. This will be reflected across the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collegeName">College Name</Label>
              <Input
                id="collegeName"
                value={newCollegeName}
                onChange={(e) => setNewCollegeName(e.target.value)}
                placeholder="Enter new college name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameCollege} disabled={!newCollegeName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
