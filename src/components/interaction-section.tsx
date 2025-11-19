import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";

export function InteractionSection() {
  return (
    <section className="py-24 px-4 bg-black relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            互动交流
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            评论功能维护中...
          </p>
        </motion.div>
      </div>
    </section>
  );
}
