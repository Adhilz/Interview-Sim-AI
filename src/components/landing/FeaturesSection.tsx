import { motion } from "framer-motion";
import { 
  Brain, 
  Sparkles, 
  Clock, 
  Video, 
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
    { icon: Sparkles, title: "Smart parsing", description: "AI extracts skills and projects for personalized interviewing" },
    { icon: Clock, title: "Timed pressure", description: "Build interview stamina with realistic time constraints" },
    { icon: Video, title: "Video practice", description: "Record yourself to review body language and expressions" },
    { icon: MessageSquare, title: "Voice feedback", description: "Natural conversation scoring for communication skills" },
    { icon: Shield, title: "University verified", description: "Exclusive access with valid institutional codes" },
  ];

  return (
    <>
      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-5xl">
          <motion.div 
            className="text-center mb-16"
            {...fadeIn}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg">
              Four steps to interview-ready confidence
            </p>
          </motion.div>

          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {howItWorks.map((item, index) => (
              <motion.div 
                key={index}
                className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
                variants={fadeIn}
                whileHover={{ y: -5 }}
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <item.icon className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 bg-muted/30 relative">
        <div className="container mx-auto max-w-5xl">
          <motion.div 
            className="text-center mb-16"
            {...fadeIn}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for real results
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to prepare effectively
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="group p-6 rounded-2xl border border-border/50 bg-card hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:border-accent/30"
                variants={fadeIn}
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default FeaturesSection;