import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Brain, Eye, EyeOff, Loader2, GraduationCap, ArrowLeft, Building2, Users } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const studentSignupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name is required"),
  universityCode: z.string().min(1, "University code is required"),
});

const adminSignupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name is required"),
  universityName: z.string().min(2, "University name is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type UserRole = "student" | "admin";

const Auth = () => {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isSignup = location.pathname === "/signup";
  const isForgotPassword = location.pathname === "/forgot-password";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [universityCode, setUniversityCode] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (roleData?.role === 'admin') {
              navigate("/admin");
            } else {
              navigate("/dashboard");
            }
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleData?.role === 'admin') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    try {
      if (isForgotPassword) {
        forgotPasswordSchema.parse({ email });
      } else if (isLogin) {
        loginSchema.parse({ email, password });
      } else if (selectedRole === "student") {
        studentSignupSchema.parse({ email, password, fullName, universityCode });
      } else if (selectedRole === "admin") {
        adminSignupSchema.parse({ email, password, fullName, universityName });
      } else {
        setErrors({ role: "Please select a role" });
        return false;
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: "Email sent",
          description: "Password reset link has been sent to your registered email.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });

        if (roleData?.role === 'admin') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (selectedRole === "admin") {
        // Use secure edge function for admin signup
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              email,
              password,
              fullName,
              universityName,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          if (result.error?.includes("already") || result.error?.includes("registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Signup failed",
              description: result.error || "Failed to create admin account",
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return;
        }

        toast({
          title: "Admin account created!",
          description: `Your university code is: ${result.universityCode}. You can now login.`,
        });

        // Redirect to login page
        navigate("/login");
        return;
      }

      // Student signup flow
      // Validate university code for students
      const { data: codeData, error: codeError } = await supabase
        .rpc('validate_university_code', { code_input: universityCode });

      if (codeError || !codeData) {
        toast({
          title: "Invalid University Code",
          description: "The university code is invalid, expired, or has reached its usage limit.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: signupData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            university_code_id: codeData,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please login instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (signupData.user) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPageTitle = () => {
    if (isForgotPassword) return "Reset password";
    if (isLogin) return "Welcome back";
    return "Create account";
  };

  const getPageDescription = () => {
    if (isForgotPassword) return "Enter your email to receive a password reset link";
    if (isLogin) return "Enter your credentials to access your dashboard";
    return "Start your interview preparation journey";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center p-8 lg:p-12">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">InterviewSim AI</span>
          </Link>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
            Practice Makes
            <span className="block text-teal-300">Perfect</span>
          </h1>
          
          <p className="text-primary-foreground/80 text-lg max-w-md leading-relaxed">
            Join thousands of students preparing for their career with AI-powered mock interviews.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-300 to-accent border-2 border-primary"
                />
              ))}
            </div>
            <p className="text-primary-foreground/80 text-sm">
              <span className="font-semibold text-primary-foreground">5,000+</span> students trained
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        <div className="p-4 lg:p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 lg:p-6">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">InterviewSim AI</span>
            </div>

            <div className="mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                {getPageTitle()}
              </h2>
              <p className="text-muted-foreground text-sm lg:text-base">
                {getPageDescription()}
              </p>
            </div>

            {/* Forgot Password Form */}
            {isForgotPassword && (
              <>
                {resetEmailSent ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Check your email</h3>
                    <p className="text-muted-foreground mb-6">
                      Password reset link has been sent to your registered email.
                    </p>
                    <Link to="/login">
                      <Button variant="outline" className="w-full">
                        Back to Login
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4 lg:space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`h-11 lg:h-12 ${errors.email ? "border-destructive" : ""}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 lg:h-12" 
                      variant="hero" 
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Send Reset Link
                    </Button>

                    <div className="text-center">
                      <Link 
                        to="/login" 
                        className="text-accent hover:underline font-medium text-sm"
                      >
                        Back to Login
                      </Link>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Login Form */}
            {isLogin && (
              <form onSubmit={handleLogin} className="space-y-4 lg:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`h-11 lg:h-12 ${errors.email ? "border-destructive" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-11 lg:h-12 ${errors.password ? "border-destructive pr-10" : "pr-10"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  <div className="text-right">
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-accent hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 lg:h-12" 
                  variant="hero" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </Button>

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Don't have an account?{" "}
                    <Link 
                      to="/signup" 
                      className="text-accent hover:underline font-medium"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {isSignup && (
              <form onSubmit={handleSignup} className="space-y-4 lg:space-y-5">
                {/* Role Selection */}
                <div className="space-y-3">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("student")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === "student"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Users className={`w-6 h-6 mx-auto mb-2 ${
                        selectedRole === "student" ? "text-accent" : "text-muted-foreground"
                      }`} />
                      <p className={`text-sm font-medium ${
                        selectedRole === "student" ? "text-accent" : "text-foreground"
                      }`}>Student</p>
                      <p className="text-xs text-muted-foreground mt-1">Practice interviews</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("admin")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedRole === "admin"
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <Building2 className={`w-6 h-6 mx-auto mb-2 ${
                        selectedRole === "admin" ? "text-accent" : "text-muted-foreground"
                      }`} />
                      <p className={`text-sm font-medium ${
                        selectedRole === "admin" ? "text-accent" : "text-foreground"
                      }`}>University Admin</p>
                      <p className="text-xs text-muted-foreground mt-1">Manage students</p>
                    </button>
                  </div>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role}</p>
                  )}
                </div>

                {selectedRole && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`h-11 lg:h-12 ${errors.fullName ? "border-destructive" : ""}`}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`h-11 lg:h-12 ${errors.email ? "border-destructive" : ""}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`h-11 lg:h-12 ${errors.password ? "border-destructive pr-10" : "pr-10"}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>

                    {/* Student: University Code */}
                    {selectedRole === "student" && (
                      <div className="space-y-2">
                        <Label htmlFor="universityCode" className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          University Code
                        </Label>
                        <Input
                          id="universityCode"
                          type="text"
                          placeholder="Enter your university code"
                          value={universityCode}
                          onChange={(e) => setUniversityCode(e.target.value.toUpperCase())}
                          className={`h-11 lg:h-12 font-mono ${errors.universityCode ? "border-destructive" : ""}`}
                        />
                        {errors.universityCode && (
                          <p className="text-sm text-destructive">{errors.universityCode}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Get this code from your university administrator
                        </p>
                      </div>
                    )}

                    {/* Admin: University Name */}
                    {selectedRole === "admin" && (
                      <div className="space-y-2">
                        <Label htmlFor="universityName" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          University Name
                        </Label>
                        <Input
                          id="universityName"
                          type="text"
                          placeholder="Enter your university name"
                          value={universityName}
                          onChange={(e) => setUniversityName(e.target.value)}
                          className={`h-11 lg:h-12 ${errors.universityName ? "border-destructive" : ""}`}
                        />
                        {errors.universityName && (
                          <p className="text-sm text-destructive">{errors.universityName}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          A unique code will be generated for your students
                        </p>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-11 lg:h-12" 
                      variant="hero" 
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {selectedRole === "admin" ? "Create Admin Account" : "Create Student Account"}
                    </Button>
                  </>
                )}

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Already have an account?{" "}
                    <Link 
                      to="/login" 
                      className="text-accent hover:underline font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;