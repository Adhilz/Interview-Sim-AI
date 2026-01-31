import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Code, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InterviewMode = 'resume_jd' | 'technical' | 'hr';

interface InterviewModeSelectorProps {
  selectedMode: InterviewMode | null;
  onModeSelect: (mode: InterviewMode) => void;
  onContinue: () => void;
  hasResume: boolean;
}

const modes = [
  {
    id: 'resume_jd' as InterviewMode,
    title: 'Resume + JD Interview',
    description: 'AI-powered interview based on your resume and job description',
    icon: FileText,
    color: 'accent',
    features: [
      'Questions based on YOUR resume',
      'Job description context awareness',
      'Technical depth on your projects',
      'Role-specific evaluation'
    ],
    requiresResume: true,
    badge: 'Recommended',
    badgeVariant: 'default' as const
  },
  {
    id: 'technical' as InterviewMode,
    title: 'Technical DSA Interview',
    description: 'Algorithm, logic, and problem-solving focused interview',
    icon: Code,
    color: 'warning',
    features: [
      'Data structures & algorithms',
      'Time & space complexity',
      'Optimization thinking',
      'Problem-solving approach'
    ],
    requiresResume: false,
    badge: 'New',
    badgeVariant: 'secondary' as const
  },
  {
    id: 'hr' as InterviewMode,
    title: 'HR Behavioral Interview',
    description: 'Communication, culture fit, and soft skills evaluation',
    icon: Users,
    color: 'success',
    features: [
      'STAR method evaluation',
      'Communication clarity',
      'Leadership & teamwork',
      'Cultural fit assessment'
    ],
    requiresResume: false,
    badge: 'New',
    badgeVariant: 'secondary' as const
  }
];

export const InterviewModeSelector = ({ 
  selectedMode, 
  onModeSelect, 
  onContinue,
  hasResume 
}: InterviewModeSelectorProps) => {
  const getColorClasses = (colorName: string, isSelected: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string; hover: string }> = {
      accent: {
        border: isSelected ? 'border-accent' : 'border-border',
        bg: isSelected ? 'bg-accent/5' : '',
        text: 'text-accent',
        hover: 'hover:border-accent/50'
      },
      warning: {
        border: isSelected ? 'border-warning' : 'border-border',
        bg: isSelected ? 'bg-warning/5' : '',
        text: 'text-warning',
        hover: 'hover:border-warning/50'
      },
      success: {
        border: isSelected ? 'border-success' : 'border-border',
        bg: isSelected ? 'bg-success/5' : '',
        text: 'text-success',
        hover: 'hover:border-success/50'
      }
    };
    return colors[colorName] || colors.accent;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Interview Type</h2>
        <p className="text-muted-foreground">
          Select the interview mode that best matches your preparation goals
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const colors = getColorClasses(mode.color, isSelected);
          const Icon = mode.icon;
          const isDisabled = mode.requiresResume && !hasResume;

          return (
            <Card
              key={mode.id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 border-2',
                colors.border,
                colors.bg,
                colors.hover,
                isDisabled && 'opacity-50 cursor-not-allowed',
                isSelected && 'ring-2 ring-offset-2 ring-offset-background',
                isSelected && mode.color === 'accent' && 'ring-accent',
                isSelected && mode.color === 'warning' && 'ring-warning',
                isSelected && mode.color === 'success' && 'ring-success'
              )}
              onClick={() => !isDisabled && onModeSelect(mode.id)}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className={cn('w-5 h-5', colors.text)} />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    mode.color === 'accent' && 'bg-accent/10',
                    mode.color === 'warning' && 'bg-warning/10',
                    mode.color === 'success' && 'bg-success/10'
                  )}>
                    <Icon className={cn('w-5 h-5', colors.text)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">{mode.title}</CardTitle>
                    </div>
                    <Badge variant={mode.badgeVariant} className="text-xs">
                      {mode.badge}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="mt-2 text-sm">
                  {mode.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {mode.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        mode.color === 'accent' && 'bg-accent',
                        mode.color === 'warning' && 'bg-warning',
                        mode.color === 'success' && 'bg-success'
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isDisabled && (
                  <p className="text-xs text-destructive mt-3">
                    Requires resume upload
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedMode && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="hero" 
            size="lg" 
            onClick={onContinue}
            className="min-w-[200px]"
          >
            Continue Setup
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default InterviewModeSelector;
