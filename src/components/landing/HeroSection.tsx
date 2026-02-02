import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import aiRobotHero from "@/assets/ai-robot-hero.png";

interface HeroSectionProps {
  totalUsers: number;
  totalInterviews: number;
  successRate: number;
  formatNumber: (num: number) => string;
}

const HeroSection = ({ totalUsers, totalInterviews, successRate, formatNumber }: HeroSectionProps) => {
  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 relative min-h-[90vh] flex items-center">
      <div className="container mx-auto max-w-7xl">
        {/* Main glassmorphic card */}
        <motion.div
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            background: "linear-gradient(135deg, rgba(13, 40, 71, 0.8) 0%, rgba(10, 22, 40, 0.9) 100%)",
            border: "1px solid rgba(45, 212, 191, 0.15)",
            boxShadow: "0 0 80px rgba(45, 212, 191, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Inner glow effects */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-teal-400/5 blur-[80px]" />
          
          <div className="relative grid lg:grid-cols-2 gap-8 p-8 sm:p-12 lg:p-16">
            {/* Left content */}
            <div className="flex flex-col justify-center z-10">
              {/* Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{
                  background: "linear-gradient(135deg, rgba(45, 212, 191, 0.15) 0%, rgba(45, 212, 191, 0.05) 100%)",
                  border: "1px solid rgba(45, 212, 191, 0.3)",
                }}
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span className="text-teal-300 text-sm font-medium">University Edition</span>
              </motion.div>
              
              {/* Main heading */}
              <motion.h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <span className="text-white">AI Interview</span>
                <br />
                <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 text-transparent bg-clip-text">
                  Simulator
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-base sm:text-lg text-slate-400 mb-10 max-w-md leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Voice-powered mock interviews that adapt to your resume. 
                Get instant, actionable feedback to land your dream role.
              </motion.p>
              
              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="h-14 px-8 text-base group rounded-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white border-0 shadow-lg shadow-teal-500/25"
                  >
                    Start Simulation
                    <Play className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" fill="currentColor" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-14 px-8 text-base rounded-full border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-500"
                  >
                    Sign in to dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right side - AI Robot */}
            <motion.div 
              className="relative flex items-center justify-center lg:justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              {/* Glowing ring around robot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-72 h-72 sm:w-96 sm:h-96 rounded-full"
                  style={{
                    background: "conic-gradient(from 0deg, transparent, rgba(45, 212, 191, 0.3), transparent, rgba(45, 212, 191, 0.2), transparent)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              {/* Robot image */}
              <motion.img
                src={aiRobotHero}
                alt="AI Interview Simulator"
                className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 object-contain drop-shadow-2xl"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  filter: "drop-shadow(0 0 40px rgba(45, 212, 191, 0.3))",
                }}
              />

              {/* Orbiting particles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-teal-400"
                  style={{
                    boxShadow: "0 0 10px rgba(45, 212, 191, 0.8)",
                  }}
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 6 + i * 2,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.5,
                  }}
                  initial={{
                    x: 120 + i * 30,
                    y: 0,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Bottom stats bar */}
          <motion.div 
            className="border-t border-slate-700/50 bg-slate-900/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="grid grid-cols-3 divide-x divide-slate-700/50">
              {[
                { value: formatNumber(totalUsers), label: "Students", icon: "👨‍🎓" },
                { value: formatNumber(totalInterviews), label: "Interviews", icon: "🎤" },
                { value: `${successRate}%`, label: "Success Rate", icon: "🎯" },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  className="text-center py-6 px-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                >
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400 flex items-center justify-center gap-1">
                    <span>{stat.icon}</span>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
