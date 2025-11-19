import { motion } from "motion/react";

export function ManifestoSection() {
  return (
    <section className="relative bg-white py-24 px-6 overflow-hidden">
      {/* Hand-drawn style decorative elements */}
      <svg
        className="absolute top-10 left-10 w-20 h-20 text-[#FF10F0] opacity-50"
        viewBox="0 0 100 100"
        fill="none"
      >
        <motion.path
          d="M10 50 Q 30 10, 50 50 T 90 50"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 2 }}
        />
      </svg>

      <svg
        className="absolute bottom-10 right-10 w-24 h-24 text-[#00FF41] opacity-50"
        viewBox="0 0 100 100"
        fill="none"
      >
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="4"
          initial={{ pathLength: 0, rotate: 0 }}
          whileInView={{ pathLength: 1, rotate: 360 }}
          transition={{ duration: 2 }}
        />
      </svg>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Title with strikethrough effect */}
          <div className="mb-12">
            <h2 className="text-6xl md:text-8xl font-black text-black relative inline-block">
              nonono
              <span className="text-[#FF10F0]">.online</span>
            </h2>
            <div className="mt-4 h-2 w-32 bg-[#00FF41] rotate-[-1deg]" />
          </div>

          {/* Manifesto text */}
          <div className="space-y-8">
            <motion.div
              className="bg-black text-white p-8 md:p-12 rotate-[1deg] border-4 border-[#00FF41]"
              whileHover={{ rotate: -1, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <p className="text-2xl md:text-4xl font-black leading-relaxed">
                鼓励独特、真实和自由的内容创作
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                { text: "拒绝套路", color: "#FF10F0" },
                { text: "表达真我", color: "#00FF41" },
                { text: "打破常规", color: "#FFFFFF" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="border-4 border-black p-6 bg-white relative"
                  style={{ rotate: index % 2 === 0 ? "2deg" : "-2deg" }}
                  whileHover={{
                    scale: 1.05,
                    rotate: 0,
                    backgroundColor: item.color,
                    borderColor: "#000",
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <p className="text-2xl font-black text-center">{item.text}</p>
                  
                  {/* Doodle corner */}
                  <div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-4 border-black"
                    style={{ backgroundColor: item.color }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
