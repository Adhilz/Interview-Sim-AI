import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ATSSectionScoreProps {
  section: string;
  score: number | null;
}

export const ATSSectionScore = ({ section, score }: ATSSectionScoreProps) => {
  if (score === null) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatSection = (section: string) => {
    return section.charAt(0).toUpperCase() + section.slice(1);
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatSection(section)}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", getScoreColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};
