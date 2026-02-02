import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Cpu, HelpCircle } from "lucide-react";

const Navbar = () => {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 py-3 sm:py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div 
        className="container mx-auto max-w-7xl rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2.5 sm:py-3"
        style={{
          background: "rgba(10, 22, 40, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(45, 212, 191, 0.1)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(45, 212, 191, 0.05) 100%)",
                border: "1px solid rgba(45, 212, 191, 0.3)",
              }}
            >
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
            </div>
            <span className="text-white font-semibold text-base sm:text-lg">
              Interview<span className="text-teal-400">Sim</span>
            </span>
          </Link>

          {/* Auth buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/help" className="hidden md:block">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                <HelpCircle className="w-4 h-4 mr-1.5" />
                Help
              </Button>
            </Link>
            <Link to="/login" className="hidden sm:block">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-full px-4 sm:px-6"
              >
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button 
                size="sm"
                className="rounded-full px-4 sm:px-6 text-xs sm:text-sm bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white border-0"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
