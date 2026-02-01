import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Brain, 
  FileText, 
  Mic, 
  History, 
  User, 
  LogOut, 
  TrendingUp,
  Camera,
  Loader2,
  GraduationCap,
  Video,
  Save,
  Upload,
  Menu,
  X,
  Shield,
  Mail,
  Settings
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  camera_permission: boolean;
  microphone_permission: boolean;
  university_code_id: string | null;
}

interface UniversityCode {
  id: string;
  code: string;
  university_name: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [universityCode, setUniversityCode] = useState<UniversityCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [cameraPermission, setCameraPermission] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (profileData) {
        const typedProfile = profileData as Profile;
        setProfile(typedProfile);
        setFullName(typedProfile.full_name || "");
        setCameraPermission(typedProfile.camera_permission || false);
        setMicPermission(typedProfile.microphone_permission || false);
        setAvatarUrl(typedProfile.avatar_url);

        if (typedProfile.university_code_id) {
          const { data: codeData } = await supabase
            .from("university_codes")
            .select("id, code, university_name")
            .eq("id", typedProfile.university_code_id)
            .single();
          
          if (codeData) {
            setUniversityCode(codeData as UniversityCode);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          camera_permission: cameraPermission,
          microphone_permission: micPermission,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
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
      {/* Sidebar - Desktop */}
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <History className="w-5 h-5" />
            History
          </Link>
          <Link 
            to="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <History className="w-5 h-5" />
              History
            </Link>
            <Link 
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium"
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

      {/* Main content - Centered */}
      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 lg:p-10">
          {/* Header */}
          <motion.div 
            className="mb-8 text-center lg:text-left"
            {...fadeIn}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Settings className="w-4 h-4" />
              Account Settings
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </motion.div>

          {/* Profile Card - Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="border-border/50 mb-8 overflow-hidden">
              <div className="h-24 lg:h-32 gradient-hero" />
              <CardContent className="relative px-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16">
                  <div className="relative">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl object-cover border-4 border-background shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center border-4 border-background shadow-lg">
                        <span className="text-3xl lg:text-4xl font-bold text-primary-foreground">
                          {fullName.charAt(0).toUpperCase() || "S"}
                        </span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Camera className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 text-center sm:text-left pb-2">
                    <h2 className="text-xl lg:text-2xl font-bold text-foreground">{fullName || "Student"}</h2>
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                      <Mail className="w-4 h-4" />
                      {profile?.email}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="hidden sm:flex"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="border-border/50 h-full">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-accent" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your profile details</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-secondary/50 h-11"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* University info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-border/50 h-full">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="w-5 h-5 text-accent" />
                    University Details
                  </CardTitle>
                  <CardDescription>Your academic affiliation</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">University</span>
                        <span className="font-medium text-foreground">
                          {universityCode?.university_name || "Not linked"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Access Code</span>
                        <span className="font-mono text-foreground bg-background px-2 py-1 rounded">
                          {universityCode?.code || "N/A"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      University code cannot be changed after registration
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Permissions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="md:col-span-2"
            >
              <Card className="border-border/50">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Video className="w-5 h-5 text-accent" />
                    Device Permissions
                  </CardTitle>
                  <CardDescription>Manage camera and microphone access for interviews</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Camera className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Camera Access</p>
                          <p className="text-sm text-muted-foreground">Allow video during interviews</p>
                        </div>
                      </div>
                      <Switch
                        checked={cameraPermission}
                        onCheckedChange={setCameraPermission}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Microphone Access</p>
                          <p className="text-sm text-muted-foreground">Allow audio during interviews</p>
                        </div>
                      </div>
                      <Switch
                        checked={micPermission}
                        onCheckedChange={setMicPermission}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Save button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-8"
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full sm:w-auto h-12 px-8" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Profile;