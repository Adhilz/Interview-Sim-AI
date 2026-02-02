import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";

const Footer = () => {
  return (
    <footer 
      className="py-12 px-4 sm:px-6 border-t"
      style={{
        borderColor: "rgba(45, 212, 191, 0.1)",
        background: "rgba(5, 13, 24, 0.5)",
      }}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(45, 212, 191, 0.05) 100%)",
                border: "1px solid rgba(45, 212, 191, 0.2)",
              }}
            >
              <Cpu className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-white font-semibold">
              Interview<span className="text-teal-400">Sim</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-8">
            <Link to="/help" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
              Help
            </Link>
            <Link to="/login" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
              Get Started
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} InterviewSim AI
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
