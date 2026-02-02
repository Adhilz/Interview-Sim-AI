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
    <section className="pt-28 sm:pt-32 pb-12 sm:pb-16 px-3 sm:px-6 relative min-h-[85vh] sm:min-h-[90vh] flex items-center">
      <div className="container mx-auto max-w-7xl">
        {/* Main glassmorphic card */}
        <motion.div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
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
          <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 rounded-full bg-teal-500/10 blur-[60px] sm:blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 rounded-full bg-teal-400/5 blur-[40px] sm:blur-[80px]" />
          
          <div className="relative grid lg:grid-cols-2 gap-6 sm:gap-8 p-5 sm:p-8 lg:p-16">
            {/* Left content */}
            <div className="flex flex-col justify-center z-10 order-2 lg:order-1 text-center lg:text-left">
              {/* Badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full w-fit mb-5 sm:mb-8 mx-auto lg:mx-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{
                  background: "linear-gradient(135deg, rgba(45, 212, 191, 0.15) 0%, rgba(45, 212, 191, 0.05) 100%)",
                  border: "1px solid rgba(45, 212, 191, 0.3)",
                }}
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-teal-400" />
                <span className="text-teal-300 text-xs sm:text-sm font-medium">University Edition</span>
              </motion.div>
              
              {/* Main heading */}
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-[1.1] tracking-tight"
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
                className="text-sm sm:text-base lg:text-lg text-slate-400 mb-6 sm:mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Voice-powered mock interviews that adapt to your resume. 
                Get instant, actionable feedback to land your dream role.
              </motion.p>
              
              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base group rounded-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white border-0 shadow-lg shadow-teal-500/25"
                  >
                    Start Simulation
                    <Play className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" fill="currentColor" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base rounded-full border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-500"
                  >
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right side - AI Robot */}
            <motion.div 
              className="relative flex items-center justify-center order-1 lg:order-2 py-4 sm:py-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              {/* Glowing ring around robot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 rounded-full"
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
                className="relative w-40 h-40 sm:w-64 sm:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
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

              {/* Orbiting particles - hide on mobile */}
              <div className="hidden sm:block">
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
                      x: 100 + i * 20,
                      y: 0,
                    }}
                  />
                ))}
              </div>
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
                { value: `${successRate}%`, label: "Success", icon: "🎯" },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  className="text-center py-4 sm:py-6 px-2 sm:px-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                >
                  <div className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-0.5 sm:mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-slate-400 flex items-center justify-center gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">{stat.icon}</span>
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
