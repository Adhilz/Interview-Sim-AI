import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mic, 
  Video, 
  FileText, 
  Clock, 
  Award, 
  Shield, 
  ChevronRight, 
  GraduationCap,
  Brain,
  Target,
  Users,
  HelpCircle
} from "lucide-react";

const Landing = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Get total users (students)
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        setTotalUsers(userCount || 0);

        // Get total interviews
        const { count: interviewCount } = await supabase
          .from('interviews')
          .select('*', { count: 'exact', head: true });
        
        setTotalInterviews(interviewCount || 0);

        // Get average score for success rate
        const { data: evaluations } = await supabase
          .from('evaluations')
          .select('overall_score');

        if (evaluations && evaluations.length > 0) {
          const avgScore = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length;
          // Convert to percentage (score is out of 10, so multiply by 10)
          setSuccessRate(Math.round(avgScore * 10));
        } else {
          setSuccessRate(0);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K+`;
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">InterviewSim AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/help">
              <Button variant="ghost" size="sm" className="text-sm hidden sm:inline-flex">
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button variant="hero" size="sm" className="text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-hero opacity-[0.03]" />
        <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-accent/10 text-accent mb-6 sm:mb-8 animate-fade-in">
              <GraduationCap className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">University Edition</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 sm:mb-6 animate-slide-up leading-tight">
              Master Your Interview
              <span className="block text-accent">With AI Precision</span>
            </h1>
            
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto animate-slide-up stagger-1 px-4">
              Practice with our AI-powered voice interviewer, get instant feedback, 
              and land your dream job. Designed exclusively for university students.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up stagger-2 px-4">
              <Link to="/signup">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Start Practicing Now
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Login to Dashboard
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 pt-8 sm:pt-16 border-t border-border animate-fade-in stagger-3">
              <div>
                <div className="text-2xl sm:text-4xl font-bold text-foreground">
                  {isLoading ? (
                    <span className="inline-block w-12 sm:w-16 h-8 sm:h-10 bg-muted animate-pulse rounded" />
                  ) : (
                    totalUsers > 0 ? formatNumber(totalUsers) : "5K+"
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Students Trained</div>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-bold text-foreground">
                  {isLoading ? (
                    <span className="inline-block w-12 sm:w-16 h-8 sm:h-10 bg-muted animate-pulse rounded" />
                  ) : (
                    totalInterviews > 0 ? formatNumber(totalInterviews) : "50+"
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Interviews</div>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-bold text-accent">
                  {isLoading ? (
                    <span className="inline-block w-12 sm:w-16 h-8 sm:h-10 bg-muted animate-pulse rounded" />
                  ) : (
                    successRate > 0 ? `${successRate}%` : "92%"
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Get interview-ready in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload Resume",
                description: "Upload your resume and let our AI analyze your background"
              },
              {
                step: "02",
                icon: Target,
                title: "Set Duration",
                description: "Choose 3 or 5 minute timed interview sessions"
              },
              {
                step: "03",
                icon: Mic,
                title: "Live Interview",
                description: "Engage in real-time voice interview with AI"
              },
              {
                step: "04",
                icon: Award,
                title: "Get Feedback",
                description: "Receive detailed scores and improvements"
              }
            ].map((item, index) => (
              <div 
                key={index}
                className="relative group"
              >
                <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-md hover:shadow-lg transition-all duration-300 h-full border border-border/50">
                  <div className="text-3xl sm:text-6xl font-bold text-accent/20 absolute top-2 right-2 sm:top-4 sm:right-4">
                    {item.step}
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="w-5 h-5 sm:w-7 sm:h-7 text-accent" />
                  </div>
                  <h3 className="text-base sm:text-xl font-semibold text-foreground mb-1 sm:mb-3">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-base text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to ace your next interview
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "AI Voice Interviewer",
                description: "Natural conversation powered by advanced AI that adapts to your responses and resume"
              },
              {
                icon: FileText,
                title: "Resume Analysis",
                description: "Smart parsing extracts your skills, experience, and projects for personalized questions"
              },
              {
                icon: Clock,
                title: "Timed Sessions",
                description: "Practice under real interview pressure with 3 or 5 minute timed sessions"
              },
              {
                icon: Video,
                title: "Video Recording",
                description: "Enable camera to practice body language and facial expressions"
              },
              {
                icon: Award,
                title: "Detailed Scoring",
                description: "Get scores on communication, technical skills, and confidence levels"
              },
              {
                icon: Shield,
                title: "University Verified",
                description: "Exclusive access for students with valid university codes"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group bg-card rounded-2xl p-8 shadow-sm hover:shadow-md border border-border/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
              Ready to Ace Your Interview?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-10">
              Join thousands of students who have improved their interview skills 
              and landed their dream jobs.
            </p>
            <Link to="/signup">
              <Button 
                size="xl" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-glow"
              >
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">InterviewSim AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/help" className="text-muted-foreground hover:text-accent transition-colors">
                Help & Support
              </Link>
              <Link to="/login" className="text-muted-foreground hover:text-accent transition-colors">
                Login
              </Link>
              <Link to="/signup" className="text-muted-foreground hover:text-accent transition-colors">
                Sign Up
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              <span>© {new Date().getFullYear()} InterviewSim AI. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;