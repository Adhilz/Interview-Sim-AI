import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="relative rounded-3xl overflow-hidden p-8 sm:p-12 lg:p-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: "linear-gradient(135deg, rgba(45, 212, 191, 0.15) 0%, rgba(13, 40, 71, 0.9) 50%, rgba(10, 22, 40, 0.95) 100%)",
            border: "1px solid rgba(45, 212, 191, 0.2)",
            boxShadow: "0 0 100px rgba(45, 212, 191, 0.15)",
          }}
        >
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-teal-500/10 blur-[100px]" />
          
          {/* Animated background elements */}
          <motion.div
            className="absolute top-0 left-0 w-40 h-40 rounded-full bg-teal-500/20 blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-cyan-500/15 blur-3xl"
            animate={{
              x: [0, -40, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Content */}
          <div className="relative z-10">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                background: "linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(45, 212, 191, 0.05) 100%)",
                border: "1px solid rgba(45, 212, 191, 0.3)",
              }}
            >
              <Zap className="w-4 h-4 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">Join thousands of students</span>
            </motion.div>
            
            <motion.h2 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Ready to ace your next{" "}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">
                interview?
              </span>
            </motion.h2>

            <motion.p 
              className="text-slate-400 text-lg mb-10 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Join students who improved their interview performance and landed offers at top companies.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link to="/signup">
                <Button 
                  size="lg" 
                  className="h-14 px-10 text-base group rounded-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white border-0 shadow-lg shadow-teal-500/25"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
