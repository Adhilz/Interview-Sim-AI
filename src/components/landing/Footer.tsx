import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";

const Footer = () => {
  return (
    <footer 
      className="py-8 sm:py-12 px-3 sm:px-6 border-t"
      style={{
        borderColor: "rgba(45, 212, 191, 0.1)",
        background: "rgba(5, 13, 24, 0.5)",
      }}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(45, 212, 191, 0.05) 100%)",
                border: "1px solid rgba(45, 212, 191, 0.2)",
              }}
            >
              <Cpu className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-white font-semibold text-sm sm:text-base">
              Interview<span className="text-teal-400">Sim</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link to="/help" className="text-slate-400 hover:text-teal-400 text-xs sm:text-sm transition-colors">
              Help
            </Link>
            <Link to="/login" className="text-slate-400 hover:text-teal-400 text-xs sm:text-sm transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="text-slate-400 hover:text-teal-400 text-xs sm:text-sm transition-colors">
              Get Started
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-slate-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} InterviewSim AI
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
