import { motion } from "motion/react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 border-4 border-[#00FF41] rotate-12"
        animate={{
          rotate: [12, 22, 12],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-20 right-20 w-48 h-48 border-4 border-[#FF10F0]"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Scattered dots */}
      <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-[#00FF41] rounded-full" />
      <div className="absolute top-2/3 left-1/3 w-2 h-2 bg-[#FF10F0] rounded-full" />
      <div className="absolute bottom-1/4 left-1/4 w-4 h-4 bg-white rounded-full" />

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main headline */}
          <h1 className="text-white mb-6">
            <span className="block text-7xl md:text-9xl font-black tracking-tight">
              Say <span className="text-[#FF10F0]">NO</span>
            </span>
            <span className="block text-7xl md:text-9xl font-black tracking-tight mt-2">
              to <span className="text-[#00FF41]">Boring</span>
            </span>
          </h1>
          
          <motion.div
            className="inline-block bg-white text-black px-8 py-3 mt-4 rotate-[-2deg]"
            animate={{
              rotate: [-2, 2, -2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <p className="text-2xl md:text-4xl font-black">
              拒绝千篇一律！
            </p>
          </motion.div>
        </motion.div>

        {/* Animated arrow */}
        <motion.div
          className="mt-16"
          animate={{
            y: [0, 20, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto text-[#00FF41]"
          >
            <path
              d="M12 5V19M12 19L5 12M12 19L19 12"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
