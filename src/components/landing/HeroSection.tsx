import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";

interface HeroSectionProps {
  totalUsers: number;
  totalInterviews: number;
  successRate: number;
  formatNumber: (num: number) => string;
}

const HeroSection = ({ totalUsers, totalInterviews, successRate, formatNumber }: HeroSectionProps) => {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 relative">
      <div className="container mx-auto max-w-5xl text-center">
        {/* Badge */}
        <motion.div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <GraduationCap className="w-4 h-4" />
          University Edition
          <Sparkles className="w-3 h-3" />
        </motion.div>
        
        {/* Main heading with animated gradient */}
        <motion.h1 
          className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="text-foreground">Practice interviews</span>
          <br />
          <motion.span 
            className="bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] text-transparent bg-clip-text"
            animate={{ backgroundPosition: ["0%", "200%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          >
            with AI precision
          </motion.span>
        </motion.h1>
        
        <motion.p 
          className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Voice-powered mock interviews that adapt to your resume. 
          Get instant, actionable feedback to land your dream role.
        </motion.p>
        
        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/signup">
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-14 px-8 text-base group">
              Start practicing
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="h-14 px-8 text-base border-border/50 hover:bg-secondary">
              Sign in to dashboard
            </Button>
          </Link>
        </motion.div>

        {/* Live Stats with animation */}
        <motion.div 
          className="grid grid-cols-3 gap-8 mt-20 pt-10 border-t border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {[
            { value: formatNumber(totalUsers), label: "Students", icon: "👨‍🎓" },
            { value: formatNumber(totalInterviews), label: "Interviews", icon: "🎤" },
            { value: `${successRate}%`, label: "Success Rate", icon: "🎯" },
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <span>{stat.icon}</span>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;