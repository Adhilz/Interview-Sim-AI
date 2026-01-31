import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Award,
  MessageSquare,
  Brain,
  Zap,
  Target,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Minus
} from "lucide-react";

interface ResponseAnalysis {
  question: string;
  response: string;
  quality: "good" | "average" | "poor";
  strengths: string[];
  improvements: string[];
  score: number;
}

interface EvaluationData {
  id: string;
  overall_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  confidence_score: number | null;
  feedback: string | null;
  transcript?: string | null;
  response_analysis?: ResponseAnalysis[] | null;
}

interface ImprovementSuggestion {
  id: string;
  suggestion: string;
  category: string | null;
  priority: number | null;
}

type InterviewMode = 'resume_jd' | 'technical' | 'hr';

interface EvaluationDisplayProps {
  evaluation: EvaluationData | null;
  improvements: ImprovementSuggestion[];
  isLoading?: boolean;
  interviewMode?: InterviewMode | null;
  onStartNewInterview?: () => void;
  onViewHistory?: () => void;
}

const EvaluationDisplay = ({
  evaluation,
  improvements,
  isLoading = false,
  interviewMode = 'resume_jd',
  onStartNewInterview,
  onViewHistory
}: EvaluationDisplayProps) => {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 sm:p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-accent" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Analyzing Your Interview</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Our AI is carefully reviewing your responses, communication style, and technical accuracy...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Evaluation Pending</h3>
          <p className="text-muted-foreground">
            Your evaluation is being processed. This may take a moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overallScore = evaluation.overall_score || 0;
  const communicationScore = evaluation.communication_score || 0;
  const technicalScore = evaluation.technical_score || 0;
  const confidenceScore = evaluation.confidence_score || 0;

  // Parse feedback to extract sections
  const feedbackParts = parseFeedback(evaluation.feedback || '');

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-success/10";
    if (score >= 50) return "bg-warning/10";
    return "bg-destructive/10";
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-success text-success-foreground" };
    if (score >= 75) return { label: "Good", color: "bg-success/80 text-success-foreground" };
    if (score >= 60) return { label: "Fair", color: "bg-warning text-warning-foreground" };
    if (score >= 40) return { label: "Needs Work", color: "bg-warning/80 text-warning-foreground" };
    return { label: "Poor", color: "bg-destructive text-destructive-foreground" };
  };

  const grade = getGradeLabel(overallScore);

  const categoryIcons: Record<string, React.ReactNode> = {
    communication: <MessageSquare className="w-4 h-4" />,
    technical: <Brain className="w-4 h-4" />,
    confidence: <Zap className="w-4 h-4" />,
    preparation: <Target className="w-4 h-4" />,
    structure: <TrendingUp className="w-4 h-4" />,
    general: <Lightbulb className="w-4 h-4" />
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'good':
        return <ThumbsUp className="w-4 h-4 text-success" />;
      case 'poor':
        return <ThumbsDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-warning" />;
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'good':
        return <Badge className="bg-success/10 text-success border-success/20">Good</Badge>;
      case 'poor':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Needs Work</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/20">Average</Badge>;
    }
  };

  const responseAnalysis = evaluation.response_analysis || [];
  const hasTranscript = evaluation.transcript && evaluation.transcript.length > 0;

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="border-border/50 overflow-hidden">
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full ${getScoreBg(overallScore)} flex items-center justify-center`}>
                <div className="text-center">
                  <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                    {overallScore}
                  </span>
                  <span className={`text-lg ${getScoreColor(overallScore)}`}>/100</span>
                </div>
              </div>
              <Badge className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${grade.color}`}>
                {grade.label}
              </Badge>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground mb-2">Interview Complete</h2>
              <p className="text-muted-foreground max-w-lg">
                Your interview has been analyzed. Review the detailed breakdown below to understand your strengths and areas for improvement.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Scores & Feedback */}
      <Tabs defaultValue="scores" className="w-full">
        <div className="overflow-x-auto -mx-2 px-2 pb-2">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4">
            <TabsTrigger value="scores" className="text-xs sm:text-sm whitespace-nowrap">
              <Award className="w-4 h-4 mr-2" />
              Scores
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs sm:text-sm whitespace-nowrap">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="transcript" className="text-xs sm:text-sm whitespace-nowrap">
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="improvements" className="text-xs sm:text-sm whitespace-nowrap">
              <Lightbulb className="w-4 h-4 mr-2" />
              Improvements
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scores Tab */}
        <TabsContent value="scores" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Score Breakdown</CardTitle>
              <CardDescription>Detailed analysis across key performance areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ScoreBar
                label="Communication"
                score={communicationScore}
                icon={<MessageSquare className="w-5 h-5" />}
                description="Clarity, structure, and articulation of responses"
              />
              <ScoreBar
                label="Technical Accuracy"
                score={technicalScore}
                icon={<Brain className="w-5 h-5" />}
                description="Correctness and depth of technical explanations"
              />
              <ScoreBar
                label="Confidence & Presence"
                score={confidenceScore}
                icon={<Zap className="w-5 h-5" />}
                description="Composure, pace, and professional demeanor"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Detailed Feedback</CardTitle>
              <CardDescription>AI-generated analysis of your interview performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Verdict */}
              {feedbackParts.verdict && (
                <div className={`p-4 rounded-xl ${overallScore >= 60 ? 'bg-success/5 border border-success/20' : 'bg-destructive/5 border border-destructive/20'}`}>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    {overallScore >= 60 ? <CheckCircle className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    Verdict
                  </h4>
                  <p className="text-muted-foreground">{feedbackParts.verdict}</p>
                </div>
              )}

              {/* Weaknesses */}
              {feedbackParts.weaknesses.length > 0 && (
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Critical Weaknesses
                  </h4>
                  <ul className="space-y-2">
                    {feedbackParts.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-warning mt-1">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Scores */}
              {feedbackParts.detailedScores.length > 0 && (
                <div className="p-4 rounded-xl bg-secondary/50">
                  <h4 className="font-semibold text-foreground mb-3">Score Details</h4>
                  <div className="space-y-2">
                    {feedbackParts.detailedScores.map((score, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">{score}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Feedback (if parsing failed) */}
              {!feedbackParts.verdict && !feedbackParts.weaknesses.length && evaluation.feedback && (
                <div className="p-4 rounded-xl bg-secondary/50 whitespace-pre-wrap">
                  <p className="text-muted-foreground">{evaluation.feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Interview Transcript</CardTitle>
              <CardDescription>Full conversation with per-response analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {responseAnalysis.length > 0 ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {responseAnalysis.map((item, idx) => (
                      <div key={idx} className="border border-border/50 rounded-xl overflow-hidden">
                        {/* Question */}
                        <div className="bg-secondary/30 p-4 border-b border-border/50">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Brain className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Interviewer</p>
                              <p className="text-foreground">{item.question}</p>
                            </div>
                          </div>
                        </div>

                        {/* Response */}
                        <div className="p-4 border-b border-border/50">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-muted-foreground">Your Response</p>
                                <div className="flex items-center gap-2">
                                  {getQualityBadge(item.quality)}
                                  <span className="text-sm font-medium">{item.score}/10</span>
                                </div>
                              </div>
                              <p className="text-foreground">{item.response}</p>
                            </div>
                          </div>
                        </div>

                        {/* Analysis */}
                        <div className="p-4 bg-muted/30 grid sm:grid-cols-2 gap-4">
                          {/* Strengths */}
                          {item.strengths && item.strengths.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ThumbsUp className="w-4 h-4 text-success" />
                                <span className="text-sm font-medium text-success">What was good</span>
                              </div>
                              <ul className="space-y-1">
                                {item.strengths.map((s, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 mt-1 text-success flex-shrink-0" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Improvements */}
                          {item.improvements && item.improvements.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-warning" />
                                <span className="text-sm font-medium text-warning">How to improve</span>
                              </div>
                              <ul className="space-y-1">
                                {item.improvements.map((i, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <AlertTriangle className="w-3 h-3 mt-1 text-warning flex-shrink-0" />
                                    <span>{i}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : hasTranscript ? (
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground font-mono bg-secondary/30 p-4 rounded-lg">
                    {evaluation.transcript}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Transcript not available for this interview.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Improvement Suggestions</CardTitle>
              <CardDescription>Actionable steps to enhance your interview performance</CardDescription>
            </CardHeader>
            <CardContent>
              {improvements.length > 0 ? (
                <div className="space-y-4">
                  {improvements
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map((imp, idx) => (
                      <div
                        key={imp.id}
                        className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-accent font-semibold text-sm">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {imp.category && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {categoryIcons[imp.category.toLowerCase()] || <Lightbulb className="w-3 h-3" />}
                                <span className="ml-1">{imp.category}</span>
                              </Badge>
                            )}
                            {imp.priority && imp.priority <= 2 && (
                              <Badge variant="destructive" className="text-xs">High Priority</Badge>
                            )}
                          </div>
                          <p className="text-foreground">{imp.suggestion}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No specific improvement suggestions available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="outline" className="flex-1" onClick={onViewHistory}>
          View All History
        </Button>
        <Button variant="hero" className="flex-1" onClick={onStartNewInterview}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Start New Interview
        </Button>
      </div>
    </div>
  );
};

// Helper component for score bars
const ScoreBar = ({
  label,
  score,
  icon,
  description
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  description: string;
}) => {
  const getColor = (s: number) => {
    if (s >= 70) return "bg-success";
    if (s >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-accent">
            {icon}
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className={`text-2xl font-bold ${score >= 70 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive'}`}>
          {score}%
        </span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
};

// Parse the feedback string into structured parts
function parseFeedback(feedback: string): {
  verdict: string;
  weaknesses: string[];
  detailedScores: string[];
} {
  const result = {
    verdict: '',
    weaknesses: [] as string[],
    detailedScores: [] as string[]
  };

  const lines = feedback.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('**Verdict:**')) {
      result.verdict = trimmed.replace('**Verdict:**', '').trim();
      currentSection = 'verdict';
    } else if (trimmed.includes('Critical Weaknesses:') || trimmed.includes('**Critical Weaknesses:**')) {
      currentSection = 'weaknesses';
    } else if (trimmed.includes('Detailed Scores:') || trimmed.includes('**Detailed Scores:**')) {
      currentSection = 'scores';
    } else if (trimmed.startsWith('-')) {
      const content = trimmed.substring(1).trim();
      if (currentSection === 'weaknesses') {
        result.weaknesses.push(content);
      } else if (currentSection === 'scores') {
        result.detailedScores.push(content);
      }
    }
  }

  return result;
}

export default EvaluationDisplay;
