import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { ATSScoreGauge } from "./ATSScoreGauge";
import { ATSSectionScore } from "./ATSSectionScore";
import { JobRoleCombobox } from "./JobRoleCombobox";

interface ImprovementSuggestion {
  category: string;
  original?: string;
  improved: string;
  reason: string;
}

interface OptimizedBullet {
  original: string;
  optimized: string;
  impact_added: string;
}

interface SectionScores {
  summary?: number;
  experience?: number;
  projects?: number;
  skills?: number;
  education?: number;
  certifications?: number | null;
}

interface ATSScore {
  id: string;
  overall_score: number;
  keyword_match_percentage: number;
  section_scores: SectionScores;
  missing_keywords: string[];
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: ImprovementSuggestion[];
  recruiter_review: string;
  formatting_issues: string[];
  optimized_bullets: OptimizedBullet[];
  job_role: string;
  created_at: string;
}

interface ATSAnalysisPanelProps {
  atsScore: ATSScore | null;
  isAnalyzing: boolean;
  onAnalyze: (jobRole: string) => void;
  hasResume: boolean;
}

export const ATSAnalysisPanel = ({ 
  atsScore, 
  isAnalyzing, 
  onAnalyze,
  hasResume 
}: ATSAnalysisPanelProps) => {
  const [selectedRole, setSelectedRole] = useState<string>(atsScore?.job_role || "Software Engineer");
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const handleAnalyze = () => {
    onAnalyze(selectedRole);
  };

  if (!hasResume) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            ATS Resume Score
          </CardTitle>
          <CardDescription>
            Upload a resume first to get your ATS compatibility score
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              ATS Resume Score & Optimization
            </CardTitle>
            <CardDescription>
              Analyze your resume for any job role - select from common roles or type your own
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3">
            <JobRoleCombobox value={selectedRole} onChange={setSelectedRole} />
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !selectedRole.trim()}
              className="gradient-hero text-primary-foreground w-full sm:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : atsScore ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-analyze
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Analyze Resume
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {atsScore && (
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <div className="overflow-x-auto -mx-2 px-2 pb-2">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4 mb-6">
                <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap">Overview</TabsTrigger>
                <TabsTrigger value="review" className="text-xs sm:text-sm whitespace-nowrap">Review</TabsTrigger>
                <TabsTrigger value="improvements" className="text-xs sm:text-sm whitespace-nowrap">Improve</TabsTrigger>
                <TabsTrigger value="keywords" className="text-xs sm:text-sm whitespace-nowrap">Keywords</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Score */}
                <div className="flex flex-col items-center p-6 bg-gradient-to-br from-accent/10 to-transparent rounded-xl">
                  <ATSScoreGauge score={atsScore.overall_score} size="lg" />
                  <p className="text-sm text-muted-foreground mt-2">Overall ATS Score</p>
                  <Badge variant="outline" className="mt-2">
                    {atsScore.job_role}
                  </Badge>
                </div>

                {/* Section Scores */}
                <div className="col-span-2 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Section Scores
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(atsScore.section_scores).map(([section, score]) => (
                      <ATSSectionScore key={section} section={section} score={score as number} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Keyword Match */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Keyword Match</span>
                  <span className="text-lg font-bold text-accent">{atsScore.keyword_match_percentage}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${atsScore.keyword_match_percentage}%` }}
                  />
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {atsScore.strengths.slice(0, 5).map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {atsScore.weaknesses.slice(0, 5).map((weakness, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Formatting Issues */}
              {atsScore.formatting_issues.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Formatting Issues (ATS Risk)
                  </h4>
                  <ul className="space-y-1">
                    {atsScore.formatting_issues.map((issue, i) => (
                      <li key={i} className="text-sm text-red-600 dark:text-red-400">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="review">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="p-6 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Honest Recruiter Perspective
                  </h4>
                  <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {atsScore.recruiter_review}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="improvements">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {/* Improvement Suggestions */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Improvement Suggestions
                    </h4>
                    {atsScore.improvement_suggestions.map((suggestion, i) => (
                      <div 
                        key={i} 
                        className="p-4 bg-muted/30 rounded-lg border border-border/50 cursor-pointer hover:border-accent/50 transition-colors"
                        onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{suggestion.category}</Badge>
                          {expandedSuggestion === i ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                        {expandedSuggestion === i && (
                          <div className="mt-3 space-y-2">
                            {suggestion.original && (
                              <div className="p-2 bg-red-500/10 rounded text-sm">
                                <span className="text-xs text-red-500 font-medium">Original:</span>
                                <p className="mt-1">{suggestion.original}</p>
                              </div>
                            )}
                            <div className="p-2 bg-green-500/10 rounded text-sm">
                              <span className="text-xs text-green-500 font-medium">Improved:</span>
                              <p className="mt-1">{suggestion.improved}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <strong>Why:</strong> {suggestion.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Optimized Bullets */}
                  {atsScore.optimized_bullets.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        Optimized Bullet Points
                      </h4>
                      {atsScore.optimized_bullets.map((bullet, i) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-lg space-y-2">
                          <div className="p-2 bg-red-500/10 rounded text-sm">
                            <span className="text-xs text-red-500 font-medium">Before:</span>
                            <p className="mt-1">{bullet.original}</p>
                          </div>
                          <div className="p-2 bg-green-500/10 rounded text-sm">
                            <span className="text-xs text-green-500 font-medium">After:</span>
                            <p className="mt-1">{bullet.optimized}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <strong>Impact Added:</strong> {bullet.impact_added}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="keywords">
              <div className="space-y-6">
                {/* Missing Keywords */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                    Missing Keywords
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    These keywords are commonly expected for {atsScore.job_role} roles but are missing from your resume:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {atsScore.missing_keywords.map((keyword, i) => (
                      <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Keyword Tips */}
                <div className="p-4 bg-accent/10 rounded-lg">
                  <h4 className="font-semibold mb-2">💡 Keyword Optimization Tips</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use exact keyword matches from job descriptions</li>
                    <li>• Include both acronyms and full terms (e.g., "AWS" and "Amazon Web Services")</li>
                    <li>• Place important keywords in your summary and skills sections</li>
                    <li>• Use keywords naturally within your experience descriptions</li>
                    <li>• Mirror the job description's language when applicable</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};
