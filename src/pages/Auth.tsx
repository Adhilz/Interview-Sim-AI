import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Brain, Eye, EyeOff, Loader2, GraduationCap, ArrowLeft } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name is required"),
  universityCode: z.string().min(1, "University code is required"),
});

const Auth = () => {
  const location = useLocation();
  const isLogin = location.pathname !== "/signup";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [universityCode, setUniversityCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/dashboard");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, fullName, universityCode });
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        navigate("/dashboard");
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
      // Validate university code first
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

      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
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
      } else {
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center p-12">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground">InterviewSim AI</span>
          </Link>
          
          <h1 className="text-4xl font-bold text-primary-foreground mb-6">
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
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">InterviewSim AI</span>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-muted-foreground">
                {isLogin 
                  ? "Enter your credentials to access your dashboard" 
                  : "Start your interview preparation journey"}
              </p>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
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
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
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

              {!isLogin && (
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
                    className={errors.universityCode ? "border-destructive uppercase" : "uppercase"}
                  />
                  {errors.universityCode && (
                    <p className="text-sm text-destructive">{errors.universityCode}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Contact your university administrator if you don't have a code
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                variant="hero" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Link 
                  to={isLogin ? "/signup" : "/login"} 
                  className="text-accent hover:underline font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Link>
              </p>
            </div>

            {!isLogin && (
              <p className="mt-6 text-xs text-center text-muted-foreground">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
