 import { useState, useEffect } from "react";
 import { useNavigate, Link } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Label } from "@/components/ui/label";
 import { Progress } from "@/components/ui/progress";
 import { useToast } from "@/hooks/use-toast";
 import { 
   Brain, 
   FileText, 
   Mic, 
   History, 
   User as UserIcon, 
   LogOut,
   Menu,
   X,
   HelpCircle,
   TrendingUp,
   Calculator,
   CheckCircle2,
   XCircle,
   ArrowRight,
   RotateCcw,
   Trophy,
   Target,
   Clock
 } from "lucide-react";
 import type { User } from "@supabase/supabase-js";
 
 interface Question {
   id: number;
   question: string;
   options: {
     A: string;
     B: string;
     C: string;
     D: string;
   };
   correctAnswer: string;
   difficulty: string;
 }
 
 interface TestHistory {
   id: string;
   score: number;
   total_questions: number;
   completed_at: string;
 }
 
 type TestState = "idle" | "loading" | "in_progress" | "completed";
 
 const AptitudeTest = () => {
   const navigate = useNavigate();
   const { toast } = useToast();
   const [user, setUser] = useState<User | null>(null);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   
   // Test state
   const [testState, setTestState] = useState<TestState>("idle");
   const [questions, setQuestions] = useState<Question[]>([]);
   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<string>("");
   const [answers, setAnswers] = useState<Record<number, string>>({});
   const [score, setScore] = useState(0);
   const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
   const [isLoadingHistory, setIsLoadingHistory] = useState(true);
 
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
         fetchTestHistory(session.user.id);
       }
     });
 
     return () => subscription.unsubscribe();
   }, [navigate]);
 
   const fetchTestHistory = async (userId: string) => {
     setIsLoadingHistory(true);
     try {
       const { data, error } = await supabase
         .from("aptitude_tests")
         .select("id, score, total_questions, completed_at")
         .eq("user_id", userId)
         .order("completed_at", { ascending: false })
         .limit(10);
 
       if (error) throw error;
       setTestHistory(data || []);
     } catch (error) {
       console.error("Error fetching test history:", error);
     } finally {
       setIsLoadingHistory(false);
     }
   };
 
   const startTest = async () => {
     setTestState("loading");
     setQuestions([]);
     setCurrentQuestionIndex(0);
     setSelectedAnswer("");
     setAnswers({});
     setScore(0);
 
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         toast({ title: "Please log in", description: "You need to be logged in to take the test", variant: "destructive" });
         navigate("/login");
         return;
       }
 
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-aptitude-questions`,
         {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${session.access_token}`,
           },
         }
       );
 
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || "Failed to generate questions");
       }
 
       const data = await response.json();
       setQuestions(data.questions);
       setTestState("in_progress");
       toast({ title: "Test Started!", description: "Answer all 10 questions to complete the test." });
     } catch (error) {
       console.error("Error starting test:", error);
       toast({ 
         title: "Error", 
         description: error instanceof Error ? error.message : "Failed to start test. Please try again.", 
         variant: "destructive" 
       });
       setTestState("idle");
     }
   };
 
   const handleAnswerSelect = (answer: string) => {
     setSelectedAnswer(answer);
   };
 
   const handleNextQuestion = () => {
     if (!selectedAnswer) {
       toast({ title: "Please select an answer", variant: "destructive" });
       return;
     }
 
     const currentQuestion = questions[currentQuestionIndex];
     const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
     
     // Update answers and score
     const newAnswers = { ...answers, [currentQuestion.id]: selectedAnswer };
     setAnswers(newAnswers);
     
     if (isCorrect) {
       setScore(prev => prev + 1);
     }
 
     // Move to next question or complete test
     if (currentQuestionIndex < questions.length - 1) {
       setCurrentQuestionIndex(prev => prev + 1);
       setSelectedAnswer("");
     } else {
       // Test completed
       const finalScore = isCorrect ? score + 1 : score;
       completeTest(finalScore, newAnswers);
     }
   };
 
   const completeTest = async (finalScore: number, finalAnswers: Record<number, string>) => {
     setTestState("completed");
     setScore(finalScore);
 
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) return;
 
       // Save to database
       const { error } = await supabase.from("aptitude_tests").insert({
        user_id: session.user.id,
        score: finalScore,
        total_questions: questions.length,
        questions: questions as unknown as Record<string, unknown>,
        answers: finalAnswers as unknown as Record<string, unknown>,
      } as never);
 
       if (error) {
         console.error("Error saving test result:", error);
         toast({ title: "Warning", description: "Test completed but couldn't save result.", variant: "destructive" });
       } else {
         // Refresh history
         fetchTestHistory(session.user.id);
       }
     } catch (error) {
       console.error("Error saving test:", error);
     }
   };
 
   const getPerformanceMessage = (score: number, total: number) => {
     const percentage = (score / total) * 100;
     if (percentage >= 90) return { message: "Outstanding! 🌟", color: "text-success" };
     if (percentage >= 70) return { message: "Great job! 👏", color: "text-success" };
     if (percentage >= 50) return { message: "Good effort! 💪", color: "text-warning" };
     if (percentage >= 30) return { message: "Keep practicing! 📚", color: "text-warning" };
     return { message: "Don't give up! 🎯", color: "text-destructive" };
   };
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     toast({ title: "Logged out", description: "You have been successfully logged out." });
     navigate("/");
   };
 
   const currentQuestion = questions[currentQuestionIndex];
   const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
 
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
           <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <TrendingUp className="w-5 h-5" />
             Dashboard
           </Link>
           <Link to="/interview" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <Mic className="w-5 h-5" />
             New Interview
           </Link>
           <Link to="/aptitude" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium">
             <Calculator className="w-5 h-5" />
             Aptitude Test
           </Link>
           <Link to="/resume" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <FileText className="w-5 h-5" />
             Resume
           </Link>
           <Link to="/history" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <History className="w-5 h-5" />
             History
           </Link>
           <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <UserIcon className="w-5 h-5" />
             Profile
           </Link>
           <Link to="/help" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <HelpCircle className="w-5 h-5" />
             Help
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
             <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
               <TrendingUp className="w-5 h-5" />
               Dashboard
             </Link>
             <Link to="/interview" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
               <Mic className="w-5 h-5" />
               New Interview
             </Link>
             <Link to="/aptitude" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 text-accent font-medium" onClick={() => setMobileMenuOpen(false)}>
               <Calculator className="w-5 h-5" />
               Aptitude Test
             </Link>
             <Link to="/resume" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
               <FileText className="w-5 h-5" />
               Resume
             </Link>
             <Link to="/history" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
               <History className="w-5 h-5" />
               History
             </Link>
             <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
               <UserIcon className="w-5 h-5" />
               Profile
             </Link>
             <Link to="/help" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
               <HelpCircle className="w-5 h-5" />
               Help
             </Link>
             <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive">
               <LogOut className="w-5 h-5" />
               Logout
             </Button>
           </nav>
         </div>
       )}
 
       {/* Main content */}
       <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
         <div className="p-4 sm:p-6 lg:p-10">
           {/* Header */}
           <div className="mb-6 sm:mb-10">
             <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Aptitude Test</h1>
             <p className="text-sm sm:text-base text-muted-foreground">
               Test your logical reasoning and analytical skills
             </p>
           </div>
 
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main Test Area */}
             <div className="lg:col-span-2">
               {/* Idle State - Start Test */}
               {testState === "idle" && (
                 <Card className="border-border/50">
                   <CardContent className="p-8 text-center">
                     <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-6">
                       <Calculator className="w-10 h-10 text-primary-foreground" />
                     </div>
                     <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Test Your Skills?</h2>
                     <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                       This test contains 10 AI-generated aptitude questions covering logical reasoning, 
                       quantitative analysis, and verbal ability. Each question has one correct answer.
                     </p>
                     <div className="flex flex-wrap justify-center gap-4 mb-8">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Target className="w-4 h-4 text-accent" />
                         10 Questions
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Clock className="w-4 h-4 text-accent" />
                         ~15 minutes
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Brain className="w-4 h-4 text-accent" />
                         AI Generated
                       </div>
                     </div>
                     <Button variant="hero" size="lg" onClick={startTest}>
                       Start Aptitude Test
                       <ArrowRight className="w-5 h-5 ml-2" />
                     </Button>
                   </CardContent>
                 </Card>
               )}
 
               {/* Loading State */}
               {testState === "loading" && (
                 <Card className="border-border/50">
                   <CardContent className="p-8 text-center">
                     <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
                       <Brain className="w-8 h-8 text-accent animate-spin" />
                     </div>
                     <h2 className="text-xl font-bold text-foreground mb-2">Generating Questions...</h2>
                     <p className="text-muted-foreground">Our AI is creating unique questions for you</p>
                   </CardContent>
                 </Card>
               )}
 
               {/* In Progress State - Show Question */}
               {testState === "in_progress" && currentQuestion && (
                 <Card className="border-border/50">
                   <CardHeader>
                     <div className="flex items-center justify-between mb-4">
                       <span className="text-sm font-medium text-muted-foreground">
                         Question {currentQuestionIndex + 1} of {questions.length}
                       </span>
                       <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                         currentQuestion.difficulty === "easy" ? "bg-success/10 text-success" :
                         currentQuestion.difficulty === "medium" ? "bg-warning/10 text-warning" :
                         "bg-destructive/10 text-destructive"
                       }`}>
                         {currentQuestion.difficulty}
                       </span>
                     </div>
                     <Progress value={progress} className="h-2 mb-4" />
                     <CardTitle className="text-lg sm:text-xl leading-relaxed">
                       {currentQuestion.question}
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect} className="space-y-3">
                       {Object.entries(currentQuestion.options).map(([key, value]) => (
                         <div
                           key={key}
                           className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                             selectedAnswer === key 
                               ? "border-accent bg-accent/10" 
                               : "border-border hover:border-accent/50 hover:bg-secondary/50"
                           }`}
                           onClick={() => handleAnswerSelect(key)}
                         >
                           <RadioGroupItem value={key} id={key} />
                           <Label htmlFor={key} className="flex-1 cursor-pointer font-normal">
                             <span className="font-semibold mr-2">{key}.</span>
                             {value}
                           </Label>
                         </div>
                       ))}
                     </RadioGroup>
                     <div className="mt-6 flex justify-end">
                       <Button 
                         variant="hero" 
                         onClick={handleNextQuestion}
                         disabled={!selectedAnswer}
                       >
                         {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Submit Test"}
                         <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                     </div>
                   </CardContent>
                 </Card>
               )}
 
               {/* Completed State - Show Results */}
               {testState === "completed" && (
                 <Card className="border-border/50">
                   <CardContent className="p-8 text-center">
                     <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                       score >= 7 ? "bg-success/10" : score >= 5 ? "bg-warning/10" : "bg-destructive/10"
                     }`}>
                       <Trophy className={`w-12 h-12 ${
                         score >= 7 ? "text-success" : score >= 5 ? "text-warning" : "text-destructive"
                       }`} />
                     </div>
                     <h2 className="text-3xl font-bold text-foreground mb-2">Test Completed!</h2>
                     <p className={`text-xl font-semibold mb-4 ${getPerformanceMessage(score, questions.length).color}`}>
                       {getPerformanceMessage(score, questions.length).message}
                     </p>
                     <div className="text-5xl font-bold text-foreground mb-6">
                       {score}<span className="text-2xl text-muted-foreground">/{questions.length}</span>
                     </div>
                     
                     {/* Question Review */}
                     <div className="text-left mb-8">
                       <h3 className="font-semibold text-foreground mb-4">Question Review:</h3>
                       <div className="space-y-2">
                         {questions.map((q, idx) => {
                           const userAnswer = answers[q.id];
                           const isCorrect = userAnswer === q.correctAnswer;
                           return (
                             <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                               {isCorrect ? (
                                 <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                               ) : (
                                 <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                               )}
                               <span className="text-sm text-foreground flex-1 truncate">
                                 Q{idx + 1}: {q.question.substring(0, 60)}...
                               </span>
                               {!isCorrect && (
                                 <span className="text-xs text-muted-foreground">
                                   Correct: {q.correctAnswer}
                                 </span>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     </div>
 
                     <Button variant="hero" size="lg" onClick={startTest}>
                       <RotateCcw className="w-5 h-5 mr-2" />
                       Start New Test
                     </Button>
                   </CardContent>
                 </Card>
               )}
             </div>
 
             {/* Sidebar - Test History */}
             <div className="lg:col-span-1">
               <Card className="border-border/50">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <History className="w-5 h-5 text-accent" />
                     Past Scores
                   </CardTitle>
                   <CardDescription>Your recent test results</CardDescription>
                 </CardHeader>
                 <CardContent>
                   {isLoadingHistory ? (
                     <div className="space-y-3">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="h-16 bg-secondary/50 rounded-lg animate-pulse" />
                       ))}
                     </div>
                   ) : testHistory.length === 0 ? (
                     <div className="text-center py-8">
                       <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                       <p className="text-muted-foreground text-sm">No tests taken yet</p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {testHistory.map((test) => (
                         <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                           <div>
                             <p className="font-medium text-foreground">
                               {test.score}/{test.total_questions}
                             </p>
                             <p className="text-xs text-muted-foreground">
                               {new Date(test.completed_at).toLocaleDateString()}
                             </p>
                           </div>
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                             test.score >= 7 ? "bg-success/10" : test.score >= 5 ? "bg-warning/10" : "bg-destructive/10"
                           }`}>
                             <span className={`text-sm font-bold ${
                               test.score >= 7 ? "text-success" : test.score >= 5 ? "text-warning" : "text-destructive"
                             }`}>
                               {Math.round((test.score / test.total_questions) * 100)}%
                             </span>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </CardContent>
               </Card>
             </div>
           </div>
         </div>
       </main>
     </div>
   );
 };
 
 export default AptitudeTest;