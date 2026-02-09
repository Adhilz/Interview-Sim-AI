import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  FileText, 
  Mic, 
  History, 
  User as UserIcon, 
  LogOut, 
  TrendingUp,
  HelpCircle,
  Calculator,
  Menu,
  X
} from "lucide-react";

interface StudentSidebarProps {
  onLogout: () => void;
}

const navItems = [
  { to: "/dashboard", icon: TrendingUp, label: "Dashboard" },
  { to: "/interview", icon: Mic, label: "New Interview" },
  { to: "/resume", icon: FileText, label: "Resume" },
  { to: "/history", icon: History, label: "History" },
  { to: "/aptitude", icon: Calculator, label: "Aptitude Test" },
  { to: "/profile", icon: UserIcon, label: "Profile" },
  { to: "/help", icon: HelpCircle, label: "Help" },
];

const StudentSidebar = ({ onLogout }: StudentSidebarProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const renderNavLinks = (onClickExtra?: () => void) => (
    <nav className="flex-1 space-y-2">
      {navItems.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive(to)
              ? "bg-accent/10 text-accent font-medium"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          onClick={onClickExtra}
        >
          <Icon className="w-5 h-5" />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">InterviewSim</span>
        </Link>

        {renderNavLinks()}

        <Button variant="ghost" onClick={onLogout} className="justify-start gap-3 text-muted-foreground hover:text-destructive">
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
          {renderNavLinks(() => setMobileMenuOpen(false))}
          <Button variant="ghost" onClick={onLogout} className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive mt-2">
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      )}
    </>
  );
};

export default StudentSidebar;
