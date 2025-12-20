import { useState, useEffect, useRef } from "react";
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
  User, 
  LogOut, 
  Upload,
  CheckCircle,
  TrendingUp,
  Loader2,
  X,
  Sparkles,
  RefreshCw,
  Briefcase,
  GraduationCap,
  Code
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";

interface Resume {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  parsed_at: string | null;
}

interface Experience {
  company: string;
  role: string;
  duration: string;
  highlights: string[];
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
}

interface Education {
  institution: string;
  degree: string;
  year: string;
  gpa?: string;
}

interface ResumeHighlight {
  id: string;
  skills: string[] | null;
  tools: string[] | null;
  summary: string | null;
  experience: Experience[] | null;
  projects: Project[] | null;
  education: Education[] | null;
}

const Resume = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [highlights, setHighlights] = useState<ResumeHighlight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
        fetchResume(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchResume = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: resumeData } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (resumeData) {
        setResume(resumeData as Resume);
        
        // Fetch highlights
        const { data: highlightsData } = await supabase
          .from("resume_highlights")
          .select("*")
          .eq("resume_id", resumeData.id)
          .single();
        
        if (highlightsData) {
          // Parse JSON fields
          const parsed: ResumeHighlight = {
            id: highlightsData.id,
            skills: highlightsData.skills,
            tools: highlightsData.tools,
            summary: highlightsData.summary,
            experience: highlightsData.experience as unknown as Experience[] | null,
            projects: highlightsData.projects as unknown as Project[] | null,
            education: highlightsData.education as unknown as Education[] | null,
          };
          setHighlights(parsed);
        }
      }
    } catch (error) {
      // No resume found
    } finally {
      setIsLoading(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText.trim() || `[Unable to extract text from PDF: ${file.name}]`;
    } catch (error) {
      console.error('PDF extraction error:', error);
      return `[PDF Resume: ${file.name}] - Could not extract text. Please ensure the PDF contains selectable text.`;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      // Save resume record
      const { data, error } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Resume uploaded!",
        description: "Now parsing your resume with AI...",
      });

      setResume(data as Resume);
      
      // Start parsing
      await parseResume(data.id, file);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading your resume.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const parseResume = async (resumeId: string, file?: File) => {
    if (!user) return;

    setIsParsing(true);
    try {
      // Read file as text (simplified - in production use proper PDF parser)
      let resumeText = '';
      if (file) {
        if (file.type === 'application/pdf') {
          resumeText = await extractTextFromPDF(file);
        } else {
          resumeText = await file.text();
        }
      }

      const { data, error } = await supabase.functions.invoke('parse-resume', {
        body: {
          resumeText,
          resumeId,
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data?.highlights) {
        const parsed: ResumeHighlight = {
          id: data.highlights.id,
          skills: data.highlights.skills,
          tools: data.highlights.tools,
          summary: data.highlights.summary,
          experience: data.highlights.experience as Experience[] | null,
          projects: data.highlights.projects as Project[] | null,
          education: data.highlights.education as Education[] | null,
        };
        setHighlights(parsed);
      }

      toast({
        title: "Resume parsed!",
        description: "Your resume has been analyzed successfully.",
      });

      // Refresh resume data
      if (user) {
        fetchResume(user.id);
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({
        title: "Parsing failed",
        description: error.message || "Failed to parse resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDeleteResume = async () => {
    if (!resume || !user) return;

    try {
      await supabase.from('resumes').delete().eq('id', resume.id);
      setResume(null);
      setHighlights(null);
      toast({
        title: "Resume deleted",
        description: "You can upload a new resume.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resume.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
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
        <div className="p-6 lg:p-10 max-w-4xl">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Resume</h1>
            <p className="text-muted-foreground">
              Upload your resume to get personalized interview questions
            </p>
          </div>

          {/* Upload area */}
          <Card className="border-border/50 mb-8">
            <CardContent className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? "border-accent bg-accent/5" 
                    : "border-border hover:border-accent/50 hover:bg-secondary/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                
                {isUploading || isParsing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-accent animate-spin" />
                    <p className="text-foreground font-medium">
                      {isUploading ? "Uploading..." : "Parsing with AI..."}
                    </p>
                    {isParsing && (
                      <p className="text-sm text-muted-foreground">
                        Extracting skills, experience, and projects...
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Drop your resume here
                    </p>
                    <p className="text-muted-foreground mb-4">
                      or click to browse (PDF or Word, max 5MB)
                    </p>
                    <Button variant="hero" size="sm">
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current resume */}
          {resume && (
            <Card className="border-border/50 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Current Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{resume.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        {resume.parsed_at && " • Parsed"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!highlights && !isParsing && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => parseResume(resume.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Parse
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={handleDeleteResume}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resume highlights */}
          {highlights && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Extracted Highlights
                </CardTitle>
                <CardDescription>
                  AI-analyzed content from your resume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {highlights.summary && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Summary</h4>
                    <p className="text-foreground">{highlights.summary}</p>
                  </div>
                )}

                {highlights.skills && highlights.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {highlights.skills.map((skill, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {highlights.tools && highlights.tools.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Tools & Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {highlights.tools.map((tool, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {highlights.experience && highlights.experience.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Experience
                    </h4>
                    <div className="space-y-4">
                      {highlights.experience.map((exp, i) => (
                        <div key={i} className="p-4 rounded-xl bg-secondary/30">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-foreground">{exp.role}</p>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{exp.duration}</span>
                          </div>
                          {exp.highlights && exp.highlights.length > 0 && (
                            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                              {exp.highlights.slice(0, 3).map((h, j) => (
                                <li key={j}>• {h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {highlights.education && highlights.education.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Education
                    </h4>
                    <div className="space-y-3">
                      {highlights.education.map((edu, i) => (
                        <div key={i} className="p-4 rounded-xl bg-secondary/30">
                          <p className="font-medium text-foreground">{edu.degree}</p>
                          <p className="text-sm text-muted-foreground">{edu.institution}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {edu.year}
                            {edu.gpa && ` • GPA: ${edu.gpa}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {highlights.projects && highlights.projects.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Projects</h4>
                    <div className="space-y-3">
                      {highlights.projects.map((project, i) => (
                        <div key={i} className="p-4 rounded-xl bg-secondary/30">
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                          {project.technologies && project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.technologies.map((tech, j) => (
                                <span key={j} className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!resume && (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No resume uploaded yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload your resume to get personalized interview questions based on your background
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Resume;
