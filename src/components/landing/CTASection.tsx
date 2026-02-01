import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
      <motion.div 
        className="container mx-auto max-w-3xl relative"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative text-center p-12 lg:p-16 rounded-3xl bg-foreground text-background overflow-hidden">
          {/* Animated background elements */}
          <motion.div
            className="absolute top-0 left-0 w-40 h-40 rounded-full bg-accent/20 blur-3xl"
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
            className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-primary/20 blur-3xl"
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
          
          <div className="relative z-10">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 text-background/80 text-sm font-medium mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Sparkles className="w-4 h-4" />
              Join thousands of students
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Ready to ace your interview?
            </h2>
            <p className="text-background/70 mb-8 max-w-lg mx-auto text-lg">
              Join students who improved their interview performance and landed offers at top companies.
            </p>
            <Link to="/signup">
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-14 px-8 text-base group">
                Get started free
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;