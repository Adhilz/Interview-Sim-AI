import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Brain,
  HelpCircle,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Clock,
  Server,
  Video,
  Mic,
  FileText,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SUPPORT_EMAILS = [
  'adhensarageorge06@gmail.com',
  'adhilsalam200@gmail.com',
  'angelelizabethgeorge22@gmail.com',
  'eldhosoorajgeorge04@gmail.com',
];
const SUPPORT_EMAIL = SUPPORT_EMAILS.join(',');

interface SystemStatus {
  service: string;
  status: 'operational' | 'degraded' | 'outage';
  icon: React.ReactNode;
}

const FAQ_ITEMS = [
  {
    question: 'How do I start a mock interview?',
    answer: 'Navigate to the Interview page from your dashboard, grant camera and microphone permissions, select your preferred duration (3 or 5 minutes), and click "Start Interview". The AI interviewer will begin asking questions based on your resume.',
  },
  {
    question: 'Why do I need to upload a resume?',
    answer: 'Your resume helps the AI interviewer ask relevant, personalized questions based on your skills, experience, and projects. This makes the interview more realistic and valuable for your preparation.',
  },
  {
    question: 'What is a College Code?',
    answer: 'A College Code is a unique identifier provided by your college administrator. Students must enter this code during signup to link their account to their institution, enabling their admin to track progress and provide guidance.',
  },
  {
    question: 'How is my interview evaluated?',
    answer: 'After each interview, our AI analyzes your responses across multiple dimensions: technical accuracy, communication clarity, confidence, and problem-solving approach. You receive detailed feedback and improvement suggestions.',
  },
  {
    question: 'Can I retake an interview?',
    answer: 'Yes! You can take as many practice interviews as you like. Each interview is recorded separately, allowing you to track your improvement over time through the History page.',
  },
  {
    question: 'What if my camera or microphone doesn\'t work?',
    answer: 'First, ensure you\'ve granted browser permissions for camera and microphone access. Try refreshing the page or using a different browser. If issues persist, check your device settings or contact support.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we take security seriously. All data is encrypted, interviews are stored securely, and access is strictly controlled. University admins can only see data from students in their institution.',
  },
  {
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page, enter your registered email, and you\'ll receive a password reset link. Follow the link to set a new password.',
  },
];

const Help = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const systemStatus: SystemStatus[] = [
    { service: 'Interview Service', status: 'operational', icon: <Mic className="w-4 h-4" /> },
    { service: 'Video Streaming', status: 'operational', icon: <Video className="w-4 h-4" /> },
    { service: 'Resume Processing', status: 'operational', icon: <FileText className="w-4 h-4" /> },
    { service: 'Authentication', status: 'operational', icon: <Shield className="w-4 h-4" /> },
    { service: 'Database', status: 'operational', icon: <Server className="w-4 h-4" /> },
  ];

  const handleSendEmail = () => {
    const subjectLine = subject.trim() || '[InterviewSim] Support Request';
    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoLink;
    toast({
      title: 'Opening email client',
      description: 'Your default email app should open now.',
    });
  };

  const handleGmailCompose = () => {
    const subjectLine = subject.trim() || '[InterviewSim] Support Request';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(message)}`;
    window.open(gmailUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return (
          <Badge variant="default" className="bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Operational
          </Badge>
        );
      case 'degraded':
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Degraded
          </Badge>
        );
      case 'outage':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Outage
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">InterviewSim</span>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Help & Support
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How can we help you?
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions or reach out to our support team for assistance.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Message & FAQ */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Message Card */}
              <Card className="border-border/50 overflow-hidden">
                <div className="h-1.5 gradient-hero" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-accent" />
                    Send us a message
                  </CardTitle>
                  <CardDescription>
                    Write your message below and send it directly via email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="e.g. Issue with interview playback"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue or question..."
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="hero"
                      className="flex-1"
                      onClick={handleSendEmail}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send via Email App
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleGmailCompose}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Gmail
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Your message will be sent to the developers of <span className="font-medium text-foreground">AI Interview Simulator</span>
                  </p>
                </CardContent>
              </Card>

              {/* FAQ Section */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-accent" />
                    Frequently Asked Questions
                  </CardTitle>
                  <CardDescription>
                    Quick answers to common questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {FAQ_ITEMS.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left text-sm sm:text-base">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* System Status */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Server className="w-5 h-5 text-accent" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemStatus.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground">{item.icon}</div>
                          <span className="text-sm font-medium">{item.service}</span>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="w-5 h-5 text-accent" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-secondary/30 space-y-2">
                    <p className="text-sm font-medium text-foreground mb-2">Email Support</p>
                    {SUPPORT_EMAILS.map((email) => (
                      <a
                        key={email}
                        href={`mailto:${email}`}
                        className="block text-sm text-accent hover:underline break-all"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">
                        Within 24-48 hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/dashboard">
                    <Button variant="ghost" className="w-full justify-start">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link to="/interview">
                    <Button variant="ghost" className="w-full justify-start">
                      Start an Interview
                    </Button>
                  </Link>
                  <Link to="/resume">
                    <Button variant="ghost" className="w-full justify-start">
                      Upload Resume
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} InterviewSim AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Help;
