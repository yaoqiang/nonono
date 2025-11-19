import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative bg-white py-32 px-6 overflow-hidden">
      {/* Decorative elements */}
      <motion.div
        className="absolute top-20 left-20 w-40 h-40 bg-[#00FF41] rounded-full opacity-20"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="absolute bottom-20 right-20 w-60 h-60 bg-[#FF10F0] opacity-10"
        animate={{
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* Main CTA message */}
          <div className="mb-12">
            <motion.div
              className="inline-block mb-6"
              animate={{
                rotate: [-5, 5, -5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="w-16 h-16 text-[#FF10F0]" />
            </motion.div>

            <h2 className="text-5xl md:text-7xl font-black text-black mb-8 leading-tight">
              马上开始，
              <br />
              用<span className="text-[#00FF41]">特别</span>的方式
              <br />
              表达<span className="text-[#FF10F0]">真实</span>自我！
            </h2>

            <div className="flex flex-wrap justify-center gap-4 text-xl md:text-2xl font-black mb-12">
              {["#做自己", "#反套路", "#真实表达", "#特立独行"].map((tag, index) => (
                <motion.span
                  key={index}
                  className="bg-black text-white px-6 py-3 border-4 border-black"
                  style={{ rotate: index % 2 === 0 ? "2deg" : "-2deg" }}
                  whileHover={{
                    scale: 1.1,
                    rotate: 0,
                    backgroundColor: index % 2 === 0 ? "#00FF41" : "#FF10F0",
                    color: "#000",
                  }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <motion.button
              className="group relative bg-black text-white px-12 py-8 text-2xl font-black border-4 border-black overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{
                scale: 0.95,
                rotate: [0, -5, 5, -5, 5, 0],
              }}
              transition={{
                scale: { duration: 0.2 },
                rotate: { duration: 0.5 },
              }}
            >
              <motion.div
                className="absolute inset-0 bg-[#00FF41]"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10 flex items-center gap-3">
                开始创作
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </span>
            </motion.button>

            <motion.button
              className="group relative bg-white text-black px-12 py-8 text-2xl font-black border-4 border-black overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{
                scale: 0.95,
                rotate: [0, 5, -5, 5, -5, 0],
              }}
              transition={{
                scale: { duration: 0.2 },
                rotate: { duration: 0.5 },
              }}
            >
              <motion.div
                className="absolute inset-0 bg-[#FF10F0]"
                initial={{ x: "100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10">探索更多</span>
            </motion.button>
          </div>

          {/* Bottom tagline */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-2xl md:text-3xl font-black text-black">
              nonono.online — 
              <span className="text-[#FF10F0]"> 拒绝平庸</span>，
              <span className="text-[#00FF41]"> 拥抱独特</span>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Scattered decorative shapes */}
      <div className="absolute top-1/4 right-10 w-4 h-4 bg-[#00FF41] rotate-45" />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-[#FF10F0] rounded-full" />
      <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-black" />
    </section>
  );
}
