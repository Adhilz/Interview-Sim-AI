import { motion } from "framer-motion";
import { 
  Brain, 
  Clock, 
  MessageSquare, 
  Shield,
  FileText,
  Target,
  Mic,
  BarChart3
} from "lucide-react";

const FeaturesSection = () => {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const howItWorks = [
    { step: "1", icon: FileText, title: "Upload resume", description: "We analyze your background to personalize questions" },
    { step: "2", icon: Target, title: "Choose mode", description: "Resume-based, Technical DSA, or HR Behavioral" },
    { step: "3", icon: Mic, title: "Live interview", description: "Voice conversation with adaptive AI interviewer" },
    { step: "4", icon: BarChart3, title: "Get scores", description: "Detailed feedback on communication and technical skills" },
  ];

  const features = [
    { icon: Brain, title: "Adaptive AI", description: "Questions adapt based on your resume and responses in real-time" },
    { icon: Mic, title: "Voice-Powered", description: "Natural conversation with AI that listens and responds" },
    { icon: Clock, title: "Timed pressure", description: "Build interview stamina with realistic time constraints" },
    { icon: BarChart3, title: "Instant Scoring", description: "Real-time evaluation across communication and technical skills" },
    { icon: MessageSquare, title: "Detailed Feedback", description: "Actionable insights to improve your interview performance" },
    { icon: Shield, title: "University verified", description: "Exclusive access with valid institutional codes" },
  ];

  return (
    <>
      {/* How It Works */}
      <section className="py-16 sm:py-24 px-3 sm:px-6 relative">
        <div className="container mx-auto max-w-5xl">
          <motion.div 
            className="text-center mb-10 sm:mb-16"
            {...fadeIn}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              How it works
            </h2>
            <p className="text-slate-400 text-base sm:text-lg px-4">
              Four steps to interview-ready confidence
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {howItWorks.map((item, index) => (
              <motion.div 
                key={index}
                className="group relative rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(13, 40, 71, 0.6) 0%, rgba(10, 22, 40, 0.8) 100%)",
                  border: "1px solid rgba(45, 212, 191, 0.1)",
                }}
                variants={fadeIn}
                whileHover={{ 
                  y: -5,
                  borderColor: "rgba(45, 212, 191, 0.3)",
                  boxShadow: "0 0 40px rgba(45, 212, 191, 0.1)",
                }}
              >
                <div 
                  className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                    boxShadow: "0 0 20px rgba(45, 212, 191, 0.4)",
                  }}
                >
                  {item.step}
                </div>
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, rgba(45, 212, 191, 0.15) 0%, rgba(45, 212, 191, 0.05) 100%)",
                    border: "1px solid rgba(45, 212, 191, 0.2)",
                  }}
                >
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed hidden sm:block">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-3 sm:px-6 relative">
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(45, 212, 191, 0.02) 50%, transparent 100%)",
          }}
        />
        <div className="container mx-auto max-w-5xl relative">
          <motion.div 
            className="text-center mb-10 sm:mb-16"
            {...fadeIn}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 px-4">
              Built for{" "}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">
                real results
              </span>
            </h2>
            <p className="text-slate-400 text-base sm:text-lg px-4">
              Everything you need to prepare effectively
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="group p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 relative"
                style={{
                  background: "linear-gradient(135deg, rgba(13, 40, 71, 0.6) 0%, rgba(10, 22, 40, 0.8) 100%)",
                  border: "1px solid rgba(45, 212, 191, 0.1)",
                }}
                variants={fadeIn}
                whileHover={{ 
                  scale: 1.02,
                  borderColor: "rgba(45, 212, 191, 0.3)",
                  boxShadow: "0 0 40px rgba(45, 212, 191, 0.1)",
                }}
              >
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(45, 212, 191, 0.05) 100%)",
                    border: "1px solid rgba(45, 212, 191, 0.2)",
                  }}
                >
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed hidden sm:block">{feature.description}</p>
                
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default FeaturesSection;
