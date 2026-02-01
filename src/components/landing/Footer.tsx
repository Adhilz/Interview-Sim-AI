import { Link } from "react-router-dom";
import { Brain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 px-4 sm:px-6 border-t border-border/50">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center">
              <Brain className="w-5 h-5 text-background" />
            </div>
            <span className="text-lg font-semibold text-foreground">InterviewSim</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/help" className="hover:text-foreground transition-colors">Help</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} InterviewSim
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;