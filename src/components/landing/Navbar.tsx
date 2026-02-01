import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, HelpCircle } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center">
            <Brain className="w-5 h-5 text-background" />
          </div>
          <span className="text-lg font-semibold text-foreground">InterviewSim</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/help" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4 mr-1.5" />
              Help
            </Button>
          </Link>
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;